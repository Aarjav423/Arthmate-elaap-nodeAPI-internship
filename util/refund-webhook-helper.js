const { check } = require('express-validator');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');
const WebhookNotifySchema = require('../models/webhook-notify-schema.js');
const BorrowerinfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const repaymentInstallmentsSchema = require('../models/repayment-installment-schema');
const coLenderRepaymentScheduleSchema = require('../models/co-lender-repayment-schedule-schema');
const DisbursementChannelConfigSchema = require('../models/disbursement-channel-config-schema.js');
const s3helper = require('./s3helper.js');
const moment = require('moment');
const colendRepaymentTransactionledger = require('../utils/colendHelper.js');
const RepaymentScheduleDumpSchema = require('../models/repayment-schedule-dump-schema');
const RepaymentInstallment = require('../models/repayment-installment-schema');
const LocBatchDrawdownDataSchema = require('../models/loc-batch-drawdown-schema');
const borrowerHelper = require('./borrower-helper.js');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const PayoutDetails = require('../models/payout-detail-schema.js');
const { revertExcessAmount } = require('./excess-refund-helper.js');


// Function to update webhook_status in disbursements_and_topup schema
const updateWebhookStatus = async (req, data, txn_id, productResp) => {
  try {
    let updateWebhookStatusResp;
    // Get currently existing status code from disbursements_and_topup schema
    const disbursementRecords = await DisbursementAndTopupSchema.findByTxnId(txn_id);
    const existingWebhookStatusCode = disbursementRecords.webhook_status_code || 0;
    if (existingWebhookStatusCode == undefined || Number(existingWebhookStatusCode) < Number(data.disbursement_status_code)) {
      // Update the webhook_status in disbursement and topups schema only in forward fashion
      let successStatus = data.disbursement_status_code.indexOf('1');
      const updateWebhookStatusData = {
        webhook_status_code: data.disbursement_status_code,
        webhook_status: data.disbursement_status,
        utrn_number: data.utrn_number,
        txn_stage: data.disbursement_status_code.indexOf('3') > -1 ? '1' : data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1 ? '2' : '',
        bank_remark: data.bank_remark ? data.bank_remark : null,
        disbursement_date_time: data.txn_date,
      };
      await PayoutDetails.updateData(data.txn_id, { ...updateWebhookStatusData, status: data.disbursement_status_code.indexOf('3') > -1 ? 'Processed' : 'Failed' });
      //Update the data against txn_id in disbursement_and_topup collection.
      updateWebhookStatusResp = await DisbursementAndTopupSchema.updateData(data.txn_id, updateWebhookStatusData);
 
      // Make entry in loan transactions table if success from the bank api
      if (data.disbursement_status_code.indexOf('3') > -1 || data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1) {
        const loanTransactionRecord = await recordLoanTransaction(data, updateWebhookStatusResp, productResp, disbursementRecords);
      }
      // update data in borrower info common according to webhook status
      const updateLoanStatusResp = await borrowerInfoUpdate(data, disbursementRecords);
 
      //Const update loan transaction ledger according to webhook data
      if (data.disbursement_status_code.indexOf('3') > -1) {
        const updateDisbChannelBalance = await compositeHelper.updateDisbChannelAvailableBalance(updateWebhookStatusResp);
      }
      return { success: true };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

const updateWebhookStatusForExcessRefund = async (req, data, txn_id, productResp) => {
  try {
  
    let updateWebhookStatusResp;
    // Get currently existing status code from disbursements_and_topup schema
    const disbursementRecords = req.disbursementRecord;
    const existingWebhookStatusCode = disbursementRecords.webhook_status_code || 0;
    if (existingWebhookStatusCode == undefined || Number(existingWebhookStatusCode) <= Number(data.disbursement_status_code)) {
      // Update the webhook_status in disbursement and topups schema only in forward fashion
      let successStatus = data.disbursement_status_code.indexOf('1');
      const updateWebhookStatusData = {
        webhook_status_code: data.disbursement_status_code,
        webhook_status: data.disbursement_status,
        utrn_number: data.utrn_number,
        txn_stage: data.disbursement_status_code.indexOf('3') > -1 ? '1' : data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1 ? '2' : '',
        bank_remark: data.bank_remark ? data.bank_remark : null,
        disbursement_date_time: data.txn_date
      };
      console.log({txn_id:data.txn_id,loan_id:disbursementRecords.loan_id,type:"excess_refund"},data.disbursement_status_code.indexOf('3') > -1 )

      //Update the data against txn_id in disbursement_and_topup collection.
      updateWebhookStatusResp = await PayoutDetails.updateDataOnCondition({txn_id:data.txn_id,loan_id:disbursementRecords.loan_id,type:"excess_refund"}, {...updateWebhookStatusData,status: data.disbursement_status_code.indexOf('3') > -1 ? 'Processed' : 'Failed' });

      // Make entry in loan transactions table if success from the bank api
      if (data.disbursement_status_code.indexOf('3') > -1 || data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1) {
        const loanTransactionRecord = await recordLoanTransactionForExcess({...data,...updateWebhookStatusData},disbursementRecords);
      } 
      if(data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1)
      {
        //revert failed transaction here
        await revertExcessAmount(disbursementRecords.payment_details,disbursementRecords.loan_id)
      }
      return { success: true };
    } else {
      //Also revert date here
      updateWebhookStatusResp = await PayoutDetails.updateData(data.txn_id, { status: 'Failed' });
    }
    return { success: true };
  } catch (error) {
    console.log(error)
    return { success: false, error };
  }
};

// Record data in loan transaction table
const recordLoanTransaction = async (webhookReq, data, productResp, disbursementRecords) => {
  // Prepare data to add in loan trnsaction ledger.
  let disbursementTransactionData = {
    company_id: data.company_id,
    product_id: data.product_id,
    company_name: data.company_name,
    product_name: data.produc_name,
    loan_id: data.loan_id,
    borrower_id: data.borrower_id,
    partner_loan_id: data.partner_loan_id,
    partner_borrower_id: data.partner_borrower_id,
    disbursement_status: data.webhook_status,
    utr_number: data.utrn_number,
    txn_date: moment(data.txn_date).format('YYYY-MM-DD'),
    txn_amount: data.amount,
    txn_id: data.txn_id,
    txn_entry: 'dr',
    label: 'disbursement',
    record_method: data.disbursement_channel,
    webhook_status_code: data.webhook_status_code,
    txn_stage: data.txn_stage,
    bank_remark: data.bank_remark,
    disbursement_date_time: data.disbursement_date_time,
    label_type: disbursementRecords.label_type,
    initiated_at: moment(disbursementRecords.created_at).format('YYYY-MM-DD HH:mm:ss') || '',
  };
  if (data?.label === 'Refund') {
    let refundStatus;
    if (data?.webhook_status_code.indexOf('3') > -1) {
      refundStatus = 'Processed';
    } else if (data?.webhook_status_code.indexOf('4') > -1 || data?.webhook_status_code.indexOf('5') > -1) {
      refundStatus = 'Failed';
    }
    disbursementTransactionData.refund_amount = data?.amount;
    disbursementTransactionData.refund_request_date_time = moment(data.txn_date).format('YYYY-MM-DD');
    disbursementTransactionData.int_refund_date_time = data.disbursement_date_time;
    disbursementTransactionData.label = 'Refund';
    disbursementTransactionData.utr_number_refund = data.utrn_number;
    disbursementTransactionData.borro_bank_name = data?.bank_name;
    disbursementTransactionData.borro_bank_acc_number = data?.bank_account_no;
    disbursementTransactionData.borro_bank_ifsc = data?.bank_ifsc_code;
    disbursementTransactionData.refund_status = refundStatus;
  }
  // Record data in loan transaction ledger
  const recordDisbursementTxn = await LoanTransactionSchema.addNew(disbursementTransactionData);
  return true;
};

const recordLoanTransactionForExcess = async ( data, disbursementRecords) => {
  // Prepare data to add in loan trnsaction ledger.
  let disbursementTransactionData = {
    company_id: disbursementRecords.company_id,
    product_id: disbursementRecords.product_id,
    loan_id: disbursementRecords.loan_id,
    borrower_id: disbursementRecords.borrower_id,
    partner_loan_id: disbursementRecords.partner_loan_id,
    partner_borrower_id: disbursementRecords.partner_borrower_id,
    disbursement_status: data.webhook_status,
    utr_number: data.utrn_number,
    txn_date: moment(data.txn_date).format('YYYY-MM-DD'),
    txn_amount: disbursementRecords.amount,
    txn_id: data.txn_id,
    txn_entry: 'dr',
    label: 'disbursement',
    record_method: disbursementRecords.disbursement_channel,
    webhook_status_code: data.webhook_status_code,
    txn_stage: data.txn_stage,
    bank_remark: data.bank_remark,
    disbursement_date_time: data.disbursement_date_time,
    label_type: disbursementRecords.type,
    initiated_at: moment(disbursementRecords.created_at).format('YYYY-MM-DD HH:mm:ss') || '',
  };
    // if (data?.label === 'Refund') {
    //   let refundStatus;
    //   if (data?.webhook_status_code.indexOf('3') > -1) {
    //     refundStatus = 'Processed';
    //   } else if (data?.webhook_status_code.indexOf('4') > -1 || data?.webhook_status_code.indexOf('5') > -1) {
    //     refundStatus = 'Failed';
    //   }
    //   disbursementTransactionData.refund_amount = data?.amount;
    //   disbursementTransactionData.refund_request_date_time = moment(data.txn_date).format('YYYY-MM-DD');
    //   disbursementTransactionData.int_refund_date_time = data.disbursement_date_time;
    //   disbursementTransactionData.label = 'Refund';
    //   disbursementTransactionData.utr_number_refund = data.utrn_number;
    //   disbursementTransactionData.borro_bank_name = data?.bank_name;
    //   disbursementTransactionData.borro_bank_acc_number = data?.bank_account_no;
    //   disbursementTransactionData.borro_bank_ifsc = data?.bank_ifsc_code;
    //   disbursementTransactionData.refund_status = refundStatus;
    // }
  // Record data in loan transaction ledger
  const recordDisbursementTxn = await LoanTransactionSchema.addNew(disbursementTransactionData);
  return true;
};
// Function to update loan status
const borrowerInfoUpdate = async (data, disbursementRecord) => {
  try {
    let updateStatusData = {};
    //fetch already existing loan status
    const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(disbursementRecord.loan_id);
    //On completion of refund update the data in borrowerinfo common
    if (data.disbursement_status_code.indexOf('3') > -1) {
      if (disbursementRecord?.label === 'Refund') {
        updateStatusData.int_refund_status = 'Processed';
        updateStatusData.int_refund_date_time = data?.txn_date;
      }
    } else if (data.disbursement_status_code.indexOf('4') > -1 || data.disbursement_status_code.indexOf('5') > -1) {
      if (disbursementRecord?.label === 'Refund') {
        updateStatusData.int_refund_status = 'Failed';
        updateStatusData.int_refund_date_time = data?.txn_date;
        delete updateStatusData.status;
        delete updateStatusData.stage;
      }
    }
    // Update loan status according to webhook response
    const updateLoanStatus = await BorrowerinfoCommonSchema.updateLoanStatus(updateStatusData, disbursementRecord.loan_id);
  } catch (error) {
    return error;
  }
};

module.exports = {
  updateWebhookStatus,
  recordLoanTransaction,
  borrowerInfoUpdate,
  updateWebhookStatusForExcessRefund,
};

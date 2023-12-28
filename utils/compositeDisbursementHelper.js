const { check } = require('express-validator');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');
const CashCollateralsSchema = require('../models/cash-collaterals-schema');
const WebhookNotifySchema = require('../models/webhook-notify-schema.js');
const BorrowerinfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const repaymentInstallmentsSchema = require('../models/repayment-installment-schema');
const coLenderRepaymentScheduleSchema = require('../models/co-lender-repayment-schedule-schema');
const DisbursementChannelConfigSchema = require('../models/disbursement-channel-config-schema.js');
const s3helper = require('../util/s3helper.js');
const moment = require('moment');
const colendRepaymentTransactionledger = require('../utils/colendHelper.js');
const RepaymentScheduleDumpSchema = require('../models/repayment-schedule-dump-schema');
const RepaymentInstallment = require('../models/repayment-installment-schema');
const LocBatchDrawdownDataSchema = require('../models/loc-batch-drawdown-schema');
const ColenderCommonDetailsSchema = require('../models/co-lender-common-details-schema');
const borrowerHelper = require('../util/borrower-helper.js');

// Validate webhook payload
const validateWebhookPayload = [
  check('disbursement_status')
    .notEmpty()
    .withMessage('disbursement_status is required'),
  check('disbursement_status_code')
    .notEmpty()
    .withMessage('disbursement_status_code is required'),
  check('txn_id').notEmpty().withMessage('txn_id is required'),
  check('txn_date')
    .notEmpty()
    .withMessage('txn_date is required')
    .matches(
      /^([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]:[0-5][0-9])/,
    )
    .withMessage('Please enter valid txn_date in YYYY-MM-DD HH:MM:SS format'),
];

// Function to update webhook_status in disbursements_and_topup schema
const updateWebhookStatus = async (req, data, txn_id, productResp) => {
  try {
    let updateWebhookStatusResp;
    let isrunnable = true;
    // Get currently existing status code from disbursements_and_topup schema
    const disbursementRecords =
      await DisbursementAndTopupSchema.findByTxnId(txn_id);

    const existingWebhookStatusCode =
      disbursementRecords.webhook_status_code || 0;
    if (
      existingWebhookStatusCode == undefined ||
      Number(existingWebhookStatusCode) < Number(data.disbursement_status_code)
    ) {
      // Update the webhook_status in disbursement and topups schema only in forward fashion
      let successStatus = data.disbursement_status_code.indexOf('1');

      const updateWebhookStatusData = {
        webhook_status_code: data.disbursement_status_code,
        webhook_status: data.disbursement_status,
        utrn_number: data.utrn_number,
        txn_stage:
          data.disbursement_status_code.indexOf('3') > -1
            ? '1'
            : data.disbursement_status_code.indexOf('4') > -1 ||
              data.disbursement_status_code.indexOf('5') > -1
            ? '2'
            : '',
        bank_remark: data.bank_remark ? data.bank_remark : null,
        disbursement_date_time: data.txn_date,
      };
      updateWebhookStatusResp = await DisbursementAndTopupSchema.updateData(
        data.txn_id,
        updateWebhookStatusData,
      );
      // Change for LOC product

      if (!data.product.allow_loc) {
        // Make entry in loan transactions table if success from the bank api
        if (
          data.disbursement_status_code.indexOf('3') > -1 ||
          data.disbursement_status_code.indexOf('4') > -1 ||
          data.disbursement_status_code.indexOf('5') > -1
        ) {
          const loanTransactionRecord = await recordLoanTransaction(
            data,
            updateWebhookStatusResp,
            productResp,
            req.disbursementRecord,
          );

          if (disbursementRecords.label_type == 'cashcollateral') {
            isrunnable = false;
            //update cashCollateral collection to N
            await CashCollateralsSchema.updateCashCollateral(
              { loan_id: disbursementRecords.loan_id },
              {
                is_processed:
                  data.disbursement_status_code.indexOf('3') > -1 ? 'Y' : 'N',
                disbursement_status:
                  data.disbursement_status_code.indexOf('3') > -1
                    ? 'Disbured'
                    : 'Failure',
                is_withheld_amount_disbursed:
                  data.disbursement_status_code.indexOf('3') > -1 ? 1 : 0,
                disbursement_status_code: data.disbursement_status_code,
              },
            );
          }
        }
      } else if (
        data.product.cash_collateral &&
        disbursementRecords.label_type == 'cashcollateral'
      ) {
        //record Transaction
        if (
          data.disbursement_status_code.indexOf('3') > -1 ||
          data.disbursement_status_code.indexOf('4') > -1 ||
          data.disbursement_status_code.indexOf('5') > -1
        ) {
          const loanTransactionRecord = await recordLoanTransactionForCashCollateral(
            data,
            updateWebhookStatusResp,
            req.disbursementRecord,
          );
          isrunnable = false;
          //update cashCollateral collection to N
          await CashCollateralsSchema.updateCashCollateral(
            { loan_id: disbursementRecords.loan_id ,
              loc_drawdown_request_id:
              disbursementRecords?.disburse_for_loc_request_id},
            {
              is_processed:
                data.disbursement_status_code.indexOf('3') > -1 ? 'Y' : 'N',
              disbursement_status:
                data.disbursement_status_code.indexOf('3') > -1
                  ? 'Disbured'
                  : 'Failure',
              is_withheld_amount_disbursed:
                data.disbursement_status_code.indexOf('3') > -1 ? 1 : 0,
              disbursement_status_code: data.disbursement_status_code,
            },
          );
        }
      }
      // update loan status according to webhook status
      if (isrunnable) {
        const updateLoanStatusResp = await loanStatusUpdate(
          data,
          disbursementRecords,
        );
      }

      //Const update loan transaction ledger according to webhook data
      if (data.disbursement_status_code.indexOf('3') > -1) {
        //For loc product store repayment_due_date on the basis of repayment_days.
        let repaymentDueDate;
        if (data.product.allow_loc === 1 && !data.force_usage_convert_to_emi) {
          const repaymentDays = req.disbursementRecord.repayment_days
            ? req.disbursementRecord.repayment_days
            : 0;
          repaymentDueDate = moment(
            updateWebhookStatusResp?.disbursement_date_time,
          )
            .add(repaymentDays, 'd')
            .format('YYYY-MM-DD');
        }
        const updateLoanTransaction = await LoanTransactionSchema.updateByTxnId(
          txn_id,
          {
            bank_remark: data.bank_remark,
            disbursement_date_time:
              updateWebhookStatusResp.disbursement_date_time,
            webhook_status_code: updateWebhookStatusResp.webhook_status_code,
            disbursement_status: updateWebhookStatusResp.webhook_status,
            utr_number: updateWebhookStatusResp.utrn_number,
            repayment_due_date:
              data?.product?.allow_loc &&
              !data?.product?.force_usage_convert_to_emi
                ? repaymentDueDate
                : null,
            disb_stage:
              data.disbursement_status_code.indexOf('3') > -1
                ? '1'
                : data.disbursement_status_code.indexOf('4') > -1 ||
                  data.disbursement_status_code.indexOf('5') > -1
                ? '2'
                : '',
          },
        );

        const updateDisbChannelBalance =
          await updateDisbChannelAvailableBalance(updateWebhookStatusResp);

        // Update repayment Schedule with disbursement date
        await updateAllCoLendRepaymentSchedule(
          productResp,
          updateWebhookStatusResp,
        );
      }
      return { success: true };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

// Function to update loan status
const loanStatusUpdate = async (data, disbursementRecord) => {
  try {
    let updateStatusData = {};
    //fetch already existing loan status
    const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(
      disbursementRecord.loan_id,
    );
    const existingloanStatus = loanData.status;
        //On completion of disbursement update the loan status to disbursed
    if (!data.product.allow_loc) {
      if (data.disbursement_status_code.indexOf('3') > -1) {
        const firstInstallmentDate = moment(data.txn_date)
          .add(1, 'd')
          .format('YYYY-MM-DD');
        updateStatusData.status = 'disbursed';
        updateStatusData.stage = '4';
        updateStatusData.disbursement_date_time = data.txn_date;
        if (loanData?.repayment_type.toLowerCase() === 'daily') {
          updateStatusData.first_inst_date = firstInstallmentDate;
          // fetch records from repayment schedule dump against loan id
          const repaymentScheduleDump =
            await RepaymentScheduleDumpSchema.findOneByLoanId(
              loanData?.loan_id,
            );

          // fetch records from repayment installments against loan id and repay_schedule_id
          const repaymentInstallments =
            await RepaymentInstallment.findByLidAndRepayScheduleId(
              loanData?.loan_id,
              repaymentScheduleDump._id,
            );

          const repaymentInstallmentsJson = JSON.parse(
            JSON.stringify(repaymentInstallments),
          );
          let updateRow = {};
          for (const row of Array.from(repaymentInstallmentsJson)) {
            updateRow = row;
            updateRow.due_date = moment(
              moment(data.txn_date).add(Number(row.emi_no), 'd'),
            ).format('YYYY-MM-DD');
            const updatedResult =
              await RepaymentInstallment.findOneAndUpdateByData(updateRow);
          }
        }
        if (disbursementRecord?.label === 'Interest Refund') {
          updateStatusData.int_refund_status = 'Processed';
          updateStatusData.int_refund_date_time = data?.txn_date;
        }
      } else if (
        data.disbursement_status_code.indexOf('4') > -1 ||
        data.disbursement_status_code.indexOf('5') > -1
      ) {
        updateStatusData.status = 'disbursal_approved';
        updateStatusData.stage = '3';
        if (disbursementRecord?.label === 'Interest Refund') {
          updateStatusData.int_refund_status = 'Failed';
          updateStatusData.int_refund_date_time = data?.txn_date;
          delete updateStatusData.status;
          delete updateStatusData.stage;
        }
      }
    } else {
      if (data.disbursement_status_code.indexOf('3') > -1) {
        updateStatusData.status = 'line_in_use';
        updateStatusData.stage = '7';
        // update in loc_batch_drawdown schema by txn_id and loan_id
        const updatePayload = {
          status: 1,
          utrn_number: data?.utrn_number,
          disbursement_status_code: data.disbursement_status_code,
          disbursement_date_time: data?.txn_date,
          remarks: data?.bank_remark,
        };
        const locBatchData = await LocBatchDrawdownDataSchema.updateByLid(
          { txn_id: data?.txn_id, loan_id: disbursementRecord.loan_id },
          updatePayload,
        );
      } else if (
        data.disbursement_status_code.indexOf('4') > -1 ||
        data.disbursement_status_code.indexOf('5') > -1
      ) {
        if(existingloanStatus !== "line_in_use"){
        updateStatusData.status = 'active';
        updateStatusData.stage = '4';
        }
        // update in loc_batch_drawdown schema by txn_id and loan_id
        const updatePayload = {
          status: 9,
          utrn_number: data?.utrn_number,
          disbursement_status_code: data.disbursement_status_code,
          disbursement_date_time: data?.txn_date,
          remarks: data?.bank_remark,
        };
        const locBatchData = await LocBatchDrawdownDataSchema.updateByLid(
          { txn_id: data?.txn_id, loan_id: disbursementRecord.loan_id },
          updatePayload,
        );
      }
    }
    // Update loan status according to webhook response
    const updateLoanStatus = await BorrowerinfoCommonSchema.updateLoanStatus(
      updateStatusData,
      disbursementRecord.loan_id,
    );
    //Record loan status change logs
    const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
      '',
      disbursementRecord.loan_id,
      loanData.status,
      updateStatusData.status,
      'system',
    );
  } catch (error) {
    return error;
  }
};

const uploadWebhookDataToS3 = async (dataParams) => {
  try {
    const { company_id, product_id, txnId, webhookData, eventKey } = dataParams;
    //upload request data to s3 and store it in webhook_notify_calls table
    let filename = Math.floor(10000 + Math.random() * 99999) + '_client_req';
    const reqKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${txnId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookRequest = await s3helper.uploadFileToS3(
      webhookData,
      reqKey,
    );
    if (!uploadWebhookRequest)
      throw { success: false, message: 'Error uploading data to s3' };
    // Record request upload s3 url in webhook notify schema
    if (uploadWebhookRequest) {
      const recordWebhookReqURL =
        await WebhookNotifySchema.recordWebhookRequestData({
          company_id,
          product_id,
          transaction_id: txnId,
          req_s3_url: uploadWebhookRequest.Location,
          webhook_status_code: webhookData.disbursement_status_code,
          event_key: eventKey,
          client_end_point: '',
        });
      return recordWebhookReqURL;
    }
  } catch (error) {
    return error;
  }
};

const uploadColenderWebhookDataToS3 = async (dataParams) => {
  try {
    const {
      company_id,
      product_id,
      co_lender_id,
      txnId,
      webhookData,
      eventKey,
    } = dataParams;
    //upload request data to s3 and store it in webhook_notify_calls table
    let filename = Math.floor(10000 + Math.random() * 99999) + '_client_req';
    const reqKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${co_lender_id}/${txnId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookRequest = await s3helper.uploadFileToS3(
      webhookData,
      reqKey,
    );
    if (!uploadWebhookRequest)
      throw { success: false, message: 'Error uploading data to s3' };

    // Record request upload s3 url in webhook notify schema
    if (uploadWebhookRequest) {
      const recordWebhookReqURL =
        await WebhookNotifySchema.recordWebhookRequestData({
          company_id,
          product_id,
          transaction_id: txnId,
          req_s3_url: uploadWebhookRequest.Location,
          webhook_status_code: webhookData.disbursement_status_code,
          event_key: eventKey,
          client_end_point: '',
        });
      return recordWebhookReqURL;
    }
  } catch (error) {
    return error;
  }
};

const uploadColenderResponseToS3 = async (dataParams) => {
  try {
    const {
      company_id,
      product_id,
      co_lender_id,
      txnId,
      responseData,
      webhookData,
    } = dataParams;
    //upload request data to s3 and store it in webhook_notify_calls table
    let filename = Math.floor(10000 + Math.random() * 99999) + '_client_res';
    const resKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${co_lender_id}/${txnId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookResponse = await s3helper.uploadFileToS3(
      webhookData,
      resKey,
    );
    if (!uploadWebhookResponse)
      throw {
        success: false,
        message: 'Error while uploading partner webhook response to s3.',
      };
    // Record response upload s3 url in webhook_notify_calls table
    if (uploadWebhookResponse) {
      webhookData.res_s3_url = uploadWebhookResponse.Location;
      webhookData.client_response_code = responseData.status_code;
      const recordClientResponseData =
        await WebhookNotifySchema.recordClientResponseData(webhookData);
      return recordClientResponseData;
    }
  } catch (error) {
    return error;
  }
};

const uploadPartnerResponseToS3 = async (dataParams) => {
  try {
    const { company_id, product_id, txnId, responseData, webhookData } =
      dataParams;
    //upload response data to s3 .
    filename = Math.floor(10000 + Math.random() * 99999) + '_client_res';
    const resKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${txnId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookResponse = await s3helper.uploadFileToS3(
      responseData,
      resKey,
    );
    if (!uploadWebhookResponse)
      throw {
        success: false,
        message: 'Error while uploading partner webhook response to s3.',
      };
    // Record response upload s3 url in webhook_notify_calls table
    if (uploadWebhookResponse) {
      webhookData.res_s3_url = uploadWebhookResponse.Location;
      webhookData.client_response_code = responseData.status_code;
      const recordClientResponseData =
        await WebhookNotifySchema.recordClientResponseData(webhookData);
      return recordClientResponseData;
    }
  } catch (error) {
    return error;
  }
};

// Record data in loan transaction table
const recordLoanTransaction = async (
  webhookReq,
  data,
  productResp,
  disbursementRecord,
) => {
  try {
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
      label_type: disbursementRecord?.label_type,
    };
    if (data?.label === 'Refund') {
      let refundStatus;
      if (data?.webhook_status_code.indexOf('3') > -1) {
        refundStatus = 'Processed';
      } else if (
        data?.webhook_status_code.indexOf('4') > -1 ||
        data?.webhook_status_code.indexOf('5') > -1
      ) {
        refundStatus = 'Failed';
      }
      disbursementTransactionData.refund_amount = data?.amount;
      disbursementTransactionData.refund_request_date_time = moment(
        data.txn_date,
      ).format('YYYY-MM-DD');
      disbursementTransactionData.int_refund_date_time =
        data.disbursement_date_time;
      disbursementTransactionData.label = 'Refund';
      disbursementTransactionData.utr_number_refund = data.utrn_number;
      disbursementTransactionData.borro_bank_name = data?.bank_name;
      disbursementTransactionData.borro_bank_acc_number = data?.bank_account_no;
      disbursementTransactionData.borro_bank_ifsc = data?.bank_ifsc_code;
      disbursementTransactionData.refund_status = refundStatus;
    }

    // Record data in loan transaction ledger
    const recordDisbursementTxn = await LoanTransactionSchema.addNew(
      disbursementTransactionData,
    );
    //For Colender Enabled Product
    const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(
      data.loan_id,
    );
    if (
      productResp?.is_lender_selector_flag === 'Y' &&
      loanData?.co_lend_flag === 'Y'
    ) {
      const utrNumber = (
        await ColenderCommonDetailsSchema.findByLoanID(data.loan_id)
      ).co_lender_utr_number;
      if (utrNumber) {
        data.utrn_number = utrNumber;
      }
      colendRepaymentTransactionledger.createDisbursementTransaction(
        data,
        webhookReq,
      );
    }
    return true;
  } catch (error) {
    return false;
  }
};

const recordLoanTransactionForCashCollateral = async (
  webhookReq,
  data,
  disbursementRecord,
) => {
  try {
    // Prepare data to add in loan trnsaction ledger.

    let disbursementTransactionData = {
      company_id: data.company_id,
      product_id: data.product_id,
      company_name: data.company_name,
      product_name: data.product_name,
      loan_id: data.loan_id,
      borrower_id: data.borrower_id,
      partner_loan_id: data.partner_loan_id,
      partner_borrower_id: data.partner_borrower_id,
      disbursement_status: data.webhook_status,
      utr_number: data.utrn_number,
      txn_date: moment(data.txn_date).format('YYYY-MM-DD'),
      txn_amount: data.amount,
      final_disburse_amt:data.amount,
      txn_id: data.txn_id,
      txn_entry: 'dr',
      label: 'disbursement',
      record_method: data.disbursement_channel,
      webhook_status_code: data.webhook_status_code,
      txn_stage: data.txn_stage,
      bank_remark: data.bank_remark,
      disbursement_date_time: data.disbursement_date_time,
      label_type: disbursementRecord?.label_type,
      disburse_for_loc_request_id: disbursementRecord?.disburse_for_loc_request_id,
      disburse_for_loc_usage_id:disbursementRecord?.disburse_for_loc_usage_id,
    };
   

    // Record data in loan transaction ledger
    const recordDisbursementTxn = await LoanTransactionSchema.addNew(
      disbursementTransactionData,
    );
    //For Colender Enabled Product
    const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(
      data.loan_id,
    );
    if (
      productResp?.is_lender_selector_flag === 'Y' &&
      loanData?.co_lend_flag === 'Y'
    ) {
      const utrNumber = (
        await ColenderCommonDetailsSchema.findByLoanID(data.loan_id)
      ).co_lender_utr_number;
      if (utrNumber) {
        data.utrn_number = utrNumber;
      }
      colendRepaymentTransactionledger.createDisbursementTransaction(
        data,
        webhookReq,
      );
    }
    return true;
  } catch (error) {
    return false;
  }
};

//Calculate and update disbursement channel available balance
const updateDisbChannelAvailableBalance = async (updateWebhookStatusResp) => {
  try {
    const { company_id, product_id, disbursement_channel } =
      updateWebhookStatusResp;
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    const channelTransactions =
      await DisbursementAndTopupSchema.findByCondition({
        company_id,
        product_id,
        disbursement_channel,
      });
    channelTransactions.forEach((row, index) => {
      if (row.txn_entry.toLowerCase() == 'dr' && row.txn_stage === '1') {
        totalDebitAmount += parseFloat(row.amount ? row.amount : 0);
      }
      if (row.txn_entry.toLowerCase() == 'cr') {
        totalCreditAmount += parseFloat(row.amount ? row.amount : 0);
      }
    });
    let availableBalance = totalCreditAmount - totalDebitAmount;
    availableBalance =
      Math.round((availableBalance * 1 + Number.EPSILON) * 100) / 100;
    const updateAvailableBalance =
      await DisbursementChannelConfigSchema.updateAvailableBalance(
        company_id,
        product_id,
        disbursement_channel,
        availableBalance,
      );
    return { success: true };
  } catch (error) {}
};

// update colend repayment schedule
async function updateAllCoLendRepaymentSchedule(
  productResp,
  updateWebhookStatusResp,
) {
  const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(
    updateWebhookStatusResp.loan_id,
  );
  if (
    productResp?.is_lender_selector_flag === 'Y' &&
    loanData?.co_lend_flag === 'Y' &&
    loanData?.repayment_type.toLowerCase() === 'daily'
  ) {
    const repaymentInstallments =
      await repaymentInstallmentsSchema.findAllByLoanId(
        updateWebhookStatusResp.loan_id,
      );
    await coLenderRepaymentScheduleSchema.updateAllCoLendRepaymentSchedule(
      repaymentInstallments,
    );
  }
}

module.exports = {
  updateWebhookStatus,
  loanStatusUpdate,
  validateWebhookPayload,
  recordLoanTransactionForCashCollateral,
  uploadWebhookDataToS3,
  uploadPartnerResponseToS3,
  updateDisbChannelAvailableBalance,
  uploadColenderResponseToS3,
  uploadColenderWebhookDataToS3,
  recordLoanTransaction,
};

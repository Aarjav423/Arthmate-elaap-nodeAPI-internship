const jwt = require('../util/jwt');
const axios = require('axios');
const PayoutDetailsSchema = require('../models/payout-detail-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema');
const DisbursementChannelConfig = require('../models/disbursement-channel-config-schema');
const DisbursementChannelMasterScehema = require('../models/disbursement-channel-master-schema.js');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const UniqueReferenceDisburesementSchema = require('../models/unique-reference-disbursement-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');
const moment = require('moment');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const LoanStateSchema = require('../models/loan-state-schema.js');
const Product = require('../models/product-schema.js');
const payoutDetail = require('../models/payout-detail-schema.js');
const { refundType } = require('../utils/constant.js');
const payoutDetailsHelper = require('../util/payout-details-helper.js');
const { errorResponse } = require('../utils/responses');
const { check, validationResult } = require('express-validator');
const { checkIfForeclosureOfferIsInApprovedState } = require('../util/foreclosure-helper-v2.js');
const { adjustExcessAmount, checkExcessRefundInProgress } = require('../util/excess-refund-helper.js');
const apiVersion2 = 'v2';

const checkDisbursementChannelBalance = async (company_id, product_id, disbursement_channel) => {
  let totalDebitAmount = 0;
  let totalCreditAmount = 0;
  const channelTransactions = await DisbursementLedgerSchema.findByCondition({
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
  const availableBalance = totalCreditAmount - totalDebitAmount;
  return availableBalance;
};

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/refund-details/:loan_id', [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct], borrowerHelper.isLoanExistByLID, async (req, res, next) => {
    try {
      const loan_id = req.params.loan_id;
      // Validate if loan is in disbursed status
      if (req.loanData.stage !== 4)
        throw {
          success: false,
          message: `Unable to get refund details as loan is in ${req.loanData.status} status`,
        };

      let disbursementDate = moment(req.loanData.disbursement_date_time, 'YYYY-MM-DD');
      let finalApproveDate = moment(req.loanData.final_approve_date, 'YYYY-MM-DD');
      let refundDays = disbursementDate.diff(finalApproveDate, 'days');

      // Calculate refund amount
      const refund_amount = (Number(req.loanData.sanction_amount) * Number(req.loanData.loan_int_rate) * Number(refundDays)) / (100 * 365);

      let responseData = {
        int_refund_amount: req.loanData.int_refund_amount || Math.round((refund_amount * 1 + Number.EPSILON) * 100) / 100,
        int_refund_days: req.loanData.int_refund_days || refundDays,
        interest_refund_status: req.loanData.int_refund_status || 'NotInitiated',
        interest_refund_date_time: req.loanData.int_refund_date_time ? req.loanData.int_refund_date_time : '',
        refund_triggered_by: req.loanData.refund_triggered_by ? req.loanData.refund_triggered_by : '',
        int_refund_request_date_time: req.loanData.int_refund_request_date_time,
      };
      return res.status(200).send({
        success: true,
        data: responseData,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  const conditionalVerifyCompany = (req, res, next) => {
    // Check if the user has the role "SuperAdmin"
    if (req.authData && req.user && req.user.type.toLowerCase() === 'admin') {
      return next();
    }
    jwt.verifyCompany(req, res, next);
  };

  const conditionalVerifyProduct = (req, res, next) => {
    // Check if the user has the role "SuperAdmin"
    if (req.authData && req.user && req.user.type.toLowerCase() === 'admin') {
      return next();
    }
    jwt.verifyProduct(req, res, next);
  };
  app.post('/api/initiate-interest-refund', [jwt.verifyToken, jwt.verifyUser, conditionalVerifyCompany, conditionalVerifyProduct], borrowerHelper.isConditionalLoanExistByLID, borrowerHelper.fetchLeadData, borrowerHelper.checkBorrowerPayoutStatus, async (req, res) => {
    const reqData = req.body;
    try {
      // Return if allow_loc flag is true in product
      if (req.product.allow_loc === 1)
        throw {
          success: false,
          message: "As provided product is line of credit can't make call to composite disbursement ",
        };

      // Validate if loan is in disbursed status
      if (req.loanData.stage !== 4)
        throw {
          success: false,
          message: `Unable to initiate refund as loan is in ${req.loanData.status} status`,
        };
      
      if(!req.loanData?.borro_bank_ifsc || !req.loanData.borro_bank_acc_num || !req.loanData.borro_bank_account_holder_name){
        throw {
          success: false,
          message: `Unable to initiate refund as beneficiary account details are missing`,
        };
      }
      // Validate refund_amount and int_refund_days.
      let disbursementDate = moment(req.loanData.disbursement_date_time, 'YYYY-MM-DD');
      let finalApproveDate = moment(req.loanData.final_approve_date, 'YYYY-MM-DD');

      //Check whether the disbursement channel is configured
      const disbursementChannel = await DisbursementChannelConfig.getDisburseChannel({
        company_id: req.company._id,
        product_id: req.product._id,
      });
      if (!disbursementChannel)
        throw {
          success: false,
          message: `Disburse channel is not configured for ${req.company.name} `,
        };
      const disbursementChannelMaster = await DisbursementChannelMasterScehema.findOneByTitle(disbursementChannel.disburse_channel);
      if (!disbursementChannelMaster)
        throw {
          success: false,
          message: `Global disbursement channel not found`,
        };

      if (!Number(disbursementChannelMaster.status))
        throw {
          success: false,
          message: `Global disbursement channel is not active, kindly contact system administrator.`,
        };
      if (!disbursementChannel)
        throw {
          success: false,
          message: `Product don't have this channel configured , kindly contact system administrator.`,
        };
      if (!Number(disbursementChannel.status))
        throw {
          success: false,
          message: `Disburse channel config for this product is not active, kindly contact system administrator.`,
        };

      if (disbursementChannel.wallet_config_check === '1') {
        const availableChannelBalance = await checkDisbursementChannelBalance(req.company._id, req.product._id, disbursementChannelMaster.title);
        if (parseFloat(availableChannelBalance) < parseFloat(reqData.net_disbur_amt)) {
          throw {
            success: false,
            message: 'Insufficient balance, kindly top up disbursement channel',
          };
        }
      }
      //************* Make call to the bank disbursement api. *************
      let uniqueReferenceCount = await UniqueReferenceDisburesementSchema.countByLoanId(req.loanData.loan_id);
      uniqueReferenceCount = uniqueReferenceCount < 9 ? `0${Number(uniqueReferenceCount + 1)}` : uniqueReferenceCount + 1;
      let loan_id_portion = `${req.loanData.loan_id.substr(req.loanData.loan_id.length - 11)}R`;
      let refund_req_id = `${loan_id_portion}${uniqueReferenceCount}`;

      await UniqueReferenceDisburesementSchema.addNew({
        loan_id: req.loanData.loan_id,
        req_id: refund_req_id,
      });

      const disbData = {
        loan_app_id: req.loanData.loan_app_id,
        loan_id: refund_req_id,
        borrower_id: req.loanData.borrower_id,
        partner_loan_app_id: req.loanData.partner_loan_app_id,
        partner_loan_id: req.loanData.partner_loan_id,
        partner_borrower_id: req.loanData.partner_borrower_id,
        borrower_mobile: req.leadData.appl_phone,
        txn_date: moment(Date.now()).format('YYYY-MM-DD'),
        company_name: req.company.name,
        code: req.company.code,
        company_id: req.company._id,
        product_id: req.product._id,
        txn_id: `${reqData.loan_id}${new Date().getTime()}`,
        disburse_channel: disbursementChannelMaster.title,
        amount: reqData.refund_amount,
        debit_account_no: disbursementChannel.debit_account,
        debit_ifsc: disbursementChannel.debit_account_ifsc,
        debit_trn_remarks: reqData.loan_id,
        beneficiary_ifsc: req.loanData.borro_bank_ifsc,
        beneficiary_account_no: req.loanData.borro_bank_acc_num,
        beneficiary_name: req.loanData.borro_bank_account_holder_name,
        mode_of_pay: 'PA',
        //Send refund webhook URL to bank in case of refund
        webhook_link: process.env.REFUND_WIREOUT_URL,
        access_token: process.env.REFUND_WIREOUT_SECRET,
      };
      const config = {
        method: 'post',
        url: disbursementChannelMaster.endpoint,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${disbursementChannelMaster.secret_key}`,
        },
        data: disbData,
      };
      const disbursementResponse = await axios(config);
      if (disbursementResponse.data) {
        //after response from bank disbursement api update the refund data in borrower_info_common table
        updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
          {
            refund_request_date_time: moment(Date.now()).format('YYYY-MM-DD'),
            int_refund_days: req.body.refund_days,
            int_refund_amount: req.body.refund_amount,
            int_refund_triggered_by: req.user.username,
            int_refund_status: 'Initiated',
          },
          reqData.loan_id,
        );

        //Make debit entry in  disbursement_and_topup schema
        let disbursementDebitData = {
          company_id: req.company._id,
          product_id: req.product._id,
          disbursement_channel: disbursementChannelMaster.title,
          txn_id: disbursementResponse.data.txn_id,
          amount: reqData.refund_amount,
          loan_id: reqData.loan_id,
          refund_req_id: refund_req_id,
          borrower_id: req.loanData.borrower_id,
          partner_loan_id: req.loanData.partner_loan_id,
          partner_borrower_id: req.loanData.partner_borrower_id,
          txn_date: moment(Date.now()).format('YYYY-MM-DD'),
          bank_name: req.loanData.borro_bank_account_holder_name,
          bank_account_no: req.loanData.borro_bank_acc_num,
          bank_ifsc_code: req.loanData.borro_bank_ifsc,
          borrower_mobile: req.leadData.appl_phone,
          txn_entry: 'dr',
          txn_stage: '',
          label: 'Refund',
          label_type: reqData.label_type,
        };
        if (!reqData.label_type || reqData.label_type === '') disbursementDebitData['label_type'] = 'Interest Refund';
        await DisbursementLedgerSchema.addNew(disbursementDebitData);

        let requestor_id;
        if (req.authData.type == 'api') {
          requestor_id = req?.company?.name;
        } else {
          requestor_id = req?.user?.email;
        }

        await PayoutDetailsSchema.findOneAndUpdate(
          {
            loan_id: reqData.loan_id,
            type: refundType.INTEREST_REFUND,
          },
          {
            status: 'In_Progress',
            txn_id: disbursementResponse.data.txn_id,
            refund_req_id: refund_req_id,
            requested_by: requestor_id,
          },
        );

        return res.status(200).send({
          success: true,
          loan_id: reqData.loan_id,
          response: disbursementResponse.data,
        });
      }else {
        return res.status(400).send({
          success: false,
          message: 'Disbursement service unavailable. Please try again later.',
        });
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(400).send({
          success: false,
          message: 'Service unavailable. Please try again later.',
        });
      }
      return res.status(400).send(error);
    }
  });

  app.get(
    `/api/${apiVersion2}/refund-details/:loan_id`,
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const loanId = req.params.loan_id;
        const loan = await BorrowerinfoCommon.findOneWithKLID(loanId);
        if (!loan) {
          throw {
            success: false,
            message: "Loan doesn't exist for the given id",
          }
        }

        //to calculate the excess amount from transaction ledger and loan state's excess excess_payment_ledger
        const query = {
          loan_id: loanId,
          label: 'repayment',
          is_received: 'Y',
          $or: [{ processed: 'null' }, { processed: null }, { processed: "N" }],
        };
        let excessTxnLedgerTotalAmt = 0;
        let excessTxnLedgers = [];

        const paymentLedger = await LoanStateSchema.findByCondition({
          loan_id: loanId,
        });
        if (paymentLedger && paymentLedger?.excess_payment_ledger) {
          excessTxnLedgers.push({
            utr_number: paymentLedger?.excess_payment_ledger?.utr_number,
            utr_date_time: paymentLedger?.excess_payment_ledger?.utr_date_time_stamp,
            amount: paymentLedger?.excess_payment_ledger?.txn_amount,
          });
          excessTxnLedgerTotalAmt += parseFloat(paymentLedger?.excess_payment_ledger?.txn_amount);
        }

        const transactionLedger = await LoanTransactionLedgerSchema.findAllWithCondition(query);
        if (transactionLedger.length > 0) {
          transactionLedger.forEach((transaction) => {
            excessTxnLedgerTotalAmt += parseFloat(transaction.txn_amount);
            excessTxnLedgers.push({
              utr_number: transaction.utr_number,
              utr_date_time: transaction.utr_date_time_stamp,
              amount: transaction.txn_amount,
            });
          });
        }

        let resp = {};
        resp.excess_ledgers = excessTxnLedgers;
        resp.total_excess_ledgers_amount = Math.round((excessTxnLedgerTotalAmt + Number.EPSILON) * 100) / 100;

        let requestor_id;
        if (req.authData.type == 'api') {
          requestor_id = req?.company?.name;
        } else {
          requestor_id = req?.user?.email;
        }
        const payoutDetails = await payoutDetailsHelper.getInterestRefundPayoutDetails(loan, requestor_id);
        resp.interest_refund = {
          amount: payoutDetails?.amount,
          refund_days: payoutDetails?.refund_days,
          status: payoutDetails?.status,
          is_broken_interest: payoutDetails?.is_broken_interest,
        };

        return res.status(200).send({
          success: true,
          message: "Data fetched successfully",
          data: resp,
        });

      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || "Error occurred fetching refund details",
        });
      }
    }
  );

  app.post('/api/initiate-excess-refund', [jwt.verifyToken, jwt.verifyUser, conditionalVerifyCompany, conditionalVerifyProduct], borrowerHelper.isConditionalLoanExistByLID, checkExcessRefundInProgress, checkIfForeclosureOfferIsInApprovedState, borrowerHelper.fetchLeadData, [check('loan_id').notEmpty().withMessage('Loan_id is required'), check('excess_amount').notEmpty().withMessage('excess_amount is required')], async (req, res) => {
    const reqData = req.body;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        throw {
          success: false,
          message: errors.errors[0]['msg'],
        };
      // Return if allow_loc flag is true in product
      if (req.product.allow_loc === 1)
        throw {
          success: false,
          message: "As provided product is line of credit can't make call to intiate excess refund disbursement ",
        };

      // Validate if loan is in disbursed status
      if (req.loanData.stage !== 4)
        throw {
          success: false,
          message: `Unable to initiate excess refund as loan is in ${req.loanData.status} status`,
        };

      // Validate  excess refund_amount

      //to calculate the excess amount from transaction ledger and loan state's excess excess_payment_ledger
      let excess_details = [];
      let excessPaymentLedger = 0;
      const paymentLedger = await LoanStateSchema.findByCondition({
        loan_id: reqData.loan_id,
      });
      if (paymentLedger && paymentLedger != null) {
        excessPaymentLedger = paymentLedger?.excess_payment_ledger && paymentLedger?.excess_payment_ledger?.txn_amount ? paymentLedger.excess_payment_ledger.txn_amount : 0;
        //amount can be negative or not
        excess_details.push({
          _id: paymentLedger._id,
          amount: excessPaymentLedger,
          ledger_type: 'excess_ledger',
          utr_number: paymentLedger?.excess_payment_ledger && paymentLedger?.excess_payment_ledger?.utr_number ? paymentLedger.excess_payment_ledger.utr_number : null,
          utr_date: paymentLedger?.excess_payment_ledger && paymentLedger?.excess_payment_ledger?.utr_date_time_stamp ? paymentLedger.excess_payment_ledger.utr_date_time_stamp : null,
        });
      }

      const query = {
        loan_id: reqData.loan_id,
        label: 'repayment',
        is_received: 'Y',
        $or: [{ processed: 'null' }, { processed: null }],
      };
      let loanTransactionAmount = 0;
      const transactionLedger = await LoanTransactionLedgerSchema.findAllWithCondition(query);
      if (transactionLedger.length > 0) {
        transactionLedger.forEach((transaction) => {
          loanTransactionAmount += parseFloat(transaction.txn_amount);
          if (transaction.txn_amount > 0)
            excess_details.push({
              _id: transaction._id,
              ledger_type: 'transaction_ledger',
              amount: transaction.txn_amount,
              utr_number: transaction && transaction.utr_number ? transaction.utr_number : null,
              utr_date: transaction && transaction.utr_date_time_stamp ? transaction.utr_date_time_stamp : null,
            });
        });
      }

      //total excess amount from transaction ledger and loan states
      const totalExcessAmount = loanTransactionAmount + parseFloat(excessPaymentLedger);
      if (totalExcessAmount <= 0 || excess_details.length == 0) {
        throw {
          success: false,
          message: `Unable to initiate excess refund as excess amount is not available for the loanId`,
        };
      }
      if (req.body.excess_amount > totalExcessAmount) {
        throw {
          success: false,
          message: `Unable to initiate excess refund as excess amount provided is greater than excess amount for a loan`,
        };
      }
      //************* Make call to the bank disbursement api. *************

      let uniqueReferenceCount = await UniqueReferenceDisburesementSchema.countByLoanId(req.loanData.loan_id);
      uniqueReferenceCount = uniqueReferenceCount < 9 ? `0${Number(uniqueReferenceCount + 1)}` : uniqueReferenceCount + 1;
      let loan_id_portion = `${req.loanData.loan_id.substr(req.loanData.loan_id.length - 11)}E`;
      let refund_req_id = `${loan_id_portion}${uniqueReferenceCount}`;

      await UniqueReferenceDisburesementSchema.addNew({
        loan_id: req.loanData.loan_id,
        req_id: refund_req_id,
      });
      let requestor_id;
      if (req.authData.type == 'api') {
        requestor_id = req?.company?.name;
      } else {
        requestor_id = req?.user?.email;
      }

      const disbData = {
        loan_app_id: req.loanData.loan_app_id,
        loan_id: refund_req_id,
        borrower_id: req.loanData.borrower_id,
        partner_loan_app_id: req.loanData.partner_loan_app_id,
        partner_loan_id: req.loanData.partner_loan_id,
        partner_borrower_id: req.loanData.partner_borrower_id,
        borrower_mobile: req.leadData.appl_phone,
        txn_date: moment(Date.now()).format('YYYY-MM-DD'),
        company_name: req.company.name,
        code: req.company.code,
        company_id: req.company._id,
        product_id: req.product._id,
        txn_id: `${reqData.loan_id}${new Date().getTime()}`,
        disburse_channel: process.env.EXCESS_REFUND_DISBURSMENT_CHANNEL, //Title
        amount: reqData.excess_amount,
        debit_account_no: process.env.EXCESS_REFUND_DEBIT_ACCOUNT_NO, //Account
        debit_ifsc: process.env.EXCESS_REFUND_IFSC_CODE, //Ifsc
        debit_trn_remarks: reqData.loan_id,
        beneficiary_ifsc: req.loanData.borro_bank_ifsc,
        beneficiary_account_no: req.loanData.borro_bank_acc_num,
        beneficiary_name: req.loanData.borro_bank_account_holder_name,
        mode_of_pay: 'PA',
        //Send refund webhook URL to bank in case of refund
        webhook_link: process.env.EXCESS_REFUND_WIREOUT_URL,
        access_token: process.env.EXCESS_REFUND_WIREOUT_SECRET,
      };
      const config = {
        method: 'post',
        url: process.env.EXCESS_REFUND_ENDPOINT,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${process.env.EXCESS_REFUND_SECRET_KEY}`,
        },
        data: disbData,
      };
      const disbursementResponse = await axios(config);

      if (disbursementResponse.data) {
        //after response from bank disbursement api add the refund data in payout_details
        //Make  entry in  payout_details schema
        let payment_details = await adjustExcessAmount(reqData.loan_id, reqData.excess_amount, excess_details);
        let disbursementDebitData = {
          company_id: req.company._id,
          product_id: req.product._id,
          txn_id: disbursementResponse.data.txn_id,
          amount: reqData.excess_amount,
          loan_id: reqData.loan_id,
          refund_req_id: refund_req_id,
          borrower_id: req.loanData.borrower_id,
          partner_loan_id: req.loanData.partner_loan_id,
          partner_borrower_id: req.loanData.partner_borrower_id,
          loan_app_id: req.loanData.loan_app_id,
          disbursement_channel: process.env.EXCESS_REFUND_DISBURSMENT_CHANNEL,
          txn_date: moment(Date.now()).format('YYYY-MM-DD'),
          bank_name: req.loanData.borro_bank_account_holder_name,
          bank_account_no: req.loanData.borro_bank_acc_num,
          bank_ifsc_code: req.loanData.borro_bank_ifsc,
          loan_app_date: req.loanData.loan_app_date,
          requested_by: requestor_id,
          updated_by: requestor_id,
          type: 'excess_refund',
          status: 'In_Progress',
          requested_by: requestor_id,
          updated_by: requestor_id,
          payment_details,
        };
        //BIC update here
        await PayoutDetailsSchema.create(disbursementDebitData);
        return res.status(200).send({
          success: true,
          message: 'Excess Refund Request SuccessFully send for disbursment',
          loan_id: reqData.loan_id,
          response: disbursementResponse.data,
        });
      }
    } catch (error) {
      console.log('error===', error);
      if (error.code === 'ECONNREFUSED') {
        return res.status(400).send({
          success: false,
          message: 'Service unavailable. Please try again later.',
        });
      }
      return res.status(400).send(error);
    }
  });
};

 

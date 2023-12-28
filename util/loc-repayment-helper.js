const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const CreditLimit = require('../models/loc-credit-limit-schema.js');
const { check, validationResult } = require('express-validator');
const dateRegex = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
const moment = require('moment');

const settleLOCRepayment = async (req, res, next) => {
  try {
    const pendingTransaction =
      await LoanTransactionLedgerSchema.fetchPendingTransactions(
        req.body.loan_id,
      );
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const validLOCRepayPayload = [
  check('loan_id').notEmpty().withMessage('loan_id is required'),
  check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
  check('borrower_id').notEmpty().withMessage('borrower_id is required'),
  check('partner_loan_id')
    .notEmpty()
    .withMessage('partner_loan_id is required'),
  check('partner_borrower_id')
    .notEmpty()
    .withMessage('partner_borrower_id is required'),
  check('borrower_name').notEmpty().withMessage('borrower_name is required'),
  check('txn_id').notEmpty().withMessage('txn_id is required'),
  check('txn_amount')
    .notEmpty()
    .withMessage('txn_amount is required')
    .isLength({
      min: 2,
      max: 30,
    })
    .withMessage('Please enter valid txn_amount')
    .isNumeric()
    .withMessage('txn_amount should be numeric'),
  check('txn_date')
    .notEmpty()
    .withMessage('txn_date is required')
    .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
    .withMessage('Please enter valid txn_date in YYYY-MM-DD format'),
  check('txn_reference').notEmpty().withMessage('txn_reference is required'),
  check('utr_number').notEmpty().withMessage('utr_number is required'),
  check('utr_timestamp')
    .notEmpty()
    .withMessage('utr_timestamp is required')
    .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
    .withMessage('Please enter valid utr_timestamp in YYYY-MM-DD format'),
  check('principal_amount')
    .notEmpty()
    .withMessage('principal_amount is required')
    .isNumeric()
    .withMessage('principal_amount should be numeric'),
  check('interest_paid_amount')
    .notEmpty()
    .withMessage('interest_paid_amount is required')
    .isNumeric()
    .withMessage('interest_paid_amount should be numeric'),
  check('payment_mode').notEmpty().withMessage('payment_mode is required'),
  check('principal_paid_amount')
    .notEmpty()
    .withMessage('principal_paid_amount is required')
    .isNumeric()
    .withMessage('principal_paid_amount should be numeric'),
  check('repayment_tag').notEmpty().withMessage('repayment_tag is required'),
];

const validateRepaymentData = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw { success: false, message: errors.errors[0]['msg'] };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const updateRepyAvailableLimit = async (req, res, next) => {
  try {
    const limitRecord = await CreditLimit.checkCreditLimit(req.body.loan_id);
    if (!limitRecord)
      throw {
        success: false,
        message: `Credit limit is not set for this ${req.body.loan_id}. Please first set limit.`,
      };
    let availableBalanceUpdate =
      Number(limitRecord.available_balance) + Number(req.body.principal_amount);
    // Validate if balance to update should be less than or equal to sanction amount
    if (Number(availableBalanceUpdate) > Number(req.loanData.sanction_amount)) {
      availableBalanceUpdate = req.loanData.sanction_amount;
    }
    // Update the credit limit
    const updateLimitResp = await CreditLimit.updateCreditLimitData(
      req.body.loan_id,
      { available_balance: availableBalanceUpdate },
    );
    if (!updateLimitResp)
      throw { success: false, message: 'Error while updating credit limit' };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const recordRepaymentData = async (req, res, next) => {
  try {
    // Check for duplicate utr_number
    const utrNumberExist = await LoanTransactionLedgerSchema.findByUtrNumber(
      req.body.utr_number,
    );
    if (utrNumberExist)
      throw {
        success: false,
        message: 'utr_number already exist.',
      };

    // Check for duplicate txn_id
    const txnIdExist = await LoanTransactionLedgerSchema.findOneTxnId(
      req.body.txn_id,
    );
    if (txnIdExist)
      throw {
        success: false,
        message: 'txn_id already exist.',
      };
    // prepare repayment data
    const repayData = {
      company_id: req.company._id,
      company_name: req.company.name,
      product_id: req.product._id,
      product_name: req.product.name,
      loan_id: req.body.loan_id,
      loan_app_id: req.body.loan_app_id,
      borrower_id: req.body.borrower_id,
      partner_borrower_id: req.body.partner_borrower_id,
      borrower_name: req.body.borrower_name,
      txn_id: req.body.txn_id,
      txn_amount: req.body.txn_amount,
      txn_date: req.body.txn_date,
      txn_reference: req.body.txn_reference ? req.body.txn_reference : '',
      utr_number: req.body.utr_number,
      utr_date_time_stamp: req.body.utr_timestamp,
      txn_entry: 'cr',
      label: 'repayment',
      // Column not exist(need to add) in loan transaction ledger
      payment_mode: req.body.payment_mode,
      repayment_tag: req.body.repayment_tag,
      principal_amount: req.body.principal_amount,
      interest_paid_amount: req.body.interest_paid_amount,
      principal_paid_amount: req.body.principal_paid_amount,
    };
    const recordRepayment = await LoanTransactionLedgerSchema.addNew(repayData);
    if (!recordRepayment)
      throw {
        success: false,
        message: 'Error while recording loc repayment data.',
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

module.exports = {
  settleLOCRepayment,
  validateRepaymentData,
  updateRepyAvailableLimit,
  recordRepaymentData,
  validLOCRepayPayload,
};

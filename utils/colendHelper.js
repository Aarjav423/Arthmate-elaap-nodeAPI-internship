const colendLoanTransactionSchema = require('../models/co-lend-loan-transaction-ledger-schema.js');
const colendLoanSchema = require('../models/co-lender-loan-schema.js');
const BorrowerinfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const { check } = require('express-validator');

const validateCoLenderDecisionBody = [
  check('loan_id').notEmpty().withMessage('loan_id is rquired'),
  check('partner_loan_id')
    .notEmpty()
    .withMessage('partner_loan_id is required'),
  check('outcome')
    .notEmpty()
    .withMessage('outcome is required')
    .matches(/APPROVED|REJECTED/)
    .withMessage("outcome should be either 'APPROVED' or 'REJECTED'"),
];
const createDisbursementTransaction = async function (data, webhookReq) {
  const loanData = await BorrowerinfoCommonSchema.findOneWithKLID(data.loan_id);
  const sanctionAmount = loanData.sanction_amount;
  const colendLoanData = await colendLoanSchema.findByLoanID(data.loan_id);
  let colendScheduleData = [];
  if (colendLoanData) {
    colendScheduleData = colendLoanData?.filter(
      (schedule) =>
        !process.env.NON_COLENDER_NAMES.includes(schedule.co_lender_shortcode),
    );
  }
  let co_lender_id = colendScheduleData[0]?.co_lender_id;
  let co_lend_loan_id = colendScheduleData[0]?.co_lend_loan_id;
  let txn_amount = parseFloat(
    (sanctionAmount * colendScheduleData[0]?.co_lending_share) / 100,
  ).toFixed(2);
  if (colendScheduleData?.length < 1 || colendScheduleData === null) {
    co_lender_id = loanData?.co_lender_id;
    co_lend_loan_id = data.loan_id;
    txn_amount = sanctionAmount;
  }
  let colendDisbursementTransactionData = {
    company_id: data.company_id,
    product_id: data.product_id,
    loan_id: data.loan_id,
    utr_number: data.utrn_number,
    txn_date: data.txn_date,
    co_lender_id: co_lender_id,
    co_lend_loan_id: co_lend_loan_id,
    txn_amount: txn_amount,
    txn_id: data.txn_id,
    txn_mode: webhookReq.payment_mode ?? 'Bank',
    txn_entry: 'cr',
    label: 'credit',
    principal_amount: null,
    interest_amount: null,
  };
  await colendLoanTransactionSchema.addNew(colendDisbursementTransactionData);
  if (colendScheduleData?.length > 0) {
    await colendLoanSchema.insertDisbursementDate(
      colendScheduleData[0]?.co_lend_loan_id,
      data.txn_date,
    );
  }
};
module.exports = {
  createDisbursementTransaction,
  validateCoLenderDecisionBody,
};

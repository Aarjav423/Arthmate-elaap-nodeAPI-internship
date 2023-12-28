const { check } = require('express-validator');
const { compositeDisbursment, disburseAmount } = require('./index');
const {
  validateReq,
  verifyCompany,
  verifyProduct,
  verifyToken,
  verifyUser,
  isProductLoc,
  isLoanExistByLID,
  isLoanClosed,
  validateLoanStatusAndNetDisbursmentAmount,
  validateAgreementAndValidateSanctionLetter,
  findDisbursmentChannelAndBalance,
  checkForExistingDisbursedLoan,
  isProductCashCollateral,
} = require('./middleware');
const { maintainAccessLog } = require('./helper');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/v2/composite_disbursement',
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('loan_app_id').notEmpty().withMessage('loan_id is required'),
      check('borrower_id').notEmpty().withMessage('borrower_id is required'),
      check('partner_loan_id')
        .notEmpty()
        .withMessage('partner_loan_id is required'),
      check('partner_borrower_id')
        .notEmpty()
        .withMessage('partner_borrower_id is required'),
      check('borrower_mobile')
        .notEmpty()
        .withMessage('borrower_mobile is required')
        .isLength({
          min: 10,
          max: 10,
        })
        .withMessage('Please enter valid 10 digit borrower_mobile')
        .isNumeric()
        .withMessage('borrower_mobile should be numeric'),
      check('txn_date')
        .notEmpty()
        .withMessage('txn_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid txn_date in YYYY-MM-DD format'),
      check('sanction_amount')
        .notEmpty()
        .withMessage('sanction_amount is required')
        .isLength({
          min: 2,
          max: 30,
        })
        .withMessage('Please enter valid sanction_amount')
        .isNumeric()
        .withMessage('sanction_amount should be numeric'),
      check('net_disbur_amt')
        .notEmpty()
        .withMessage('net_disbur_amt is required')
        .isLength({
          min: 2,
          max: 30,
        })
        .withMessage('Please enter valid net_disbur_amount')
        .isNumeric()
        .withMessage('net_disbur_amount should be numeric'),
    ],
    [
      verifyToken,
      validateReq,
      verifyUser,
      verifyCompany,
      verifyProduct,
      isProductLoc,
      isLoanExistByLID,
      checkForExistingDisbursedLoan,
      findDisbursmentChannelAndBalance,
      validateAgreementAndValidateSanctionLetter,
      validateLoanStatusAndNetDisbursmentAmount,
    ],
    compositeDisbursment,
    maintainAccessLog,
  );

  app.post(
    '/api/v2/disburse_withheld_amount',
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('txn_date')
        .notEmpty()
        .withMessage('txn_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid txn_date in YYYY-MM-DD format'),
      check('net_disbur_amt')
        .notEmpty()
        .withMessage('net_disbur_amt is required')
        .isLength({
          min: 2,
          max: 30,
        })
        .withMessage('Please enter valid net_disbur_amount')
        .isNumeric()
        .withMessage('net_disbur_amount should be numeric'),
      check('disbursmentType')
        .notEmpty()
        .default('cashcollateral')
        .isIn(['cashcollateral'])
        .withMessage('Please provide disbursment_type'),
      check('loc_drawdown_usage_id').optional(),
      check('loc_drawdown_request_id').optional(),
    ],
    [
      verifyToken,
      validateReq,
      verifyUser,
      verifyCompany,
      verifyProduct,
      isProductCashCollateral,
      isProductLoc,
      isLoanExistByLID,
      isLoanClosed,
      checkForExistingDisbursedLoan,
      findDisbursmentChannelAndBalance,
      validateLoanStatusAndNetDisbursmentAmount,
    ],
    disburseAmount,
    maintainAccessLog,
  );
};

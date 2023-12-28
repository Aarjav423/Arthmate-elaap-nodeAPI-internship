const bodyParser = require('body-parser');
const ColendLoanTransactionLedger = require('../models/co-lend-loan-transaction-ledger-schema.js');
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const CoLenderTransactionHistory = require('../models/co-lend-transaction-summary-schema.js');
const { data } = require('../maps/borrowerinfo.js');

const STATUS_MASTER = {
  0: 'open',
  1: 'requested',
  2: 'in_progress',
  3: 'paid',
};

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/co-lender-transaction-history/:co_lend_loan_id/:co_lender_id',
    async (req, res) => {
      try {
        const profileRes =
          await ColendLoanTransactionLedger.getTransactionHistoryByLoanId(
            req.params.co_lend_loan_id,
            req.params.co_lender_id,
          );
        console.log(profileRes);
        return res.send({
          success: true,
          message: 'Success',
          data: profileRes,
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/co-lend-transaction/:summary_id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const coLendLedgers =
          await ColendLoanTransactionLedger.getLedgersBySummaryId(
            req.params.summary_id,
          );
        if (!coLendLedgers) {
          throw {
            success: false,
            message: 'Failed to get co-lend transaction history',
          };
        }

        return res.status(200).send(coLendLedgers);
      } catch (e) {
        console.log(e);
        return res.status(400).send(e);
      }
    },
  );

  app.patch(
    '/api/co-lend-repayment-utr',
    [
      check('stage').notEmpty().withMessage('stage is required'),
      check('summary_ids').notEmpty().withMessage(' summary ids are required'),
      check('utr_number').notEmpty().withMessage('utr number is required'),
      check('txn_date').notEmpty().withMessage('txn date is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        data.status = STATUS_MASTER[data.stage];
        await CoLenderTransactionHistory.updateBySummaryId(data);
        await ColendLoanTransactionLedger.updateBySummaryId(data);

        return res.status(200).send({
          success: true,
          message: 'Succefully updated utr',
        });
      } catch (e) {
        return res.status(400).send({
          message: 'Failed to update co-lender repayment utr',
          success: false,
        });
      }
    },
  );

  app.patch(
    '/api/update-summary-stage',
    [
      check('stage').notEmpty().withMessage('stage is required'),
      check('summary_ids').notEmpty().withMessage('summary ids are required'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        data.status = STATUS_MASTER[data.stage];
        const updatedLedgers =
          await CoLenderTransactionHistory.updateStageBySummaryIds(data);
        if (!updatedLedgers) {
          throw {
            message: 'Failed to update co-lender repayment utr',
            success: false,
          };
        }
        return res.status(200).send({
          success: true,
          message: 'Successfully updated stage',
        });
      } catch (e) {
        return res.status(400).send(e);
      }
    },
  );
};

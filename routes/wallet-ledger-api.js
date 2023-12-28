bodyParser = require('body-parser');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
const WalletLedger = require('../models/wallet-ledger-schema.js');
const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/fetch_wallet',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyLender,
      jwt.verifyProduct,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //generate filter data
        const filterData = {
          company_id: req.company._id,
          lender_id: req.lender._id,
          product_id: req.product._id,
          from_date: data.from_date,
          to_date: data.to_date,
          disbursement_channel: data.disbursement_channel,
          page: data.page,
          limit: data.limit,
        };
        //fetch data from wallet ledger by filter
        const walletLedgerList = await WalletLedger.getAllByFilter(filterData);
        return res.send({
          success: true,
          data: walletLedgerList,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/wallet_balance',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyLender,
      jwt.verifyProduct,
    ],
    async (req, res) => {
      try {
        const filterData = {
          lender_id: req.lender._id,
          company_id: req.company._id,
          product_id: req.product._id,
          disbursement_channel: req.body.disbursement_channel,
        };
        let creditAmount = 0;
        let debitAmount = 0;
        //fetch wallet data by requested filter
        const walletResp = await WalletLedger.getWalletBalance(filterData);
        if (!walletResp.length)
          throw {
            success: false,
            message: 'No records found in wallet ledger',
          };
        //make sum of cr and dr entries from response
        walletResp.forEach((row, index) => {
          if (row.txn_type === 'dr') {
            debitAmount += parseFloat(row.txn_amount);
          }
          if (row.txn_type === 'cr') {
            creditAmount += parseFloat(row.txn_amount);
          }
        });
        //calculate wallet balance as substractio of credit amount and debit amount
        const walletBalance = creditAmount - debitAmount;
        return res.send({
          success: true,
          walletBalance: walletBalance,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/record_wallet',
    [
      check('disbursement_channel')
        .notEmpty()
        .withMessage('disbursement_channel is required'),
      check('txn_amount').notEmpty().withMessage('txn_amount is required'),
      check('txn_type').notEmpty().withMessage('txn_type is required'),
      check('txn_id').notEmpty().withMessage('txn_id is required'),
      check('txn_date').notEmpty().withMessage('txn_date is required'),
      check('source_accountholder_name')
        .notEmpty()
        .withMessage('source_accountholder_name is required'),
      check('source_account_number')
        .notEmpty()
        .withMessage('source_account_number is required'),
      check('source_ifsc_code')
        .notEmpty()
        .withMessage('source_ifsc_code is required')
        .matches(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
        .withMessage('Please enter valid source_ifsc_code'),
      check('destination_accountholder_name')
        .notEmpty()
        .withMessage('destination_accountholder_name is required'),
      check('destination_account_number')
        .notEmpty()
        .withMessage('destination_account_number is required'),
      check('destination_ifsc_code')
        .notEmpty()
        .withMessage('destination_ifsc_code is required')
        .matches(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
        .withMessage('Please enter valid destination_ifsc_code'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyLender,
      jwt.verifyProduct,
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        //future date check
        const currDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
        if (data.txn_date > currDate)
          throw {
            message: 'txn_date should be less than or equal to current date.',
          };
        //duplicate txn_id check
        const existByTxnId = await WalletLedger.findByTxnId(data.txn_id);
        if (existByTxnId.length)
          throw {
            message: 'txn_id already exist',
          };
        //duplicate utr_number check
        if (data.utr_number) {
          const utrNumberExist = await WalletLedger.findByUtrNumber(
            data.utr_number,
          );
          if (utrNumberExist.length)
            throw {
              message: 'utr_number already exist ',
            };
        }
        data.company_id = req.company._id;
        data.product_id = req.product._id;
        data.lender_id = req.lender._id;
        data.lender_name = req.lender.name;
        data.company_name = req.company.name;
        data.product_name = req.product.name;
        //add data to wallet walletLedger
        const addwalletResp = await WalletLedger.addNew(data);
        if (!addwalletResp)
          throw {
            message: 'Error while adding wallet ledger data',
          };
        return res.status(200).send({
          success: true,
          message: 'Ledger wallet data inserted successfully',
          data: addwalletResp,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

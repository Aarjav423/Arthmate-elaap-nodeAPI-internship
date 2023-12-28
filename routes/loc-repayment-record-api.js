const jwt = require('../util/jwt');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema');
const reqUtils = require('../util/req');
const { check, validationResult } = require('express-validator');
const locRepaymentHelper = require('../util/loc-repayment-helper.js');
const locHelper = require('../util/line-of-credit-helper.js');
const borrowerHelper = require('../util/borrower-helper.js');

module.exports = (app, connection) => {
  // app.post(
  //   "/api/loc_repayment_record",
  //   [
  //     jwt.verifyToken,
  //     jwt.verifyUser,
  //     jwt.verifyCompany,
  //     jwt.verifyProduct,
  //     locRepaymentHelper.validLOCRepayPayload,
  //     locRepaymentHelper.validateRepaymentData,
  //     locHelper.isProductTypeLoc,
  //     borrowerHelper.isLoanExist,
  //     locRepaymentHelper.settleLOCRepayment,
  //     locRepaymentHelper.recordRepaymentData,
  //     locRepaymentHelper.updateRepyAvailableLimit
  //   ],
  //   async (req, res, next) => {
  //     try {
  //       return res.status(200).send({
  //         success: true,
  //         message:
  //           "Successfully inserted repayment record in loan transaction ledger"
  //       });
  //     } catch (error) {
  //       return res.status(400).send(error);
  //     }
  //   }
  // );
};

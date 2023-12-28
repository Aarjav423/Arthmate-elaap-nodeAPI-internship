'use strict';
const pinSchema = require('../models/loan-pin-schema');
const BorrowerCommon = require('../models/borrowerinfo-common-schema.js');
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const AccessLog = require('../util/accessLog');

module.exports = (app) => {
  //Add record
  app.post(
    '/api/set_pin',
    [
      check('pin')
        .notEmpty()
        .withMessage('pin is required')
        .isNumeric()
        .isLength({
          min: 6,
          max: 6,
        })
        .withMessage('pin should be numeric'),
      check('verify_pin')
        .notEmpty()
        .withMessage('verify pin is required')
        .isNumeric()
        .isLength({
          min: 6,
          max: 6,
        })
        .withMessage('verify pin should be numeric'),
      check('loan_id').notEmpty().withMessage('loan id is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        var pinData = req.body;
        if (pinData.pin !== pinData.verify_pin)
          throw {
            message: 'The pin confirm does not match',
          };
        const RespBorro = await BorrowerCommon.findOneWithKLID(pinData.loan_id);
        if (!RespBorro)
          throw {
            message: 'This loan id does not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            message: 'This loan id is not associated with selected company',
          };
        if (req.product._id !== RespBorro.product_id)
          throw {
            message: 'This product is not associated with this company',
          };

        const data = {
          company_id: req.company._id,
          loan_id: req.body.loan_id,
          product_id: req.product._id,
        };
        const findIfExists = await pinSchema.findExists(data);
        if (findIfExists.length) {
          const updateResp = await pinSchema.updatePin(data, pinData.pin);
          if (!updateResp)
            throw {
              message: 'error while resetting the pin',
            };
        } else {
          const Resp = await pinSchema.addNew(pinData);
          if (!Resp)
            throw {
              message: 'Error while setting up the pin',
            };
        }
        return res.json({
          message: 'PIN is set Successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loan_usage_status',
    [check('loan_id').notEmpty().withMessage('loan id is required')],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        var LoanData = req.body;
        const RespBorro = await BorrowerCommon.findOneWithKLID(
          LoanData.loan_id,
        );
        if (!RespBorro)
          throw {
            message: 'This loan id does not exist',
          };
        if (RespBorro.status !== 'disbursed')
          throw {
            message:
              'For activiting or deactiving loan should be in disbursed status',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            message: 'This loan id is not associated with selected company',
          };
        if (req.product._id !== RespBorro.product_id)
          throw {
            message: 'This product is not associated with this company',
          };
        const data =
          RespBorro.loan_usage_status === 'deactive' ? 'active' : 'deactive';
        const Resp = await BorrowerCommon.updateLoanUsageStatus(
          data,
          LoanData.loan_id,
        );
        if (!Resp)
          throw {
            message: 'Error while updating NFC status',
          };
        return res.json({
          message: `Loan Usage status has been ${data} Successfully`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/nfc_status',
    [check('loan_id').notEmpty().withMessage('loan id is required')],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        var LoanData = req.body;
        const RespBorro = await BorrowerCommon.findOneWithKLID(
          LoanData.loan_id,
        );
        if (!RespBorro)
          throw {
            message: 'This loan id does not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            message: 'This loan id is not associated with selected company',
          };
        if (req.product._id !== RespBorro.product_id)
          throw {
            message: 'This product is not associated with this company',
          };
        const data =
          RespBorro.nfc_status === 'deactived' ? 'actived' : 'deactived';
        const updateNfsResp = await BorrowerCommon.updateNfc(
          data,
          LoanData.loan_id,
        );
        if (!updateNfsResp)
          throw {
            message: 'Error while updating NFC status',
          };
        return res.json({
          message: `NFC has been ${data} Successfully`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/online_transaction_status',
    [check('loan_id').notEmpty().withMessage('loan id is required')],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        var LoanData = req.body;
        const RespBorro = await BorrowerCommon.findOneWithKLID(
          LoanData.loan_id,
        );
        if (!RespBorro)
          throw {
            message: 'This loan id does not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            message: 'This loan id is not associated with selected company',
          };
        if (req.product._id !== RespBorro.product_id)
          throw {
            message: 'This product is not associated with this company',
          };
        const data =
          RespBorro.online_transaction_status === 'deactived'
            ? 'actived'
            : 'deactived';
        const Resp = await BorrowerCommon.onlineTransactionStatusUpdate(
          data,
          LoanData.loan_id,
        );
        if (!Resp)
          throw {
            message: 'Error while updating online transaction status',
          };
        return res.json({
          message: `Online transaction has been ${data} Successfully`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

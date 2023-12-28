const otp = require('../services/sms/sms.js');
const jwt = require('../util/jwt');
const axios = require('axios');
const { check, validationResult } = require('express-validator');
const Optvalidation = require('../models/otp-validation-schema.js');
const BorrowerCommon = require('../models/borrowerinfo-common-schema.js');

module.exports = (app, connection) => {
  app.post(
    '/api/send_otp',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        const reqData = req.body;
        const RespBorro = await BorrowerCommon.findOneWithKLID(reqData.loan_id);
        if (!RespBorro)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'This loan id does not exist',
          });
        if (req.company._id !== RespBorro.company_id)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'This loan id is not associated with selected company',
          });
        if (req.product._id !== RespBorro.product_id)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'This product is not associated with this company.',
          });
        reqData.mobile_number = RespBorro.mobile_number;
        reqData.company_id = req.company._id;
        reqData.product_id = req.product._id;
        const data = JSON.stringify({
          phone: reqData.mobile_number,
        });
        var config = {
          method: 'post',
          url: process.env.OTP_SEND_URL,
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.OTP_API_KEY,
          },
          data: data,
        };
        axios(config)
          .then(async (response) => {
            reqData.otp = response.data.token;
            const result = await Optvalidation.addNew(reqData);
            if (!result)
              throw {
                message: 'Something went wrong while otp validation list data ',
              };
            return res.json(req, res, 200, {
              success: true,
              data: response.data,
            });
          })
          .catch((error) => {
            return res.json(req, res, 400, {
              success: false,
              error: error,
            });
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/validate_otp',
    [
      check('otp')
        .notEmpty()
        .withMessage('otp is required')
        .isNumeric()
        .isLength({
          min: 6,
          max: 6,
        })
        .withMessage('otp should be numeric'),
      check('loan_id').notEmpty().withMessage('loan id is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        const reqData = req.body;
        const RespBorro = await BorrowerCommon.findOneWithKLID(reqData.loan_id);
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
        const RespAuth = await Optvalidation.findOneWithOtp(
          reqData.otp,
          reqData.loan_id,
        );
        if (!RespAuth)
          throw {
            message: 'incorrect otp',
          };
        if (req.company._id != RespAuth.company_id)
          throw {
            message: 'This OTP is not associate with selected company',
          };
        if (req.product._id != RespAuth.product_id)
          throw {
            message: 'This OTP is not associate with selected product',
          };
        var date1 = new Date(RespAuth.expiry);
        var date2 = new Date();
        var diff = date2.getTime() - date1.getTime();
        var msec = diff;
        var mm = Math.abs(msec / 60000);
        if (mm > 5)
          throw {
            message: 'otp expire',
          };
        const RespUp = await Optvalidation.updateData(reqData.otp);
        if (!RespUp)
          throw {
            message: 'Failed to update OTP status',
          };
        return res.json({
          message: 'OTP Verified Successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const { default: axios } = require('axios');
const { check, validationResult } = require('express-validator');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const jwt = require('../util/jwt');
const {
  serviceLogging,
  handleError,
} = require('./third-party-apis/service/service-logging.js');

module.exports = (app) => {
  app.post(
    '/api/abfl-bre-status',
    [
      check('message').notEmpty().withMessage('message is required'),
      check('data.account_id').notEmpty().withMessage('account_id is required'),
      check('data.ccc_id').notEmpty().withMessage('ccc_id is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      services.isServiceEnabled(
        process.env.SERVICE_CO_LENDER_ABFL_BRE_STATUS_STATUS_ID,
      ),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const apiName = 'ABFL-BRE-STATUS-CALLBACK';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const serviceDetails = {
        vendor_name: 'Arthmate',
        api_name: apiName,
        service_id: process.env.SERVICE_CO_LENDER_ABFL_BRE_STATUS_STATUS_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
      };
      req.logData = {
        ...serviceDetails,
      };
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            errorType: 999,
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const reqBody = req.body;
        await serviceLogging(reqBody, req, 'request');
        const callbackRequestBody = {
          is_retryable: reqBody.is_retryable,
          message: reqBody.message,
          data: {
            pep_flag: reqBody.data.pep_flag,
            account_id: reqBody.data.account_id,
            ccc_id: reqBody.data.ccc_id,
            loan_amount: reqBody.data.loan_amount,
            async_id: reqBody.data.async_id,
            roi: reqBody.data.roi,
            tenure: reqBody.data.tenure,
            risk_flag: reqBody.data.risk_flag,
          },
        };
        let status = '';
        let response = {};
        await axios
          .request({
            url: `${process.env.CO_LENDER_ORIGIN_ABFL_BRE_STATUS_ENDPOINT}`,
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: process.env.CO_LENDER_ORIGIN_BASIC_AUTH,
            },
            data: callbackRequestBody,
          })
          .then((res) => {
            status = res.status;
            response = {
              success: res.data.success,
              message: res.data.message,
            };
          })
          .catch((error) => {
            status = error.response?.status;
            response = {
              success: error.response?.data?.success,
              message: error.response?.data?.message,
            };
          });
        await serviceLogging(response, req, 'response');
        if (!status) {
          status = 500;
          response = {
            message: 'Please contact the administrator',
            success: false,
          };
        }
        return res.status(status).send(response);
      } catch (err) {
        err.request_id = requestId;
        await handleError(err, req, res);
      }
    },
  );
};

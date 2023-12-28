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
    '/api/abfl-mrp-polling',
    [
      check('APPLICATION_ID')
        .notEmpty()
        .withMessage('APPLICATION_ID is required'),
      check('OPERATIONS_DECISION.RESULT')
        .notEmpty()
        .withMessage('OPERATIONS_DECISION.RESULT is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      services.isServiceEnabled(
        process.env.SERVICE_CO_LENDER_ABFL_MRP_POLLING_STATUS_ID,
      ),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const apiName = 'ABFL-MRP-POLLING-CALLBACK';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const serviceDetails = {
        vendor_name: 'Arthmate',
        api_name: apiName,
        service_id: process.env.SERVICE_CO_LENDER_ABFL_MRP_POLLING_STATUS_ID,
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
          CUSTOMER_ID: reqBody.CUSTOMER_ID,
          APPLICATION_ID: reqBody.APPLICATION_ID,
          DECISION_TYPE: reqBody.DECISION_TYPE,
          OPERATIONS_DECISION: {
            OPERATIONS_FLOW_TYPE:
              reqBody.OPERATIONS_DECISION.OPERATIONS_FLOW_TYPE,
            RESULT: reqBody.OPERATIONS_DECISION.RESULT,
            RESULT_RATIONALE: reqBody.OPERATIONS_DECISION.RESULT_RATIONALE,
            ERROR_MESSAGE: reqBody.OPERATIONS_DECISION.ERROR_MESSAGE,
          },
        };
        let status = '';
        let response = {};
        await axios
          .request({
            url: `${process.env.CO_LENDER_ORIGIN_ABFL_MRP_POLLING_ENDPOINT}`,
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
              CALLBACK_CAPTURE_STATUS: res.data.CALLBACK_CAPTURE_STATUS,
              CALLBACK_ERROR_MESSAGE: res.data.CALLBACK_ERROR_MESSAGE,
            };
          })
          .catch((error) => {
            status = error.response?.status;
            response = {
              CALLBACK_CAPTURE_STATUS:
                error.response?.data?.CALLBACK_CAPTURE_STATUS,
              CALLBACK_ERROR_MESSAGE:
                error.response?.data?.CALLBACK_ERROR_MESSAGE,
            };
          });
        await serviceLogging(response, req, 'response');
        if (!status) {
          status = 500;
          response = {
            CALLBACK_CAPTURE_STATUS: 0,
            CALLBACK_ERROR_MESSAGE: 'Please contact the administrator',
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

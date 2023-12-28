const { default: axios } = require('axios');
const { check, validationResult } = require('express-validator');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper.js');
const ServiceReqResLog = require('../models/service-req-res-log-schema');

let localLogData = {
  request_id: '',
  company_id: '',
  company_code: '',
  sub_company_code: '',
  vendor_name: 'CO-LENDING-ORIGIN',
  service_id: process.env.SERVICE_CO_LENDER_DISBURSAL_STATUS_ID,
  api_name: '',
  raw_data: '',
  request_type: '',
  response_type: '',
  timestamp: 0,
  pan_card: null,
  document_uploaded_s3: '',
  api_response_type: 'JSON',
  api_response_status: 'JSON',
  kyc_id: '',
};
let dateInRequestId = Date.now();
module.exports = (app) => {
  app.post(
    '/api/co-lender-disbursal-status',
    [
      check('PLLOSLeadID').notEmpty().withMessage('PLLOSLeadID is required'),
      check('PLLoanNumber').notEmpty().withMessage('PLLoanNumber is required'),
      check('Status').notEmpty().withMessage('Status is required'),
      check('StatusDate')
        .notEmpty()
        .withMessage('StatusDate is reuired')
        .matches(/^((0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\-\d{4}$)/)
        .withMessage('Please enter valid to_date in MM-dd-yyyy format'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      services.isServiceEnabled(
        process.env.SERVICE_CO_LENDER_DISBURSAL_STATUS_ID,
      ),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const data = req.body;
        const serviceLogs = await createServiceLogs(
          'MUTHOOT-UTR-STATUS',
          true,
          req,
        );
        const requestBody = {
          pllos_lead_id: data.PLLOSLeadID,
          pl_loan_number: data.PLLoanNumber,
          name: data.Name,
          status: data.Status,
          utr_number: data.UTRNumber,
          status_date: data.StatusDate,
          reject_reason: data.RejectReason,
        };
        let response = {};
        await axios
          .request({
            url: `${process.env.CO_LENDER_ORIGIN_MUTH_ENDPOINT}`,
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: process.env.CO_LENDER_ORIGIN_BASIC_AUTH,
            },
            data: requestBody,
          })
          .then((res) => {
            response = {
              statusCode: res.status,
              data: res.data,
            };
          })
          .catch((error) => {
            response = {
              statusCode: error.response?.status,
              data: error.response?.data,
            };
          });
        const newServiceLogs = await createServiceLogs(
          'MUTHOOT-UTR-STATUS',
          false,
          req,
        );
        return res.status(200).send(response);
      } catch (err) {
        return res.status(400).send(err);
      }
    },
  );
};

async function createServiceLogs(api, isRequest, data) {
  let timestamp = Date.now();
  let filename =
    Math.floor(10000 + Math.random() * 99999) + (isRequest ? '_req' : '_res');
  let key = `${api}/${localLogData.vendor_name}/${data.body.company?._id}/${filename}/${timestamp}.txt`;
  const uploadToS3 = await s3helper.uploadFileToS3(data.body, key);
  const s3Url = uploadToS3.Location;
  localLogData.request_type = isRequest ? 'request' : 'response';
  localLogData.api_name = api;
  localLogData.company_code = data.body.company?._code;
  localLogData.company_id = data.body.company?._id;
  if (s3Url) {
    localLogData.api_response_status = 'SUCCESS';
    localLogData.api_response_type = 'success';
    localLogData.document_uploaded_s3 = 1;
    (localLogData.raw_data = s3Url), (localLogData.response_type = 'success');
  } else {
    localLogData.document_uploaded_s3 = 0;
    localLogData.response_type = 'error';
  }
  localLogData.timestamp = timestamp;
  localLogData.request_id = `${localLogData.company_code}-MUTHOOT-UTR-STATUS-${dateInRequestId}`;
  const newServiceLog = await ServiceReqResLog.addNew(localLogData);
  if (!newServiceLog) {
    throw {
      success: false,
      message: 'Error occurs',
    };
  }
  return newServiceLog;
}

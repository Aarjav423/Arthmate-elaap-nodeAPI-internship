const bodyParser = require('body-parser');
const helper = require('../util/s3helper.js');
const bureaurReqResLogSchema = require('../models/service-req-res-log-schema');
const moment = require('moment');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const Compliance = require('../models/compliance-schema.js');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/okyc-webhook',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.OKYC_SERVICE_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const requestID = `${req.company.code}-OKYC-${Date.now()}`;

      try {
        const data = req.body;

        //----------------- Request logging in MongoDatabase and S3 bucket --------------------------//
        const dates = moment().format('YYYY-MM-DD HH:mm:ss');
        const company_id = req.company?._id ? req.company?._id : 0;
        const company_code = req.company?.code ? req.company?.code : 'Sample';

        let complianceData = {
          company_id: req.company?._id,
          product_id: req.product?._id,
          loan_app_id: data.loan_app_id,
          okyc_required: data.okyc_required,
          okyc_link_sent_datetime: data.okyc_link_sent_datetime,
          okyc_validation_datetime: data.okyc_validation_datetime,
          okyc_status: data.okyc_status,
          okyc_failed_otp_attempts: data.okyc_failed_otp_attempts,
        };
        okycDataDetails = await Compliance.findByLoanAppId(
          req.body.loan_app_id,
        );
        if (okycDataDetails[0]?.okyc_status === 'Y') {
          throw {
            errorType: 21,
            message: 'okyc already exists for this loan app id',
          };
        }
        //record kyc compliance data in table
        const recordCompliance = await Compliance.updateCompliance(
          data.loan_app_id,
          complianceData,
        );

        const objData = {
          company_id: company_id,
          company_code: company_code,
          request_id: company_code + '-OKYC-' + Date.now(),
          api_name: `OKYC`,
          loan_app_id: req.body.loan_app_id,
          service_id: process.env.OKYC_SERVICE_ID
            ? process.env.OKYC_SERVICE_ID
            : '0',
          response_type: 'success',
          request_type: 'request',
          timestamp: dates,
          document_uploaded_s3: '1',
          is_cached_response: 'FALSE',
          api_response_type: 'JSON',
          api_response_status: '',
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
        };

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `OKYC/${company_id}/${filename}/${Date.now()}.txt`;
        const uploadResponse = await helper.uploadFileToS3(req.body, reqKey);

        if (!uploadResponse) {
          (objData.document_uploaded_s3 = 0), (objData.response_type = 'error');
        }
        objData.raw_data = uploadResponse.Location;
        //insert request data s3 upload response to database

        const addResult = await bureaurReqResLogSchema.addNew(objData);
        if (!addResult)
          throw {
            message: 'Error while adding request data',
          };

        return res.status(200).send({
          success: true,
          message: 'OKYC Data Received',
        });
        //----------------------------------------------------------------------------------------
      } catch (error) {
        if (error.errorType)
          return res.status(400).send({
            status: 'fail',
            message: error.message,
          });
        return res.status(400).send({
          requestID: requestID,
          error: error,
          status: 'fail',
          message: 'Please contact the administrator',
        });
      }
    },
  );
};

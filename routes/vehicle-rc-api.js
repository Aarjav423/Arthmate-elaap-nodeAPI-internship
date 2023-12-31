const axios = require('axios');
const services = require('../util/service');
const ServiceReqResLog = require('../models/service-req-res-log-schema');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper.js');
const KYCSchema = require('../models/kyc-data-schema.js');
const validate = require('../util/validate-req-body.js');
const { logErrorToS3 } = require('../utils/error-logger');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

const localLogTemplate = {
  company_id: '',
  company_code: '',
  sub_company_code: '',
  vendor_name: 'KARZA',
  loan_app_id: '',
  service_id: 0,
  api_name: '',
  raw_data: '',
  request_type: '',
  response_type: '',
  timestamp: 0,
  pan_card: '',
  document_uploaded_s3: '',
  api_response_type: 'JSON',
  api_response_status: '',
  kyc_id: '',
};

async function verifyRequestWithTemplate(templateS3url, s3LogData) {
  // fetch upload template from s3
  const templateResponse = await s3helper.fetchJsonFromS3(
    templateS3url.substring(templateS3url.indexOf('services')),
  );

  if (!templateResponse || ('' + templateResponse).includes('Error'))
    throw { message: 'Error while finding template from s3' };

  // validate the incoming template data with customized template data
  const templateValidation = validate.validateDataWithTemplate(
    templateResponse,
    [s3LogData],
  );

  if (templateValidation.missingColumns.length) {
    templateValidation.missingColumns =
      templateValidation.missingColumns.filter(
        (x) => x.field != 'sub_company_code',
      );
  }
  if (!templateValidation)
    throw { errorType: 999, message: 'No records found' };
  if (templateValidation.unknownColumns.length)
    throw { errorType: 999, message: templateValidation.unknownColumns[0] };
  if (templateValidation.missingColumns.length)
    throw { errorType: 999, message: templateValidation.missingColumns[0] };
  if (templateValidation.errorRows.length)
    throw {
      errorType: 999,
      message: Object.values(templateValidation.exactErrorColumns[0])[0],
    };
  return true;
}

function initLocalLogData(req, optionals = {}) {
  let localLogData = { ...localLogTemplate };
  localLogData.company_id = req.company._id;
  localLogData.company_code = req.company.code;
  localLogData.loan_app_id = req.body.loan_app_id;
  localLogData.sub_company_code = req.headers.company_code;
  localLogData.pan_card = req.body.pan;
  localLogData.timestamp = Date.now();
  localLogData = { ...localLogData, ...optionals };
  return localLogData;
}

async function createS3Log(
  s3LogData,
  apiName,
  vendorName,
  companyId,
  timestamp,
  isRequest,
) {
  try {
    // save s3LogData into s3
    let filename =
      Math.floor(10000 + Math.random() * 99999) + (isRequest ? '_req' : '_res');
    const uploadResponse = await s3helper.uploadFileToS3(
      s3LogData,
      `${apiName}/${vendorName}/${companyId}/${filename}/${timestamp}.txt`,
    );
    return uploadResponse;
  } catch (error) {
    throw error;
  }
}

async function createLocalLog(s3LogResponse, localLogData, isRequest) {
  // update localLogData according to the s3 response
  localLogData.request_type = isRequest ? 'request' : 'response';
  if (s3LogResponse) {
    localLogData.document_uploaded_s3 = 1;
    localLogData.response_type = 'success';
    localLogData.api_response_status = 'SUCCESS';
    localLogData.raw_data = s3LogResponse.Location;
  } else {
    localLogData.document_uploaded_s3 = 0;
    localLogData.response_type = 'error';
  }

  // create local log of the s3 logging
  const insertResult = await ServiceReqResLog.addNew(localLogData);
  if (!insertResult) throw { message: 'Error while adding service log data' };

  // return updated logData
  return localLogData;
}

async function createLog(s3LogData, localLogData, isRequestLog) {
  try {
    // save log file into s3
    const s3LogResponse = await createS3Log(
      s3LogData,
      localLogData.api_name,
      localLogData.vendor_name,
      localLogData.company_id,
      localLogData.timestamp,
      isRequestLog,
    );

    // save local log into mongo
    const logData = await createLocalLog(
      s3LogResponse,
      localLogData,
      isRequestLog,
    );

    return { ...logData };
  } catch (error) {
    throw error;
  }
}

module.exports = (app) => {
  // api for vehicle rc verification
  app.post(
    '/api/vehicle-rc-verify',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_VEHICLE_RC_ID),
      verifyloanAppIdValidation,
    ],

    async (req, res) => {
      const apiName = 'VEHICLE-RC-VERIFY';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      localLogTemplate.kyc_id = requestId;

      const logData = {
        company_id: req.company._id,
        loan_app_id: req.body.loan_app_id,
        kyc_type: apiName,
        req_url: '',
        res_url: '',
        consent: req.body.consent,
        consent_timestamp: req.body.consent_timestamp,
        id_number: req.body.registration_number,
        created_at: Date.now(),
        created_by: req.company.code,
        kyc_id: requestId,
      };
      try {
        // validate api-request with service template
        const isValidated = await verifyRequestWithTemplate(
          req.service.file_s3_path,
          req.body,
        );
        if (!isValidated) {
          throw {
            errorType: 999,
            message: 'Invalid request!',
          };
        }

        // // initialize local-logging object
        const localLogData = initLocalLogData(req, {
          service_id: process.env.SERVICE_VEHICLE_RC_ID,
          api_name: apiName,
          reg_no: req.body.registration_number,
        });

        if (req.body.consent === 'N') {
          localLogData.response_type = 'error';
          localLogData.api_response_status = 'FAIL';
        }

        // log received client-request
        await createLog(req.body, localLogData, true);
        logData.req_url = localLogData.raw_data;

        if (req.body.consent === 'N') {
          throw {
            errorType: 999,
            request_id: requestId,
            message: 'Consent was not provided',
          };
        }

        const postData = {
          registrationNumber: req.body.registration_number,
          version: process.env.VEHICLE_RC_API_VERSION,
          consent: req.body.consent,
        };
        // invoke third-party api
        const apiResponse = await axios.request({
          method: 'POST',
          url: `${process.env.KARZA_URL}v3/rc-advanced`,
          headers: {
            'x-karza-key': process.env.KARZA_API_KEY,
            'Content-Type': 'application/json',
          },
          data: postData,
        });

        if (apiResponse && apiResponse.data) {
          // log received acknowledgement
          await createLog(apiResponse.data, localLogData, false);

          // acknowledge client with the acknowledgement from karza provider
          if (apiResponse.data.statusCode == 101) {
            logData.res_url = localLogData.raw_data;
            const insertResult = await KYCSchema.addNew(logData);
            return res.status(200).send({
              request_id: requestId,
              success: true,
              data: apiResponse.data,
            });
          } else {
            return res.status(400).send({
              request_id: requestId,
              success: false,
              data: apiResponse.data,
            });
          }
        } else {
          // log received acknowledgement
          await createLog(apiResponse, localLogData, false);

          return logErrorToS3(
            req,
            res,
            requestId,
            apiName,
            'KARZA',
            apiResponse,
          );
        }
      } catch (error) {
        const msgString =
          error.message.validationmsg || error.errorType
            ? error.message
            : `Please contact the administrator`;
        const errorCode =
          error.message.validationmsg || error.errorType ? 400 : 500;
        if (errorCode == 400) {
          res.status(400).send({
            requestID: requestId,
            status: 'fail',
            message: msgString,
            success: false,
          });
        } else {
          logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
        }
      }
    },
  );
};

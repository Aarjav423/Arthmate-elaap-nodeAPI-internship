const bodyParser = require('body-parser');
const axios = require('axios');
const PanAdvKycVerifications = require('../models/ekyc-advance-pan-schema');
const ServiceReqResLog = require('../models/service-req-res-log-schema');
const KYCSchema = require('../models/kyc-data-schema.js');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const s3helper = require('../util/s3helper.js');
const validate = require('../util/validate-req-body.js');
const { logErrorToS3 } = require('../utils/error-logger.js');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

const TAG = 'pan-adv-kyc-verification-api';

const localLogTemplate = {
  company_id: '',
  company_code: '',
  sub_company_code: '',
  vendor_name: 'KARZA',
  service_id: 0,
  api_name: '',
  raw_data: '',
  request_type: '',
  response_type: '',
  timestamp: 0,
  pan_card: null,
  document_uploaded_s3: '',
  api_response_type: 'JSON',
  api_response_status: '',
  kyc_id: '',
};

async function verifyRequestWithTemplate(templateS3url, s3LogData) {
  // 2. fetch upload template from s3
  const templateResponse = await s3helper.fetchJsonFromS3(
    templateS3url.substring(templateS3url.indexOf('services')),
  );
  if (!templateResponse)
    throw {
      message: 'Error while finding template from s3',
    };

  // 3. validate the incoming template data with customized template data
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
    throw {
      errorType: 999,
      message: 'No records found',
    };
  if (templateValidation.unknownColumns.length)
    throw {
      errorType: 999,
      message: templateValidation.unknownColumns[0],
    };
  if (templateValidation.missingColumns.length)
    throw {
      errorType: 999,
      message: templateValidation.missingColumns[0],
    };
  if (templateValidation.errorRows.length)
    throw {
      errorType: 999,
      message: Object.values(templateValidation.exactErrorColumns[0])[0],
    };
  return true;
}

function initLocalLogData(req, optionals = {}) {
  let localLogData = {
    ...localLogTemplate,
  };

  localLogData.company_id = req.company._id;
  localLogData.company_code = req.company.code;
  localLogData.sub_company_code = req.headers.company_code;
  localLogData.timestamp = Date.now();

  localLogData = {
    ...localLogData,
    ...optionals,
  };

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

async function checkRequest(body) {
  let errors = [];

  if (!body.ocr_image && !body.ocr_image_url && !body.ocr_image_b64) {
    if (!body.consent) {
      isValidRequest = false;
      errors.push('Please provide consent');
    } else if (!body.pan) {
      isValidRequest = false;
      errors.push(
        'Please provide pan or pan ocr or pan image url or pan image base64',
      );
    } else {
      if (!body.name) {
        isValidRequest = false;
        errors.push('Please provide name of the consumer');
      }
      if (!body.dob) {
        isValidRequest = false;
        errors.push('Please provide dob of the consumer');
      }
      if (!body.fathers_name) {
        isValidRequest = false;
        errors.push("Please provide father's name of the consumer");
      }
    }
  }
  return errors;
}

module.exports = (app) => {
  app.use(bodyParser.json());

  // api for pan-adv-kyc verification
  app.post(
    '/api/pan-adv-kyc',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_PAN_ADV_KYC_VERIFY_ID),
      verifyloanAppIdValidation,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const apiName = 'PAN-ADV-KYC';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const kycId = `${req.company.code}-${apiName}-${Date.now()}`;
      const kycData = {
        company_id: req.company._id,
        loan_app_id: req.body.loan_app_id,
        kyc_type: apiName,
        req_url: '',
        res_url: '',
        consent: req.body.consent,
        consent_timestamp: req.body.consent_timestamp,
        id_number: req.body.pan,
        created_at: Date.now(),
        created_by: req.company.code,
        request_id: requestId,
        kyc_id: kycId,
      };
      try {
        // validate api-request with service template
        const isValidated = await verifyRequestWithTemplate(
          req.service.file_s3_path,
          req.body,
        );
        if (!isValidated) {
          return;
        }

        let isValidRequest = true;
        let missingKeys = await checkRequest(req.body);
        isValidRequest = isValidRequest && !missingKeys.length;
        if (!isValidRequest) {
          throw {
            errorType: 999,
            message: 'Invalid request',
          };
        }

        // initialize local-logging object
        const localLogData = initLocalLogData(req, {
          service_id: process.env.SERVICE_PAN_ADV_KYC_VERIFY_ID,
          api_name: 'PAN-ADV-KYC',
          pan: req.body.pan,
          kyc_id: kycId,
        });

        if (req.body.consent === 'N') {
          localLogData.response_type = 'error';
          localLogData.api_response_status = 'FAIL';
        }

        // log received client-request
        await createLog(req.body, localLogData, true);
        kycData.req_url = localLogData.raw_data;

        if (req.body.consent === 'N') {
          throw {
            errorType: 999,
            message: 'Consent was not provided',
          };
        }

        const postData = {
          ...req.body,
          consent: 'Y',
          notification: {
            webhook: true,
            webhookConfig: {},
          },
        };

        // invoke third-party api
        const apiResponse = await axios.request({
          url: `${process.env.KARZA_URL}v3/kyc-advanced/pan`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-karza-key': process.env.KARZA_API_KEY,
          },
          data: postData,
        });

        localLogData.timestamp = Date.now();
        if (apiResponse && apiResponse.data) {
          // log received acknowledgement
          await createLog(apiResponse.data, localLogData, false);

          // save client-webhook details with reference into database
          const insertResult = await PanAdvKycVerifications.create({
            serviceRequestId: apiResponse.data.requestId,
            pan: req.body.pan,
            webhook: true,
            webhookUrl: '',
            webhookConfig: {},
          });

          // save api request-response details with reference into database
          if (apiResponse.data.statusCode == 101) {
            kycData.res_url = localLogData.raw_data;
            kycData.request_id = apiResponse.data.requestId;
            const insertResult = await KYCSchema.addNew(kycData);
          }

          // acknowledge client with the acknowledgement from panAdvKyc provider
          if (apiResponse.data.statusCode == 101) {
            return res.status(200).send({
              kyc_id: kycData.kyc_id,
              success: true,
              data: apiResponse.data,
            });
          } else {
            return res.status(400).send({
              kyc_id: kycData.kyc_id,
              success: false,
              data: apiResponse.data,
            });
          }
        } else {
          // log received acknowledgement
          await createLog(apiResponse, localLogData, false);

          // save api request-response details with reference into database
          kycData.res_url = localLogData.raw_data;
          kycData.request_id = requestId;
          const insertResult = await KYCSchema.addNew(kycData);
          return res.status(500).send(apiResponse);
        }
      } catch (error) {
        if (error.errorType)
          return res.status(400).send({
            status: 'fail',
            message: error.message,
          });
        logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
      }
    },
  );

  // webhook for pan-adv-kyc verification result
  app.post(
    '/api/pan-adv-kyc-hook',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_PAN_ADV_KYC_HOOK_ID),
      verifyloanAppIdValidation,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const apiName = 'PAN-ADV-KYC-HOOK';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      try {
        // read kyc info from databse
        const kycInfo = await PanAdvKycVerifications.findBySRI(
          req.body.requestId,
        );

        // initialize local-logging object
        const localLogData = initLocalLogData(req, {
          service_id: process.env.SERVICE_PAN_ADV_KYC_HOOK_ID,
          api_name: 'PAN-ADV-KYC-HOOK',
          pan_card: kycInfo.pan,
        });

        // log received hook-data
        await createLog(req.body, localLogData, true);

        // read pan result json from hookData
        const panJsonResult = req.body;

        if (panJsonResult) {
          // log received acknowledgement
          await createLog(panJsonResult, localLogData, false);

          // save client-webhook details with reference into database
          const insertResult = await PanAdvKycVerifications.updatePanJson(
            req.body.requestId,
            panJsonResult,
          );

          // call client hook with the result
          if (kycInfo.url) {
            const callResponse = await axios.request({
              headers: {
                'Content-Type': 'application/json',
              },
              ...kycInfo.webhookConfig,
              url: kycInfo.url,
              method: 'POST',
              data: req.body,
            });
          }

          // acknowledge provider with the acknowledgement from panAdvKyc provider
          return res.status(200).send({
            data: null,
            message: 'Hook data received successfully',
          });
        } else {
          logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
          return;
        }
      } catch (error) {
        logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
      }
    },
  );

  // get all pan-adv-kyc verification
  app.get(
    '/api/pan-adv-kyc-report',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_PAN_ADV_KYC_REPORT_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        const result = await PanAdvKycVerifications.findBySRI(
          req.query.request_id,
        );
        return res.status(200).send({
          data: result.panJsonResponse,
          status: result.status,
          message: 'Report fetched successfully!',
        });
      } catch (error) {
        logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
      }
    },
  );
};

const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { serviceLogging } = require('../service/service-logging.js');
const { errorLog } = require('../../../modules/third-party-api-services/controllers')
const serviceReqResLog = require('../../../models/service-req-res-log-schema.js')
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const BureauLogSchema = require('../../../models/bureau-data-schema.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js')
const { templateValidation } = require('../../../modules/third-party-api-services/validators')
const moment = require('moment');
const s3helper = require('../../../util/s3helper.js')

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  async function addBureauData(
    data,
    reqKey,
    resKey,
    company_id,
    status,
    company_code,
    requestID,
  ) {
    try {
      var req_data = {
        company_id: company_id,
        loan_app_id: data.loan_app_id,
        bureau_type: 'COMMERCIAL-CIBIL',
        req_url: reqKey,
        request_id: requestID,
        res_url: resKey,
        pan: data.id_id_number_1,
        status: status,
        consent: data.consent,
        consent_timestamp: data.consent_timestamp,
        created_by: company_code,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      var res = await BureauLogSchema.addNew(req_data);
      return res;
    } catch (err) {
      throw err;
    }
  }

  app.post(
    '/api/commercial-cibil-verification',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_COMMERCIAL_CIBIL_VERIFICATION_ID),
      verifyloanAppIdValidation,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const _apiReqTime = Date.now();
      const apiName = 'COMMERCIAL-CIBIL';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const serviceDetails = {
        vendor_name: 'TRANSUNION',
        api_name: apiName,
        service_id: process.env.SERVICE_COMMERCIAL_CIBIL_VERIFICATION_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
        response_type: '',
      };
      req.logData = {
        ...serviceDetails,
      };
      try {
        await templateValidation.validateTemplateData(
          req.service.file_s3_path,
          req.body,
        );

        // commercial cibil url
        const commercialCibilUrl = process.env.COMMERCIAL_CIBIL_URL;

        const directorTemplate = {
          name: "",
          relation_type: "",
          gender: "",
          pan: "",
          uid: "",
          voter_id: "",
          passport_num: "",
          driving_licence_id: "",
          din: "",
          dob: "",
          address: {
            addressType: "",
            addressLine1: "",
            city: "",
            state: "",
            pinCode: ""
          },
          telephone: [
            {
              telephoneType: "",
              telephone_num: "",
              contact_area: "",
              contact_prefix: ""
            }
          ]
        };

        //COMMERCIAL CIBIL API
        const commercialCibilData = {
          request: {
            header: {
              version: process.env.COMMERCIAL_CIBIL_VERSION,
              product_type: process.env.COMMERCIAL_CIBIL_PRODUCT_TYPE,
              user_id: process.env.COMMERCIAL_CIBIL_USER_ID,
              user_password: process.env.COMMERCIAL_CIBIL_USER_PASSWORD,
              member_code: process.env.COMMERCIAL_CIBIL_MEMBER_CODE,
              member_KOB: process.env.COMMERCIAL_CIBIL_MEMBER_KOB,
              member_reference_number: process.env.COMMERCIAL_CIBIL_MEMBER_REFERENCE_NUMBER,
              report_type: process.env.COMMERCIAL_CIBIL_REPORT_TYPE,
              output_format: process.env.COMMERCIAL_CIBIL_OUTPUT_FORMAT,
              api_version: process.env.COMMERCIAL_CIBIL_API_VERSION
            },
            search_data: {
              general_fields: {
                enquiry_amount: req.body.enquiry_amount,
                enquiry_purpose: req.body.enquiry_purpose,
                enquiry_type: req.body.enquiry_type,
                type_of_entity: req.body.type_of_entity,
                date_of_registration: req.body.date_of_registration || "",
                cmr_flag: process.env.COMMERCIAL_CIBIL_CMR_FLAG,
                class_of_activity: req.body.class_of_activity,
              },
              company_name: {
                name: req.body.company_name,
              },
              contact: {
                address: [
                  {
                    addressLine1: req.body.add_line1_1,
                    city: req.body.city,
                    state: req.body.add_state_code_1,
                    pinCode: req.body.add_pin_code_1,
                    addressType: req.body.add_address_category_1,
                  },
                ],
                telephone: {
                  telephoneType: "",
                  telephone_num: "",
                  contact_area: "",
                  contact_prefix: "",
                },
              },
              id: {
                pan: req.body.id_id_number_1,
                cin: req.body.cin || "",
                crn: req.body.crn || "",
                tin: req.body.tin || "",
              },
              directors: {
                director: [Object.assign({}, directorTemplate), Object.assign({}, directorTemplate)]
              }
            }
          }
        };

        const commercialCibilPostData = JSON.parse(JSON.stringify(commercialCibilData))
        const loggingDataToS3 = {
          req_body_from_user: req.body,
          req_body_to_cibil: commercialCibilPostData
        }

        // Caching mechanism for getting request data from server.
        var cachedBureau = await BureauLogSchema.findIfExists(
          req.body.loan_app_id,
          req.body.id_id_number_1,
          'SUCCESS',
          'COMMERCIAL-CIBIL',
        );
        if (cachedBureau[0]) {
          var cachedUrl = cachedBureau[0].res_url;
          const xmlS3Response = await s3helper.fetchJsonFromS3(
            cachedUrl.substring(cachedUrl.indexOf(cachedBureau[0].bureau_type)),
          );

          serviceDetails.raw_data = cachedUrl;
          serviceDetails.is_cached_response = 'TRUE';
          //insert request data to S3
          await serviceLogging(loggingDataToS3, req, 'request');
          //insert response data to S3
          await serviceLogging(xmlS3Response, req, 'response');
          return res.status(200).send({
            request_id: requestId,
            result: xmlS3Response,
            success: true,
          });
        }

        if (req.body.consent === 'N') {
          serviceDetails.request_type = 'request';
          serviceDetails.response_type = 'error';
        }
        // Upload request to AWS S3
        await serviceLogging(loggingDataToS3, req, 'request');
        const fetchReqRawData = await serviceReqResLog.findByIdAndReqandResTypeAndAPIName(requestId, apiName, 'request', 'success')

        if (req.body.consent === 'N') {
          return res.status(400).send({
            request_id: requestId,
            message: 'Consent was not provided',
          });
        }

        const commercialCibilResponse = (
          await axios.request({
            url: commercialCibilUrl,
            data: commercialCibilPostData,
            headers: {
              'Content-Type': 'application/json',
              'member-ref-id': process.env.COMMERCIAL_CIBIL_MEMBER_REFERENCE_NUMBER,
              'cust-ref-id': process.env.COMMERCIAL_CIBIL_CUSTOMER_REFERENCE_ID,
              'apikey': process.env.COMMERCIAL_CIBIL_API_KEY,
              'Accept': 'application/json'
            },
            method: 'POST',
            httpsAgent: new https.Agent({
              passphrase: process.env.COMMERCIAL_CIBIL_CERT_PASSWORD,
              pfx: fs.readFileSync(process.env.COMMERCIAL_CIBIL_CERTIFICATE_PATH),
              rejectUnauthorized: false,
              keepAlive: true,
            }),
          }))?.data;
        console.log("cibil response", commercialCibilResponse);
        let _apiResTime = Date.now() - _apiReqTime;
        req.logData.api_response_time = _apiResTime;
        req.logData.api_status_code = 200;
        //Upload response to AWS S3
        await serviceLogging(commercialCibilResponse, req, 'response');
        const fetchRespRawData = await serviceReqResLog.findByIdAndReqandResTypeAndAPIName(requestId, apiName, 'response', 'success')

        const respErrorIssue = commercialCibilResponse?.base?.responseReport?.reportIssuesVec;

        if (!respErrorIssue) {
          await addBureauData(
            req.body,
            fetchReqRawData.raw_data,
            fetchRespRawData.raw_data,
            req.company._id,
            'SUCCESS',
            req.company.code,
            requestId,
          );
          return res.status(200).send({
            request_id: requestId,
            result: commercialCibilResponse,
            success: true,
          });
        } else if (respErrorIssue) {
          return res.status(200).send({
            request_id: requestId,
            result: commercialCibilResponse,
            success: true,
          });
        } else {
          throw {
            message: "Something went wrong",
          }
        }
      } catch (error) {
        console.log('commercial cibil verification error: ' + error);
        let _apiResTime = Date.now() - _apiReqTime;
        req.logData.api_response_time = _apiResTime;
        error.request_id = requestId;
        await errorLog(error, req, res);
      }
    },
  );
};
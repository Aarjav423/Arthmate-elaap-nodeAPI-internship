const bodyParser = require('body-parser');
const s3helper = require('../util/s3helper.js');
const validate = require('../util/validate-req-body.js');
var bureauService = require('../models/service-req-res-log-schema');
const jwt = require('../util/jwt');
const services = require('../util/service');
const axios = require('axios');
const mca = require('../modules/third-party-api-services/models/webhook-schema.model.js');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');
const { logErrorToS3 } = require('../utils/error-logger.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/mca-docs-request-details',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(
        process.env.SERVICE_MCA_REQUEST_DETAILS_ID,
      ),
      verifyloanAppIdValidation,
    ],
    async (req, res, next) => {
      const apiName = 'MCA-DOCS';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      try {
        const data = req.body;
        const s3url = req.service.file_s3_path;
        const jsonS3Response = await s3helper.fetchJsonFromS3(
          s3url.substring(s3url.indexOf('services')),
        );
        if (!jsonS3Response) {
          throw {
            message: 'Error while finding template from s3',
          };
        }
        //validate the incoming template data with customized template data
        const resValDataTemp = validate.validateDataWithTemplate(
          jsonS3Response,
          [data],
        );

        if (resValDataTemp.missingColumns.length) {
          resValDataTemp.missingColumns = resValDataTemp.missingColumns.filter(
            (x) => x.field != 'sub_company_code',
          );
        }

        if (!resValDataTemp)
          throw {
            errorType: 999,
            message: 'No records found',
          };
        if (resValDataTemp.unknownColumns.length)
          throw {
            errorType: 999,
            message: resValDataTemp.unknownColumns[0],
          };
        if (resValDataTemp.missingColumns.length)
          throw {
            errorType: 999,
            message: resValDataTemp.missingColumns[0],
          };
        if (resValDataTemp.errorRows.length)
          throw {
            errorType: 999,
            message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
          };
        //generic data to be stored in database(request data / response data)

        //MCA data
        const mcaApiData = {
          entityId: req.body.entity_id,
          docType: req.body.doc_type,
          financialYear: req.body.financial_year,
          periodFrom: req.body.period_from,
          periodTo: req.body.period_to,
          fileFormat: req.body.file_format,
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
          loan_app_id: req.body.loan_app_id,
          webhook: true,
        };
        //MCA url
        const url = process.env.KSCAN_BASE_URL + 'v1/corp/docs/request-details';
        //X-MCA-key
        const key = process.env.KSCAN_API_KEY;
        //Headers
        const config = {
          headers: {
            'x-karza-key': key,
            'Content-Type': 'application/json',
          },
        };
        var mcaData = {
          company_id: req.company && req.company._id ? req.company._id : null,
          company_code:
            req.company && req.company.code ? req.company.code : null,
          vendor_name: 'Karza',
          service_id: process.env.SERVICE_MCA_REQUEST_DETAILS_ID,
          api_name: 'MCA-DOCS-REQUEST-DETAILS',
          raw_data: '',
          response_type: '',
          request_type: '',
          timestamp: Date.now(),
          id_number: req.body.entity_id,
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
          loan_app_id: req.body.loan_app_id,
          document_uploaded_s3: '',
          api_response_type: 'JSON',
          api_response_status: '',
          request_id:
            req.company.code +
            '-' +
            'MCA-DOCS-REQUEST-DETAILS' +
            '-' +
            Date.now(),
        };
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${mcaData.api_name}/${mcaData.vendor_name}/${mcaData.company_id}/${filename}/${mcaData.timestamp}.txt`;
        //upload request data on s3
        const uploadResponse = await s3helper.uploadFileToS3(req.body, reqKey);
        if (!uploadResponse) {
          (mcaData.document_uploaded_s3 = 0), (mcaData.response_type = 'error');
        } else {
          mcaData.document_uploaded_s3 = 1;
          mcaData.response_type = 'success';
        }
        mcaData.api_response_status = 'SUCCESS';
        mcaData.raw_data = uploadResponse.Location;
        mcaData.request_type = 'request';
        if (req.body.consent === 'N') {
          mcaData.response_type = 'error';
          mcaData.api_response_status = 'FAIL';
        }
        //insert request data s3 upload response to database
        const addResult = await bureauService.addNew(mcaData);
        if (!addResult)
          throw {
            message: 'Error while adding request data',
          };
        if (req.body.consent === 'N') {
          throw {
            errorType: 999,
            message: 'Invalid request',
          };
        }
        //call mca api after successfully uploading request data to s3
        axios
          .post(url, JSON.stringify(mcaApiData), config)
          .then(async (response) => {
            //response data from mca to upload on s3
            filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${mcaData.api_name}/${mcaData.vendor_name}/${mcaData.company_id}/${filename}/${mcaData.timestamp}.txt`;
            const insertResult = await mca.create({
              request_id: mcaData.request_id,
              service_request_id: response.data.requestId,
              is_webhook_received: mcaApiData.webhook,
              loan_app_id: req.body.loan_app_id,
              api_name: mcaData.api_name,
            });
            //upload response data from karza on s3
            const uploadS3FileRes = await s3helper.uploadFileToS3(
              response.data,
              resKey,
            );
            if (!uploadS3FileRes) {
              (mcaData.document_uploaded_s3 = 0),
                (mcaData.response_type = 'error');
            } else {
              mcaData.document_uploaded_s3 = 1;
              mcaData.response_type = 'success';
            }
            mcaData.raw_data = await uploadS3FileRes.Location;
            mcaData.request_type = 'response';
            if (response.data['status_code'] == 101) {
              (mcaData.api_response_status = 'SUCCESS'),
                (mcaData.kyc_id = mcaData.request_id);
            } else {
              mcaData.api_response_status = 'FAIL';
            }
            //insert response data s3 upload response to database
            const mcaDataResp = await bureauService.addNew(mcaData);
            if (!mcaDataResp)
              throw {
                message: 'Error while adding response data to database',
              };
            // //send final response
            return res.send({
              request_id: mcaData.request_id,
              statusCode: response.data.statusCode,
              result: response.data.result,
            });
          })
          .catch((error) => {
            //handle error catched from mca api
            let err = error.response
              ? error.response.data
                ? error.response.data
                : error.response
              : error;
            return res.status(400).json(err);
          });
      } catch (error) {
        if (error.errorType)
          return res.status(400).send({
            status: 'fail',
            message: error.message,
          });
        await logErrorToS3(req, res, requestId, apiName, 'KARZA', error);
      }
    },
  );

  app.post(
    '/api/mca-webhook',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_MCA_KYC_HOOK_ID),
    ],
    async (req, res, next) => {
      const apiName = 'MCA-DOCS';
      try {
        const mcaJsonResult = req.body;
        if (!req.body.requestId) {
          throw {
            message: 'Please enter request id',
          };
        }
        const mcaInfo = await mca.findBySRI(req.body.requestId);
        var mcaData = {
          company_id: req.company && req.company._id ? req.company._id : null,
          company_code:
            req.company && req.company.code ? req.company.code : null,
          vendor_name: 'Karza',
          service_id: process.env.SERVICE_MCA_KYC_HOOK_ID,
          api_name: 'MCA-WEBHOOK',
          raw_data: '',
          response_type: '',
          request_type: '',
          timestamp: Date.now(),
          id_number: req.body.entity_id,
          document_uploaded_s3: '',
          api_response_type: 'JSON',
          api_response_status: '',
        };
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${mcaData.api_name}/${mcaData.vendor_name}/${mcaData.company_id}/${filename}/${mcaData.timestamp}.txt`;
        //upload request data on s3
        const uploadResponse = await s3helper.uploadFileToS3(req.body, reqKey);
        if (!uploadResponse) {
          (mcaData.document_uploaded_s3 = 0), (mcaData.response_type = 'error');
        }
        mcaData.document_uploaded_s3 = 1;
        mcaData.response_type = 'success';
        mcaData.api_response_status = 'SUCCESS';
        mcaData.raw_data = uploadResponse.Location;
        mcaData.request_type = 'request';
        //insert request data s3 upload response to database
        const addResult = await bureauService.addNew(mcaData);
        if (!addResult)
          throw {
            message: 'Error while adding request data',
          };
        if (mcaJsonResult) {
          filename = Math.floor(10000 + Math.random() * 99999) + '_hook_res';
          const resKey = `${mcaData.api_name}/${mcaData.vendor_name}/${mcaData.company_id}/${filename}/${mcaData.timestamp}.txt`;
          const uploadResponse = await s3helper.uploadFileToS3(mcaJsonResult, resKey);
          const insertResult = await mca.updateWebhookJson(
            req.body.requestId,
            uploadResponse.Location,
          );

          // call client hook with the result
          if (mcaInfo.url) {
            const clientHookResponse = await axios.request({
              headers: {
                'Content-Type': 'application/json',
              },
              ...mcaInfo.webhookConfig,
              url: mcaInfo.url,
              method: 'POST',
              data: req.body,
            });

            // save client-ack-response into database
            const clientAckInsert = await mca.updateClientAck(
              req.body.requestId,
              clientHookResponse.data,
            );
          }

          // acknowledge provider with the acknowledgement from panAdvKyc provider
          return res.status(200).send({
            data: null,
            message: 'Hook data received successfully',
          });
        } else {
          return await logErrorToS3(
            req,
            res,
            req.body.requestId,
            apiName,
            'KARZA',
            'Data should not be empty',
          );
        }
      } catch (error) {
        await logErrorToS3(
          req,
          res,
          req.body.requestId,
          apiName,
          'KARZA',
          error,
        );
      }
    },
  );

  app.get(
    '/api/mca-report',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_MCA_REPORT_ID),
    ],
    async (req, res) => {
      try {
        if (!req.query.request_id) {
          throw {
            message: 'Please enter request id',
          };
        }
        const result = await mca.findByRI(req.query.request_id);
        const resultUrl = result.webhook_response;
        const s3_url = resultUrl;
        const regexUrl = /com\/([^\.]+)\//;
        const output = s3_url.match(regexUrl);
        const urlIndex = output[1];
        const key = s3_url.substring(s3_url.indexOf(urlIndex));
        const resultJson = await s3helper.fetchJsonFromS3(key);
        if (result.status == 'COMPLETED') {
          return res.status(200).send({
            status: result.status,
            data: resultJson,
            message: 'Reports fetched successfully!',
          });
        }
        if (result.status == 'PENDING') {
          return res.status(200).send({
            status: result.status,
            message: 'Status is still pending!!',
          });
        } else {
          throw {
            message: 'Something went wrong',
            success: false,
          };
        }
      } catch (error) {
        res.status(404).send({
          message: error.message
            ? error.message
            : 'Request ID not found! Please enter valid request ID',
          status: 'fail',
        });
      }
    },
  );
};

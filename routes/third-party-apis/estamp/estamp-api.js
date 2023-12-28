const bodyParser = require('body-parser');
const {
  uploadLogsToS3: uploadBase64ToS3,
  getSignedUrl,
} = require('../utils/aws-s3-helper');
const loanDocumentCommonSchema = require('../../../models/loandocument-common-schema.js');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const {
  verifyloanAppIdValidation,
} = require('../../../util/loan-app-id-validation.js');
const stampedDocSchema = require('../../../models/third-party-schema/estamp/estamp-document-schema.js');
const { validateTemplateData } = require('../service/template-validation.js');
const {
  serviceLogging,
  handleError,
} = require('../service/service-logging.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/e-stamp',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_E_STAMP_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const apiName = 'E-STAMP';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const serviceDetails = {
        vendor_name: 'RKS',
        api_name: apiName,
        service_id: process.env.SERVICE_E_STAMP_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
      };
      req.logData = {
        ...serviceDetails,
      };
      try {
        //validate the incoming template data with customized template data
        await validateTemplateData(req);

        //E-STAMP API
        const dataEstamp = {
          reference_id: requestId,
          first_party_name: req.body.first_party_name,
          second_party_name: req.body.second_party_name,
          duty_payer_phone_number: req.body.duty_payer_phone_number.toString(),
          first_party_address: {
            street_address: req.body.first_party_address_street_address,
            locality: req.body.first_party_address_locality,
            city: req.body.first_party_address_city,
            pin_code: req.body.first_party_address_pin_code.toString(),
            state: req.body.first_party_address_state,
            country: req.body.first_party_address_country,
          },
          second_party_address: {
            street_address: req.body.second_party_address_street_address,
            locality: req.body.second_party_address_locality,
            city: req.body.second_party_address_city,
            pin_code: req.body.second_party_address_pin_code.toString(),
            state: req.body.second_party_address_state,
            country: req.body.second_party_address_country,
          },
          stamp_amount: req.body.stamp_amount,
          consideration_amount: req.body.consideration_amount,
          stamp_duty_paid_by_gender:
            req.body.stamp_duty_paid_by_gender.toUpperCase(),
          first_party_mail: req.body.first_party_mail,
          first_party_mobile: req.body.first_party_mobile.toString(),
          second_party_mail: req.body.second_party_mail,
          second_party_mobile: req.body.second_party_mobile.toString(),
          base64pdfencodedfile: req.body.base64pdfencodedfile,
          loan_app_id: req.body.loan_app_id,
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
        };
        // Upload request to AWS S3
        await serviceLogging(dataEstamp, req, 'request');

        // Check if both inputs exist
        if (req.body.loan_app_id && req.body.base64pdfencodedfile) {
          const filename = `${req.logData.api_name}/${
            req.logData.vendor_name
          }/${req.company._id}/${requestId}/${Date.now()}.txt`;
          const url = (
            await Promise.all([
              uploadBase64ToS3(req.body.base64pdfencodedfile, filename),
            ])
          )[0].Location;

          const loggingData = {
            ...dataEstamp,
            request_id: requestId,
            s3_url: url,
            stage: 1,
          };
          await stampedDocSchema.insertIntoDb(loggingData);
        } else if (req.body.loan_app_id) {
          const s3UrlUpload = (
            await loanDocumentCommonSchema.findByCodeAndLoanAppID(
              process.env.E_STAMP_DOC_CODE,
              req.body.loan_app_id,
            )
          )?.file_url;
          if (!s3UrlUpload) {
            throw {
              errorType: 99,
              message: 'Data not found for this loan app id',
            };
          }
          const loggingData = {
            ...dataEstamp,
            request_id: requestId,
            s3_url: s3UrlUpload,
            stage: 1,
          };
          await stampedDocSchema.insertIntoDb(loggingData);
        } else if (req.body.base64pdfencodedfile) {
          const filename = `${req.logData.api_name}/${
            req.logData.vendor_name
          }/${req.company._id}/${requestId}/${Date.now()}.txt`;
          const url = (
            await Promise.all([
              uploadBase64ToS3(req.body.base64pdfencodedfile, filename),
            ])
          )[0].Location;

          const loggingData = {
            ...dataEstamp,
            request_id: requestId,
            s3_url: url,
            stage: 1,
          };
          await stampedDocSchema.insertIntoDb(loggingData);
        } else if (!req.body.loan_app_id && !req.body.base64pdfencodedfile) {
          throw {
            message: 'Enter either loan_app_id or base64pdfencodedfile',
            errorType: 999,
          };
        }
        const s3FileUrl = (await stampedDocSchema.findByReqId(requestId))
          ?.s3_url;
        const respToUpload = {
          request_id: requestId,
          s3_url: s3FileUrl,
        };
        await serviceLogging(respToUpload, req, 'response');

        res.status(200).send({
          request_id: requestId,
          message: `Your request has been successfully registered. Please check after sometime.`,
        });
      } catch (error) {
        error.request_id = requestId;
        await handleError(error, req, res);
      }
    },
  );

  //GET E-STAMP DOC API
  app.get(
    '/api/e-stamp-docs/:id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_E_STAMP_DOC_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      // Global data for logging
      const requestId = req?.params?.id;
      const serviceDetails = {
        vendor_name: 'RKS',
        api_name: 'E-STAMP',
        service_id: process.env.SERVICE_E_STAMP_DOC_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
      };
      req.logData = {
        ...serviceDetails,
      };
      try {
        await serviceLogging(requestId, req, 'request');
        const request_id = (await stampedDocSchema.findByReqId(requestId))
          ?.request_id;
        if (!request_id) {
          throw {
            errorType: 99,
            message: 'Request Id does not exist',
          };
        }
        const signedUrl = (await stampedDocSchema.findByReqId(requestId))
          ?.signed_estamp_s3_url;
        if (signedUrl) {
          const cachedUrl = signedUrl;
          req.logData.is_cached_response = 'TRUE';
          return res.status(200).send({
            request_id: requestId,
            status: 'success',
            s3_file_url: cachedUrl,
          });
        }
        const stampedS3Url = (await stampedDocSchema.findByReqId(requestId))
          ?.estamp_s3_url;
        if (!stampedS3Url) {
          throw {
            message: 'E-Stamping pending, please retry later',
            errorType: 999,
          };
        }
        const stage = (await stampedDocSchema.findByReqId(requestId))?.stage;
        let index = stampedS3Url?.indexOf('.com/');
        let filename = stampedS3Url?.substring(index + 5);
        const signedStampedUrl = await getSignedUrl(filename);
        // Upload request to AWS S3
        if (stampedS3Url) {
          await stampedDocSchema.updateStage(
            request_id,
            stage + 1,
            signedStampedUrl,
          );
          return res.status(200).send({
            request_id: requestId,
            status: 'success',
            s3_file_url: signedStampedUrl,
          });
        } else if (stage === 0) {
          throw {
            message: 'E-Stamping failed, please contact administrator',
            errorType: 999,
          };
        }
      } catch (error) {
        error.request_id = requestId;
        await handleError(error, req, res);
      }
    },
  );
};

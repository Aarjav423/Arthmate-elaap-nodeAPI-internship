const axios = require('axios');
const AccessLog = require('../util/accessLog');
const { check, validationResult } = require('express-validator');
const aadharOffline = require('../models/aadhar-offline-schema');
const helper = require('../util/helper.js');
const jwt = require('../util/jwt');
const reqUtils = require('../util/req');
const services = require('../util/service');
const moment = require('moment');
const validate = require('../util/validate-req-body.js');
var bureauService = require('../models/service-req-res-log-schema.js');
const ekycProcess = require('../models/ekyc_process_store_schema');
const ekycDataFields = require('../models/ekyc_data_fields_schema');
// const uiUtils = require("../util/ui");
// const appendQuery = require("append-query");
const LoanRequestSchema = require('../models/loan-request-schema.js');
var gatewayPrefix = process.env.GATEWAY_PREFIX || '';
const jwtLib = require('jsonwebtoken');
const pdf2base64 = require('pdf-to-base64');
// var pdf = require('html-pdf');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const BorrowerInfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const s3helper = require('../util/s3helper');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const hv_base_url = process.env.HV_BASE_URL;
  const appId = process.env.HV_APP_ID;
  const appKey = process.env.HV_APP_KEY;

  app.get(
    '/api/get_aadhaar_captcha',
    //    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, services.isServiceEnabled(process.env.SERVICE_GET_CAPTCHA),
    //     AccessLog.maintainAccessLog],
    (req, res, next) => {
      var options = {
        method: 'GET',
        url: hv_base_url + '/api/v1/captcha',
        headers: {
          appId: appId,
          appKey: appKey,
          'content-type': 'appplication/json',
        },
      };
      axios(options)
        .then((response) =>
          reqUtils.json(req, res, next, 200, {
            success: true,
            data: response.data,
          }),
        )
        .catch((error) =>
          reqUtils.json(req, res, next, 400, {
            success: false,
            error: error,
          }),
        );
    },
  );

  app.post(
    '/api/verify_aadhaar_captcha_and_get_otp',
    //   [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, services.isServiceEnabled(process.env.SERVICE_GET_XML_OTP),
    //     AccessLog.maintainAccessLog],
    async (req, res, next) => {
      const reqData = req.body;
      try {
        const url =
          'https://elaap-loan-docs-sandbox.s3.amazonaws.com/services/AADHAAR-XML-GET-VERIFY-OTP.txt' ||
          req.service.file_s3_path;
        const resJsonRes = await s3helper.fetchJsonFromS3(
          url.substring(url.indexOf('services')),
        );
        if (!resJsonRes)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Error while finding temlate from s3',
            error: {
              error: 'Error while finding temlate from s3',
            },
          });
        //validate the incoming template data with customized template data
        const validateRes = validate.validateDataWithTemplate(resJsonRes, [
          reqData,
        ]);
        if (!validateRes)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'No records found',
            message: 'No records found',
            error: {
              error: 'No records found',
            },
          });
        if (validateRes.unknownColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateRes.unknownColumns[0],
            error: {
              error: validateRes.unknownColumns[0],
            },
          });
        if (validateRes.missingColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateRes.missingColumns[0],
            error: {
              error: validateRes.missingColumns[0],
            },
          });
        if (validateRes.errorRows.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateRes.exactErrorColumns[0],
            error: {
              error: validateRes.exactErrorColumns[0],
            },
          });
        if (validateRes.errorRows.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateRes.exactErrorColumns[0],
            error: {
              error: validateRes.exactErrorColumns[0],
            },
          });
        if (validateRes.validatedRows) {
          const postData = {
            sessionId: reqData.sessionId,
            securityCode: reqData.securityCode,
            aadhaar: reqData.aadhaar,
          };
          const data = JSON.stringify(postData);
          const config = {
            method: 'post',
            url: hv_base_url + '/api/v1/captcha',
            headers: {
              appId: appId,
              appKey: appKey,
              'content-type': 'application/json',
            },
            data: data,
          };
          axios(config)
            .then((response) => {
              const data = {
                security_code: reqData.securityCode,
                aadhar_number: reqData.aadhaar,
              };
              return reqUtils.json(req, res, next, 200, {
                success: true,
                data: response.data,
              });
            })
            .catch((error) =>
              reqUtils.json(req, res, next, 400, {
                success: false,
                error: error.response.data,
              }),
            );
        }
      } catch (error) {
        console.log('Error', error);
      }
    },
  );

  app.post(
    '/api/aadhar_xml',
    // [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, services.isServiceEnabled(process.env.SERVICE_AADHAAR_XML_ID),
    // AccessLog.maintainAccessLog],
    async function (req, res, next) {
      const data = req.body;
      try {
        const url =
          'https://elaap-loan-docs-sandbox.s3.amazonaws.com/services/AADHAAR-XML.txt' ||
          req.service.file_s3_path;
        const resJsonRes = await s3helper.fetchJsonFromS3(
          url.substring(url.indexOf('services')),
        );
        if (!resJsonRes)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Error while finding temlate from s3',
            error: {
              error: 'Error while finding temlate from s3',
            },
          });
        //validate the incoming template data with customized template data
        const validateDataRes = validate.validateDataWithTemplate(resJsonRes, [
          data,
        ]);
        if (!validateDataRes)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'No records found',
            error: {
              error: 'No records found',
            },
          });
        if (validateDataRes.unknownColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateDataRes.unknownColumns[0],
            error: {
              error: validateDataRes.unknownColumns[0],
            },
          });
        if (validateDataRes.missingColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateDataRes.missingColumns[0],
            error: {
              error: validateDataRes.missingColumns[0],
            },
          });
        if (validateDataRes.errorRows.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: validateDataRes.missingColumns[0],
            error: {
              error: validateDataRes.exactErrorColumns[0],
            },
          });
        if (validateDataRes.validatedRows) {
          const requestData = req.body;
          const postData = {
            sessionId: requestData.sessionId,
            otp: requestData.otp,
            referenceId: requestData.referenceId,
            shareCode: requestData.shareCode,
            fileUrl: true,
          };
          const data = JSON.stringify(postData);
          const config = {
            method: 'post',
            url: hv_base_url + '/api/v1/otp',
            headers: {
              appId: appId,
              appKey: appKey,
              'content-type': 'application/json',
            },
            data: data,
          };
          const company_id = '49' || req.company.id;
          const company_code = 'PHO0001' || req.company.code;
          const dates = moment().format('YYYY-MM-DD');
          const objData = {
            company_id: company_id,
            company_code: company_code,
            vendor_name: 'HYPERVERGE',
            api_name: 'AADHAAR-XML',
            service_id: process.env.SERVICE_AADHAAR_XML_ID,
            response_type: 'success',
            request_type: 'request',
            timestamp: dates,
            raw_data: '',
            kyc_id: '',
            document_uploaded_s3: '1',
            api_response_type: 'JSON',
            api_response_status: 'SUCCESS',
          };
          let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
          const reqKey = `${objData.api_name}/${objData.vendor_name}/${objData.company_id}/${filename}/${objData.timestamp}.txt`;
          const uploadS3Response = s3helper.uploadFileToS3(req.body, reqKey);
          objData.document_uploaded_s3 = 1;
          objData.response_type = 'success';
          if (!uploadS3Response) {
            (objData.document_uploaded_s3 = 0),
              (objData.response_type = 'error');
          }
          objData.raw_data = uploadS3Response.Location;
          //insert request data s3 upload response to database
          const addRes = await bureauService.addNew(objData);
          if (!addRes)
            return reqUtils.json(req, res, next, 200, {
              message: 'Error while adding request data',
              success: false,
            });
          objData.kyc_id = `${
            'PHO0001' || req.company.code
          }-KUDOS_HV_ADHAR_NO-${Date.now()}`;
          //call hyperverge aadhaar api after successfully uploading request data to s3
          console.log('config', config);
          await axios(config)
            .then(function (HVResponse) {
              console.log('HVResponse', HVResponse);
              //response data from hyperverge to upload on s3
              filename = Math.floor(10000 + Math.random() * 99999) + '_res';
              const resKey = `${objData.api_name}/${objData.vendor_name}/${objData.company_id}/${filename}/${objData.timestamp}.txt`;
              const selfieKey = `${objData.api_name}/${objData.vendor_name}/selfie/${objData.company_id}/${filename}/${objData.timestamp}.txt`;
              const s3UploadFile = s3helper.uploadFileToS3(
                HVResponse.data.details.photo.value,
                selfieKey,
              );
              if (!s3UploadFile)
                return reqUtils.json(req, res, next, 200, {
                  message: 'Error while uploading selfie to s3 bucket.',
                  success: false,
                });
              //upload response data from hyperverge on s3
              const s3UploadRefId = helper.uploadFileToS3(
                HVResponse.data.details.referenceId,
                resKey,
              );
              if (!s3UploadRefId) {
                (objData.document_uploaded_s3 = 0),
                  (objData.response_type = 'error');
              }
              objData.document_uploaded_s3 = 1;
              objData.response_type = 'success';
              objData.raw_data = s3UploadRefId.Location;
              objData.request_type = 'response';
              objData.api_response_status =
                HVResponse.data.statusCode == 200 ? 'SUCCESS' : 'FAIL';
              //insert call ekyc check
              const address = HVResponse.data.details.address;
              const data = {
                ekyc_type: objData.api_name,
                company_id: objData.company_id,
                kyc_vendor: objData.vendor_name,
                status: objData.api_response_status,
                loan_id: requestData.loan_id || null,
                name: HVResponse.data.details.name.value || '',
                dob:
                  HVResponse.data.details.dob.value
                    .split('-')
                    .reverse()
                    .join('-') || '',
                state: address.state || '',
                city: address.district || '',
                pincode: address.pin || '',
                doc_id: HVResponse.data.details.maskedAadhaarNumber || '',
                address: [
                  address.house,
                  address.locality,
                  address.street,
                  address.vtc,
                  address.postoffice,
                  address.district,
                  address.country,
                ]
                  .filter(Boolean)
                  .join(', '),
                aadhaar_kyc_id: objData.kyc_id,
                doc_s3_url: s3UploadFile.Location,
              };
              const addEkycRes = ekycDataFields.addNew(data);
              if (!addEkycRes)
                return reqUtils.json(req, res, next, 200, {
                  message: 'Error while adding ekyc data',
                  success: false,
                });
              var resultFilename =
                objData.response_type === 'success' ? 'success' : 'fail';
              const responseStoragePath = `${objData.api_name}/${objData.service_id}/${objData.company_id}/${objData.company_code}/${resultFilename}/${req.dev.id}.json`;
              const uploadResponse = helper.uploadFileToS3(
                data,
                responseStoragePath,
              );
              if (!uploadResponse)
                reqUtils.loggerWinston.error({
                  message: `Error while uploading response data to s3 - ${responseStoragePath}`,
                  success: false,
                });
              reqUtils.loggerWinston.info({
                message: `file uploaded successfully :- ${uploadResponse.Location}`,
              });

              //insert response data s3 upload response to database
              const addSerRes = bureauService.addNew(objData);
              if (!addSerRes)
                return reqUtils.json(req, res, next, 422, {
                  message: 'Error while adding response data to database',
                  success: false,
                });
              if (
                typeof requestData.loan_id !== 'undefined' &&
                requestData.loan_id !== ''
              ) {
                console.log('-----req.originalUrl-----', req.originalUrl);
                const lrResp = LoanRequestSchema.findByKLId(
                  LoanRequestSchema.ReadOnly,
                )(requestData.loan_id);
                if (lrResp) {
                  const resp = helper.verifyEkycFields(
                    requestData.loan_id,
                    lrResp,
                  );
                  if (!resp)
                    return reqUtils.json(req, res, next, 422, {
                      message: 'Error while finding Ekyc field in database',
                      success: false,
                    });
                  const token = jwtLib.sign(
                    {
                      company_id: lrResp.company_id,
                      loan_schema_id: lrResp.loan_schema_id,
                      product_id: lrResp.product_id,
                      type: 'dash-api',
                      environment: process.env.ENVIRONMENT,
                    },
                    process.env.SECRET_KEY,
                  );
                  const borroResp = BorrowerInfoCommonSchema.findOneData(
                    requestData.loan_id,
                  );
                  if (!borroResp)
                    return reqUtils.json(req, res, next, 200, {
                      kyc_id: addSerRes.kyc_id,
                      data: HVResponse.data,
                      success: true,
                    });
                  let name = Date.now();
                  var pngFileName = `./${name}.png`;
                  var base64Data = HVResponse.data.details.photo.value;
                  fs.writeFile(
                    pngFileName,
                    base64Data,
                    'base64',
                    function (err) {
                      if (err)
                        return reqUtils.json(req, res, next, 200, {
                          kyc_id: addSerRes.kyc_id,
                          data: HVResponse.data,
                          success: true,
                        });
                      const doc = new PDFDocument({
                        size: 'A4',
                      });
                      doc.image(pngFileName, {
                        fit: [500, 400],
                        align: 'center',
                        valign: 'center',
                      });
                      doc
                        .pipe(fs.createWriteStream(`./${name}.pdf`))
                        .on('finish', function (err) {
                          fs.unlink(`./${name}.png`, (errUnlinkHtml) => {
                            if (errUnlinkHtml)
                              return reqUtils.json(req, res, next, 200, {
                                kyc_id: result.kyc_id,
                                data: HVResponse.data,
                                success: true,
                              });
                          });
                          pdf2base64(`./${name}.pdf`)
                            .then((pdfResp) => {
                              fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
                                if (errUnlinkHtml)
                                  return reqUtils.json(req, res, next, 200, {
                                    kyc_id: result.kyc_id,
                                    data: HVResponse.data,
                                    success: true,
                                  });
                              });
                              let submitdata = {
                                base64pdfencodedfile: pdfResp,
                                fileType: 'selfie',
                                loan_id: lrResp.loan_id,
                                kudos_borrower_id: lrResp.kudos_borrower_id,
                                partner_loan_id: lrResp.partner_loan_id,
                                partner_borrower_id: lrResp.partner_borrower_id,
                              };
                              var basePath =
                                'http://localhost:' + process.env.PORT;
                              var loanDocumentUrl = `${basePath}/api/loandocument`;
                              axios
                                .post(loanDocumentUrl, submitdata, {
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                  maxContentLength: Infinity,
                                  maxBodyLength: Infinity,
                                })
                                .then((response) => {
                                  return reqUtils.json(req, res, next, 200, {
                                    kyc_id: result.kyc_id,
                                    data: HVResponse.data,
                                    success: true,
                                  });
                                })
                                .catch((err) => {
                                  console.log(
                                    'error posting to ',
                                    loanDocumentUrl,
                                    ' with body',
                                    submitdata,
                                    ' err: ',
                                    err,
                                  );
                                  return reqUtils.json(req, res, next, 200, {
                                    kyc_id: result.kyc_id,
                                    data: HVResponse.data,
                                    success: true,
                                  });
                                });
                            })
                            .catch((error) => {
                              fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
                                if (errUnlinkHtml)
                                  return reqUtils.json(req, res, next, 200, {
                                    kyc_id: result.kyc_id,
                                    data: HVResponse.data,
                                    success: true,
                                  });
                              });
                              return reqUtils.json(req, res, next, 200, {
                                kyc_id: result.kyc_id,
                                data: HVResponse.data,
                                success: true,
                              });
                            });
                        });
                      doc.end();
                    },
                  );
                } else {
                  return reqUtils.json(req, res, next, 200, {
                    kyc_id: result.kyc_id,
                    data: HVResponse.data,
                    success: true,
                  });
                }
              } else {
                return reqUtils.json(req, res, next, 200, {
                  kyc_id: result.kyc_id,
                  data: HVResponse.data,
                  success: true,
                });
              }
            })
            .catch((error) => {
              //handle error catched from hyperverge api
              console.log('error', error);
              const errKey = `${objData.api_name}/${objData.vendor_name}/${objData.company_id}/${objData.timestamp}.txt`;
              //insert error data to s3
              s3helper.uploadFileToS3(
                {
                  message: error.response.data.error,
                  request_id: error.response.data.request_id,
                  status: error.response.data.status,
                  success: false,
                },
                errKey,
                (uploadError, uploadResponse) => {
                  if (uploadError || !uploadResponse) {
                    (objData.document_uploaded_s3 = 0),
                      (objData.response_type = 'error');
                  }
                  objData.document_uploaded_s3 = 1;
                  objData.response_type = 'error';
                  objData.raw_data = uploadResponse.Location;
                  objData.request_type = 'response';
                  objData.api_response_status = 'FAILED';
                  //insert error data to bureau req res log schema
                  bureauService.addNew(objData, (err, result) => {
                    if (err)
                      return reqUtils.json(req, res, next, 422, {
                        message: 'Error while adding error data to database',
                        error: {
                          error: 'Error while adding error data to database',
                        },
                        success: false,
                      });
                    reqUtils.json(req, res, next, 422, {
                      message: error.response.data.error,
                      request_id: error.response.data.request_id,
                      status: error.response.data.status,
                      success: false,
                    });
                  });
                },
              );
            });
        }
      } catch (error) {
        console.log('error', error);
        return res.status(400).json(error);
      }
    },
  );
};

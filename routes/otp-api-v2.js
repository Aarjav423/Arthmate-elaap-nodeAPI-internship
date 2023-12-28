const bodyParser = require('body-parser');
const s3helper = require('../util/s3helper.js');
const validate = require('../util/validate-req-body.js');
var serviceReqResLog = require('../models/service-req-res-log-schema');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');
const otpAuthentication = require('../models/otp-authentication-schema.js');
const sendOtpService = require('../util/otp-service.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  // API to Send OTP to costumer
  app.post(
    '/api/auth-send-otp',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_AUTH_SEND_OTP_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const apiName = 'AUTH-SEND-OTP';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const service_id = process.env.SERVICE_AUTH_SEND_OTP_ID;
      try {
        //request Validation
        await reqValidation(req);
        //request data logging
        var { logData, filename } = await reqDataLog(req, service_id, apiName);

        if (req.body.consent === 'N') {
          logData.response_type = 'error';
          logData.api_response_status = 'FAIL';
        }
        //insert request data s3 upload response to database
        logData.request_id = requestId;
        const addResult = await serviceReqResLog.addNew(logData);
        if (!addResult)
          throw {
            message: 'Error while adding request data',
          };
        if (req.body.consent === 'N') {
          throw {
            errorType: 999,
            message: 'Consent was not provided',
          };
        }

        // 6 digit OTP
        const secretOtpCode = Math.floor(100000 + Math.random() * 900000);
        const contentOtp = process.env.OTP_SMSCONTENT.replace(
          '${SECRETOTP}',
          secretOtpCode,
        );
        const updatedMessage = contentOtp.replace(
          '${expiryTime}',
          process.env.EXPIRY_TIME,
        );

        // Request Body
        const mobileData = {
          receiver_mobile: req.body.mobile_number,
          sender_code: req.body.sender_code,
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
          smsContent: updatedMessage,
        };

        //call AUTH SEND OTP api after successfully uploading request data to s3
        sendOtpService(mobileData)
          .then(async (response) => {
            var expDate1 = new Date();
            var expDate = expDate1.setMinutes(
              expDate1.getMinutes() + parseInt(process.env.EXPIRY_TIME),
            );

            //response data from OTP to upload on s3
            logData.request_id = requestId;
            respLog = await resDataLog(filename, logData, response);
            if (response.statusCode === '200') {
              logData.api_response_status = 'SUCCESS';
            } else {
              logData.api_response_status = 'FAIL';
            }
            //insert call OTP check
            const data = {
              company_id: req.company._id,
              req_url: logData.reqdata,
              res_url: logData.resdata,
              consent: req.body.consent,
              consent_timestamp: req.body.consent_timestamp,
              mobile_number: req.body.mobile_number,
              otp: secretOtpCode,
              expiry: expDate,
              generated_at: Date.now(),
              created_by: req.company.code,
              request_id: requestId,
            };
            const addOtpData = await otpAuthentication.addNew(data);
            if (!addOtpData)
              throw res.send({
                message: 'Error while adding OTP data',
              });

            //insert response data s3 upload response to database
            const smsDataResp = await serviceReqResLog.addNew(logData);
            if (!smsDataResp)
              throw {
                message: 'Error while adding response data to database',
              };
            // //send final response
            if (logData.api_response_status == 'SUCCESS') {
              return res.send({
                requestId: requestId,
                status: 'true',
                data: {
                  message: `OTP Send Successfully`,
                },
              });
            } else {
              return res.send({
                requestId: requestId,
                status: 'fail',
                error: error.message,
              });
            }
          })
          .catch((error) => {
            //handle error catched from AUTH SEND OTP api
            throw error;
          });
      } catch (error) {
        //handle error catched from Send OTP api
        const { objData, serviceReqResLog1 } = await errDataLog(
          req,
          apiName,
          error,
          service_id,
        );

        const msgString =
          error.message.validationmsg || error.errorType
            ? error.message
            : `Please contact the administrator`;
        const errorCode =
          error.message.validationmsg || error.errorType ? 400 : 500;
        if (errorCode == 400) {
          res.status(400).send({
            requestId: requestId,
            status: 'fail',
            message: msgString,
          });
        } else {
          objData.request_id = requestId;
          objData.raw_data = serviceReqResLog1.Location;
          //insert request data s3 upload response to database
          const addResult = await serviceReqResLog.addNew(objData);
          res.status(500).send({
            requestId: requestId,
            status: 'fail',
            message: 'Please contact the administrator',
          });
        }
      }
    },
  );

  // keep track of used OTPs
  let usedOtps = [];

  // Verify OR Validate the OTP
  app.post(
    '/api/auth-verify-otp',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_AUTH_VERIFY_OTP_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const apiName = 'AUTH-VERIFY-OTP';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const service_id = process.env.SERVICE_AUTH_VERIFY_OTP_ID;
      try {
        await reqValidation(req);

        var { logData, filename } = await reqDataLog(req, service_id, apiName);

        //insert request data s3 upload response to database
        logData.request_id = requestId;
        const addResult = await serviceReqResLog.addNew(logData);
        if (!addResult)
          throw {
            message: 'Error while adding request data',
          };

        const response = {
          requestId: requestId,
          status: 'true',
          data: {
            message: `OTP Verified Successfully`,
          },
        };
        const requestIdAuth = await otpAuthentication.findIfReqIdExists(
          req.body.request_id,
        );
        if (requestIdAuth) {
          const otp_authentication = await otpAuthentication.findIfOTPExists(
            req.body.request_id,
            req.body.otp,
          );

          if (otp_authentication) {
            var date1 = otp_authentication.expiry;
            var date2 = new Date();
            var diff = date1.getTime() - date2.getTime();
            var mm = Math.ceil(diff / 60000);

            if (0 < mm && mm <= parseInt(process.env.EXPIRY_TIME)) {
              // Check if OTP has already been used
              if (usedOtps.includes(req.body.otp)) {
                throw {
                  errorType: 99,
                  message: 'OTP already used',
                };
              } else {
                // Mark the OTP as used
                usedOtps.push(req.body.otp);

                // Response data from OTP to upload on s3
                logData.request_id = requestId;
                respLog = await resDataLog(filename, logData, response);
                // Insert response data s3 upload response to database
                const smsVerifyDataResp =
                  await serviceReqResLog.addNew(logData);
                if (!smsVerifyDataResp)
                  throw {
                    message: 'Error while adding response data to database',
                  };
                return res.send(response);
              }
            } else {
              throw {
                errorType: 99,
                message: 'OTP Expired',
              };
            }
          } else {
            throw {
              errorType: 99,
              message: 'Wrong OTP',
            };
          }
        } else {
          throw {
            errorType: 99,
            message: 'Request Id does not exist',
          };
        }
      } catch (error) {
        //handle error catched from Verify/Validate OTP api
        const { objData, serviceReqResLog1 } = await errDataLog(
          req,
          apiName,
          error,
          service_id,
        );
        const msgString =
          error.message.validationmsg || error.errorType
            ? error.message
            : `Please contact the administrator`;
        const errorCode =
          error.message.validationmsg || error.errorType ? 400 : 500;
        if (errorCode == 400 && error.errorType === 999) {
          res.status(400).send({
            requestId: requestId,
            status: 'fail',
            message: msgString,
          });
        } else if (errorCode == 400 && error.errorType === 99) {
          objData.request_id = requestId;
          objData.raw_data = serviceReqResLog1.Location;
          //insert request data s3 upload response to database
          const addResult = await serviceReqResLog.addNew(objData);
          res.status(400).send({
            requestId: requestId,
            status: 'fail',
            message: msgString,
          });
        } else {
          objData.request_id = requestId;
          objData.raw_data = serviceReqResLog1.Location;
          //insert request data s3 upload response to database
          const addResult = await serviceReqResLog.addNew(objData);
          res.status(500).send({
            requestId: requestId,
            status: 'fail',
            message: 'Please contact the administrator',
          });
        }
      }
    },
  );
};

async function reqDataLog(req, service_id, apiName) {
  var logData = {
    company_id: req.company._id,
    company_code: req.company.code,
    vendor_name: 'ARTHMATE',
    request_id: '',
    service_id: service_id,
    api_name: apiName,
    timestamp: Date.now(),
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
    raw_data: '',
    response_type: '',
    request_type: '',
    document_uploaded_s3: '',
    api_response_type: 'JSON',
    api_response_status: '',
    id_number: req.body.mobile_number || req.body.request_id,
  };

  let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
  const reqKey = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
  //upload request data on s3
  const uploadResponse = await s3helper.uploadFileToS3(req.body, reqKey);
  if (!uploadResponse) {
    (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
  } else {
    logData.document_uploaded_s3 = 1;
    logData.response_type = 'success';
  }
  logData.api_response_status = 'SUCCESS';
  logData.raw_data = uploadResponse.Location;
  logData.reqdata = uploadResponse.Location;
  logData.request_type = 'request';
  return { logData, filename };
}

async function resDataLog(filename, logData, response) {
  filename = Math.floor(10000 + Math.random() * 99999) + '_res';
  //upload response data from OTP on s3
  const resKey = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
  const uploadResponse = await s3helper.uploadFileToS3(response, resKey);
  if (!uploadResponse) {
    (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
  }
  logData.document_uploaded_s3 = 1;
  logData.response_type = 'success';
  logData.raw_data = uploadResponse.Location;
  logData.resdata = uploadResponse.Location;
  logData.request_type = 'response';
  return filename;
}

async function errDataLog(req, apiName, error, service_id) {
  let filename1 = Math.floor(10000 + Math.random() * 99999) + '_err';
  const resKey1 = `${apiName}/${
    req.company?._id
  }/ERROR/${filename1}/${Date.now()}.txt`;
  //upload request data on s3
  const serviceReqResLog1 = await s3helper.uploadFileToS3(error, resKey1);
  const objData = {
    company_id: req.company?._id,
    company_code: req.company?.code,
    request_id: '',
    api_name: apiName,
    loan_app_id: req.body.loan_app_id,
    service_id: service_id,
    request_type: 'response',
    response_type: 'error',
    timestamp: Date.now(),
    id_number: req.body.mobile_number || req.body.request_id,
    document_uploaded_s3: '1',
    is_cached_response: 'FALSE',
    api_response_type: 'JSON',
    api_response_status: 'FAIL',
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
  };
  return { objData, serviceReqResLog1 };
}

async function reqValidation(req) {
  const data = req.body;
  //s3 url
  const s3url = req.service.file_s3_path;
  //fetch template from s3
  const jsonS3Response = await s3helper.fetchJsonFromS3(
    s3url.substring(s3url.indexOf('services')),
  );
  if (!jsonS3Response)
    throw {
      message: 'Error while finding template from s3',
    };
  //validate the incoming template data with customized template data
  const resValDataTemp = validate.validateDataWithTemplate(jsonS3Response, [
    data,
  ]);

  if (resValDataTemp.missingColumns.length) {
    resValDataTemp.missingColumns = resValDataTemp.missingColumns.filter(
      (x) => x.field != 'sub_company_code',
    );
  }
  if (!resValDataTemp)
    throw {
      message: 'No records found',
      errorType: 999,
    };
  if (resValDataTemp.unknownColumns.length)
    throw {
      message: resValDataTemp.unknownColumns[0],
      errorType: 999,
    };
  if (resValDataTemp.missingColumns.length)
    throw {
      message: resValDataTemp.missingColumns[0],
      errorType: 999,
    };
  if (resValDataTemp.errorRows.length)
    throw {
      message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
      errorType: 999,
    };
}

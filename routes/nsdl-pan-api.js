const bodyParser = require('body-parser');
const s3helper = require('../util/s3helper.js');
const validate = require('../util/validate-req-body.js');
var serviceReqResLog = require('../models/service-req-res-log-schema');
const jwt = require('../util/jwt');
const services = require('../util/service');
const moment = require('moment');
const axios = require('axios');
const kycdata = require('../models/kyc-data-schema.js');
const AccessLog = require('../util/accessLog');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

const panStatusMapping = {
  D: 'Deleted',
  E: 'Existing and Valid',
  EC: 'Existing and Valid but event marked as Acquisition in ITD database',
  ED: 'Existing and Valid but event marked as Death in ITD database',
  EI: 'Existing and Valid but event marked as Dissolution in ITD database',
  EL: 'Existing and Valid but event marked as Liquidated in ITD database',
  EP: 'Existing and Valid but event marked as Partition in ITD database',
  ES: 'Existing and Valid but event marked as Split in ITD database',
  EU: 'Existing and Valid but event marked as Under Liquidation in ITD database',
  X: 'Marked as Deactivated',
  F: 'Marked as Fake',
  N: 'Not present in Income Tax Department (ITD) database/Invalid PAN',
  I: 'Marked as Inoperative',
};

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/pan_kyc_v2',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_NSDL_PAN_KYC_V2_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const apiName = 'PAN-KYC-V2';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const service_id = process.env.SERVICE_NSDL_PAN_KYC_V2_ID;
      try {
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

        //NSDL data
        var pan = [];
        pan.push(req.body.pan);
        const nsdlData = {
          requestId: requestId,
          panIdList: pan,
        };
        //NSDL url
        const url = process.env.NSDL_PAN_URL;

        //Headers
        const config = {
          headers: {
            Authorization: `Basic ${process.env.NSDL_AUTHORIZATION}`,
            'Content-Type': 'application/json',
          },
        };
        var pandata = {
          company_id: req.company._id,
          company_code: req.company.code,
          vendor_name: 'NSDL',
          request_id: '',
          service_id: service_id,
          api_name: 'PAN-KYC-V2',
          loan_app_id: req.body.loan_app_id,
          timestamp: Date.now(),
          pan_card: req.body.pan,
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
          raw_data: '',
          response_type: '',
          request_type: '',
          document_uploaded_s3: '',
          api_response_type: 'JSON',
          api_response_status: '',
        };

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${pandata.api_name}/${pandata.vendor_name}/${pandata.company_id}/${filename}/${pandata.timestamp}.txt`;
        //upload request data on s3
        const uploadResponse = await s3helper.uploadFileToS3(req.body, reqKey);
        if (!uploadResponse) {
          (pandata.document_uploaded_s3 = 0), (pandata.response_type = 'error');
        } else {
          pandata.document_uploaded_s3 = 1;
          pandata.response_type = 'success';
        }
        pandata.api_response_status = 'SUCCESS';
        pandata.raw_data = uploadResponse.Location;
        pandata.reqdata = uploadResponse.Location;
        pandata.request_type = 'request';
        pandata.request_id = requestId;

        if (req.body.consent === 'N') {
          pandata.response_type = 'error';
          pandata.api_response_status = 'FAIL';
        }
        //insert request data s3 upload response to database
        const addResult = await serviceReqResLog.addNew(pandata);
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

        //call NSDL api after successfully uploading request data to s3
        axios
          .post(url, JSON.stringify(nsdlData), config)
          .then(async (response) => {
            //response data from NSDL to upload on s3
            filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            //upload response data from NSDL on s3
            const resKey = `${pandata.api_name}/${pandata.vendor_name}/${pandata.company_id}/${filename}/${pandata.timestamp}.txt`;
            const uploadResponse = await s3helper.uploadFileToS3(
              response.data,
              resKey,
            );
            if (!uploadResponse) {
              (pandata.document_uploaded_s3 = 0),
                (pandata.response_type = 'error');
            }
            pandata.document_uploaded_s3 = 1;
            pandata.response_type = 'success';
            pandata.raw_data = uploadResponse.Location;
            pandata.resdata = uploadResponse.Location;
            pandata.request_type = 'response';
            pandata.request_id = requestId;
            //insert call ekyc check
            const data = {
              company_id: req.company._id,
              loan_app_id: req.body.loan_app_id,
              kyc_type: pandata.api_name,
              req_url: pandata.reqdata,
              res_url: pandata.resdata,
              consent: req.body.consent,
              consent_timestamp: req.body.consent_timestamp,
              id_number: req.body.pan,
              created_at: Date.now(),
              created_by: req.company.code,
            };
            const addEkycRes = await kycdata.addNew(data);
            if (!addEkycRes)
              throw res.send({
                message: 'Error while adding ekyc data',
              });

            //insert response data s3 upload response to database
            const panDataResp = await serviceReqResLog.addNew(pandata);
            if (!panDataResp)
              throw {
                message: 'Error while adding response data to database',
              };
            const panStatusDescription =
              panStatusMapping[response.data.panDetails[0].panStatus];
            if (response.data.returnCode === 1) {
              if (pandata.api_response_status == 'SUCCESS') {
                const jsonData = {
                  pan_number: response.data.panDetails[0].pan,
                  first_name: response.data.panDetails[0].firstName,
                  middle_name: response.data.panDetails[0].middleName,
                  last_name: response.data.panDetails[0].lastName,
                  pan_holder_title: response.data.panDetails[0].panTitle,
                  pan_last_updated: response.data.panDetails[0].lastUpdateDate,
                  name_on_card: response.data.panDetails[0].nameOnCard,
                  seeding_status:
                    response.data.panDetails[0].aadhaarSeedingStatus,
                  pan_status: response.data.panDetails[0].panStatus,
                  status: 'Success',
                  msg: panStatusDescription,
                };
                // send final response
                return res.send({
                  kyc_id: requestId,
                  data: jsonData,
                  success: true,
                });
              }
            } else {
              if (pandata.api_response_status == 'SUCCESS') {
                const jsonData = {
                  pan_status: '',
                  status: 'Error',
                  msg: 'System error',
                };
                // send final response
                return res.send({
                  kyc_id: requestId,
                  data: jsonData,
                  success: false,
                });
              }
            }
          })
          .catch((error) => {
            throw error;
          });
      } catch (error) {
        //error handling
        let filename1 = Math.floor(10000 + Math.random() * 99999) + '_err';
        const resKey1 = `${apiName}/${
          req.company?._id
        }/ERROR/${filename1}/${Date.now()}.txt`;
        const reqErrorData = {
          requestBody: req.body,
          error: error,
        };
        //upload request data including error on s3
        const serviceReqResLog1 = await s3helper.uploadFileToS3(
          reqErrorData,
          resKey1,
        );
        const objData = {
          company_id: req.company?._id,
          company_code: req.company?.code,
          request_id: requestId,
          api_name: apiName,
          loan_app_id: req.body.loan_app_id,
          service_id: service_id,
          request_type: 'response',
          response_type: 'error',
          timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
          id_number: req.body.pan,
          document_uploaded_s3: '1',
          is_cached_response: 'FALSE',
          api_response_type: 'JSON',
          api_response_status: 'FAIL',
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
        };
        const msgString =
          error.message.validationmsg || error.errorType
            ? error.message
            : `Please contact the administrator`;
        const errorCode =
          error.message.validationmsg || error.errorType ? 400 : 500;
        if (errorCode == 400) {
          objData.raw_data = serviceReqResLog1.Location;
          objData.request_type = 'request';
          objData.consent_timestamp = Date.now();
          if (req.body.consent !== 'Y' && req.body.consent !== 'N') {
            objData.consent = 'N';
          }
          // service database logging
          const addResult = await serviceReqResLog.addNew(objData);
          res.status(400).send({
            kyc_id: requestId,
            message: msgString,
            success: false,
          });
        } else {
          objData.raw_data = serviceReqResLog1.Location;
          //insert request data s3 upload response to database
          const addResult = await serviceReqResLog.addNew(objData);
          res.status(errorCode).send({
            requestId: requestId,
            message: msgString,
            success: false,
          });
        }
      }
    },
  );
};

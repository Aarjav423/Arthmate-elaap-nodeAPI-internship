const bodyParser = require('body-parser');
const s3helper = require('../util/s3helper.js');
const validate = require('../util/validate-req-body.js');
var serviceReqResLog = require('../models/service-req-res-log-schema');
const moment = require('moment');
const jwt = require('../util/jwt');
const services = require('../util/service');
const axios = require('axios');
const kycdata = require('../models/kyc-data-schema.js');
const AccessLog = require('../util/accessLog');
const {
  verifyloanAppIdValidation,
} = require('../util/loan-app-id-validation.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/ckyc-search',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_CKYC_SEARCH_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res, next) => {
      try {
        await validateInput(req);
        //Karza data
        const ckycSearchData = {
          idtype: req.body.id_type,
          idno: req.body.id_no,
        };
        //Karza url
        const url = process.env.CKYC_API_URL + '/api/ckyc-search';
        //Headers
        const config = {
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const apiName = 'CKYC-SEARCH';
        const serviceid = process.env.SERVICE_CKYC_SEARCH_ID;
        await invokeAPIAndSendResponse(
          req,
          serviceid,
          apiName,
          url,
          ckycSearchData,
          config,
          res,
          1,
        );
      } catch (error) {
        const apiName = 'CKYC-SEARCH';
        const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
        const msgString =
          error.message.validationmsg || error.errorType
            ? error.message
            : error.response.data.message === 'No record found'
            ? error.response.data.message
            : `Please contact the administrator`;
        const errorCode =
          error.message.validationmsg || error.errorType
            ? 400
            : error.response.data.message === 'No record found'
            ? 404
            : 500;
        if (errorCode == 400) {
          res.status(400).send({
            request_id: requestId,
            message: msgString,
            status: 'fail',
          });
        } else {
          res.status(errorCode).send({
            requestId: requestId,
            message: msgString,
            status: 'fail',
          });
        }
      }
    },
  );

  app.post(
    '/api/ckyc-download',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_CKYC_DOWNLOAD_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res, next) => {
      try {
        await validateInput(req);
        //Karza data
        const ckycDownloadData = {
          ckycno: req.body.ckyc_no,
          authfactortyp: req.body.auth_factor_type,
          authfactor: req.body.auth_factor,
        };
        //Karza url
        const url = process.env.CKYC_API_URL + '/api/ckyc-download';
        //Headers
        const config = {
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const apiName = 'CKYC-DOWNLOAD';
        const serviceid = process.env.SERVICE_CKYC_DOWNLOAD_ID;
        await invokeAPIAndSendResponse(
          req,
          serviceid,
          apiName,
          url,
          ckycDownloadData,
          config,
          res,
          2,
        );
      } catch (error) {
        return res.status(400).send({
          message: 'Please contact the administrator',
          status: 'fail',
        });
      }
    },
  );
};

async function invokeAPIAndSendResponse(
  req,
  serviceid,
  apiName,
  url,
  ckycAPIData,
  config,
  res,
  apitype,
) {
  var ckycData = {
    company_id: req.company._id,
    company_code: req.company.code,
    vendor_name: 'CERSAI',
    service_id: serviceid,
    api_name: apiName,
    raw_data: '',
    response_type: '',
    request_type: '',
    timestamp: Date.now(),
    consent: req.body.consent,
    id_no: req.body.id_no,
    is_cached_response: false,
    consent_timestamp: req.body.consent_timestamp,
    loan_app_id: req.body.loan_app_id,
    request_id: req.body.request_id,
    document_uploaded_s3: '',
    api_response_type: 'JSON',
    api_response_status: '',
  };

  let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
  const reqKey = `${ckycData.api_name}/${ckycData.vendor_name}/${ckycData.company_id}/${filename}/${ckycData.timestamp}.txt`;
  //upload request data on s3
  const uploadResponse = await s3helper.uploadFileToS3(req.body, reqKey);

  if (!uploadResponse) {
    ckycData.document_uploaded_s3 = 0;
    ckycData.response_type = 'error';
  } else {
    ckycData.document_uploaded_s3 = 1;
    ckycData.response_type = 'success';
  }
  ckycData.api_response_status = 'SUCCESS';
  ckycData.raw_data = uploadResponse.Location;
  ckycData.reqdata = uploadResponse.Location;
  ckycData.request_type = 'request';
  if (req.body.consent === 'N') {
    ckycData.response_type = 'error';
    ckycData.api_response_status = 'FAIL';
  }
  //insert request data s3 upload response to database
  const addResult = await serviceReqResLog.addNew(ckycData);
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

  // Caching mechanism for getting request data from server.
  var cachedBureau = await kycdata.findIfExists(
    req.body.loan_app_id,
    req.body.id_no,
    'CKYC-SEARCH',
  );
  if (cachedBureau[0]) {
    var cachedUrl = cachedBureau[0].res_url;
    const xmlS3Response = await s3helper.fetchJsonFromS3(
      cachedUrl.substring(cachedUrl.indexOf(cachedBureau[0].kyc_type)),
    );
    ckycData.request_type = 'response';
    ckycData.raw_data = cachedUrl;
    ckycData.kyc_id = `${req.company.code}-${apiName}-${Date.now()}`;
    ckycData.is_cached_response = 'TRUE';
    //insert request data s3 upload response to database
    const ckycDataSerResp = await serviceReqResLog.addNew(ckycData);

    return res.send({
      kyc_id: ckycDataSerResp.kyc_id,
      data: xmlS3Response,
      success: true,
    });
  }
  //call ckyc api after successfully uploading request data to s3
  axios
    .post(url, JSON.stringify(ckycAPIData), config)
    .then(async (response) => {
      //response data from ckyc to upload on s3
      filename = Math.floor(10000 + Math.random() * 99999) + '_res';
      const resKey = `${ckycData.api_name}/${ckycData.vendor_name}/${ckycData.company_id}/${filename}/${ckycData.timestamp}.txt`;
      //upload response data from karza on s3
      const uploadS3FileRes = await s3helper.uploadFileToS3(
        response.data,
        resKey,
      );
      if (!uploadS3FileRes) {
        (ckycData.document_uploaded_s3 = 0), (ckycData.response_type = 'error');
      } else {
        ckycData.document_uploaded_s3 = 1;
        ckycData.response_type = 'success';
      }
      ckycData.raw_data = await uploadS3FileRes.Location;
      ckycData.resdata = uploadS3FileRes.Location;
      ckycData.request_type = 'response';
      ckycData.is_cached_response = 'FALSE';
      if (apitype == 2 || response.data.status == 'success') {
        (ckycData.api_response_status = 'SUCCESS'),
          (ckycData.kyc_id = `${req.company.code}-${apiName}-${Date.now()}`);
      } else {
        ckycData.api_response_status = 'FAIL';
      }

      //insert call ekyc check
      const data = {
        company_id: req.company._id,
        loan_app_id: req.body.loan_app_id,
        kyc_type: ckycData.api_name,
        req_url: ckycData.reqdata,
        res_url: ckycData.resdata,
        consent: req.body.consent,
        consent_timestamp: req.body.consent_timestamp,
        id_number: req.body.id_no || req.body.ckyc_no,
        created_at: Date.now(),
        created_by: req.company.code,
      };
      const addEkycRes = await kycdata.addNew(data);
      if (!addEkycRes)
        throw res.send({
          message: 'Error while adding ekyc data',
        });
      //insert response data s3 upload response to database
      const ckycDataResp = await serviceReqResLog.addNew(ckycData);
      if (!ckycDataResp)
        throw {
          message: 'Error while adding response data to database',
        };
      // //send final response
      if (ckycData.api_response_status == 'SUCCESS') {
        return res.send({
          kyc_id: ckycDataResp.kyc_id,
          data: response.data,
          success: true,
        });
      } else {
        return res.send({
          kyc_id: ckycDataResp.kyc_id,
          data: response.data,
          success: false,
        });
      }
    })
    .catch(async (error) => {
      //handle error catched from karza api
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      let filename1 = Math.floor(10000 + Math.random() * 99999) + '_err';
      const resKey1 = `${apiName}/${
        req.company?._id
      }/ERROR/${filename1}/${Date.now()}.txt`;
      //upload request data on s3
      const serviceReqResLog1 = await s3helper.uploadFileToS3(error, resKey1);
      const objData = {
        company_id: req.company?._id,
        company_code: req.company?.code,
        request_id: requestId,
        api_name: apiName,
        loan_app_id: req.body.loan_app_id,
        service_id: serviceid,
        request_type: 'response',
        response_type: 'error',
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        id_number: req.body.id_no,
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
          : error.response.data.message === 'No record found'
          ? error.response.data.message
          : `Please contact the administrator`;
      const errorCode =
        error.message.validationmsg || error.errorType
          ? 400
          : error.response.data.message === 'No record found'
          ? 404
          : 500;
      if (errorCode == 400) {
        res.status(400).send({
          request_id: requestId,
          message: msgString,
          status: 'fail',
        });
      } else {
        objData.raw_data = serviceReqResLog1.Location;
        //insert request data s3 upload response to database
        const addResult = await serviceReqResLog.addNew(objData);
        res.status(errorCode).send({
          requestId: requestId,
          message: msgString,
          status: 'fail',
        });
      }
    });
}

async function validateInput(req) {
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
}

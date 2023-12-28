const serviceReqResLog = require('../../../models/service-req-res-log-schema.js');
const { uploadLogsToS3 } = require('../utils/aws-s3-helper.js');
async function serviceLogging(s3Data, req, type) {
  const serviceDetails = {
    company_id: req.company._id,
    company_code: req.company.code,
    vendor_name: req.logData.vendor_name,
    request_id: req.logData.request_id,
    service_id: req.logData.service_id,
    api_name: req.logData.api_name,
    api_response_time: req.logData.api_response_time,
    api_response_type: req.logData.api_response_type,
    api_status_code: req.logData.api_status_code,
    is_cached_response: req.logData.is_cached_response,
    loan_app_id: req.body.loan_app_id,
    timestamp: Date.now(),
    id_number: req.body.account_number || req.body.id_id_number_1 || req.params.request_id || req.logData.id_number ||'',
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
    pan_card: req.body.pan || '',
    raw_data: req.logData.raw_data || '',
    request_type: req.logData.request_type || '',
    response_type: req.logData.response_type || '',
    loan_doc_uploaded: req.logData.loan_doc_uploaded
  };
  if (type.toUpperCase() === 'REQUEST') {
    const reqData = {
      ...serviceDetails,
      request_type: 'request',
      response_type: 'success',
    };
    const responseFromS3 = await s3Logging(s3Data, req, 'request');
    const requestS3Url = responseFromS3.Location;
    reqData.raw_data = requestS3Url;
    const dbResp = await serviceReqResLog.addNew(reqData);
    if (!dbResp)
      throw {
        message: 'Error while adding response data to database',
      };
}
  if (type.toUpperCase() === 'RESPONSE') {
    const reqData = {
      ...serviceDetails,
      request_type: 'response',
      response_type: 'success',
    };
    if(reqData?.api_name==="BANK-ACC-NUM-KYC"){
        reqData.remarks= String(JSON.stringify(s3Data));
    }
    
    const responseFromS3 = await s3Logging(s3Data, req, 'response');
    const respS3Url = responseFromS3.Location;
    reqData.raw_data = respS3Url;
    const dbResp = await serviceReqResLog.addNew(reqData);
    if (!dbResp)
      throw {
        message: 'Error while adding response data to database',
      };
  }
  if (type.toUpperCase() === 'ERROR') {
    const reqData = {
      ...serviceDetails,
      request_type: 'response',
      response_type: 'error',
    };
    const responseFromS3 = await s3Logging(s3Data, req, 'error');
    const respS3Url = responseFromS3.Location;
    reqData.raw_data = respS3Url;
    const dbResp = await serviceReqResLog.addNew(reqData);
    if (!dbResp)
      throw {
        message: 'Error while adding response data to database',
      };
  }
}

async function s3Logging(data, req, type) {
  if (type.toUpperCase() === 'REQUEST') {
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${req.logData.api_name}/${req.logData.vendor_name}/${
      req.company._id
    }/${filename}/${Date.now()}.txt`;
    //upload request data on s3
    const uploadResponse = await uploadLogsToS3(data, reqKey);
    return uploadResponse;
  }
  if (type.toUpperCase() === 'RESPONSE') {
    let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${req.logData.api_name}/${req.logData.vendor_name}/${
      req.company._id
    }/${filename}/${Date.now()}.txt`;
    //upload request data on s3
    const uploadResponse = await uploadLogsToS3(data, resKey);
    return uploadResponse;
  }
  if (type.toUpperCase() === 'ERROR') {
    let filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${req.logData.api_name}/${req.logData.vendor_name}/${
      req.company._id
    }/${filename}/${Date.now()}.txt`;
    //upload request data on s3
    const uploadResponse = await uploadLogsToS3(data, errKey);
    return uploadResponse;
  }
}

async function handleError(error, req, res) {
  const msgString =
    error.message.validationmsg || error.errorType === 999
      ? error.message.validationmsg || error.message
      : error.errorType === 99
      ? error.message
      : `Please contact the administrator`;
  const errorCode =
    error.message.validationmsg || error.errorType === 999
      ? 400
      : error.errorType === 99
      ? 404
      : 500;
  if (errorCode == 400) {
    req.logData.api_status_code = 400;
    try{
    await serviceLogging(error, req, 'error');
    }
    catch(error){
      return res.status(400).send({
        request_id: error.request_id,
        message: msgString,
        status: 'fail',
      });
    }
    return res.status(400).send({
      request_id: error.request_id,
      message: msgString,
      status: 'fail',
    });
  } else {
    req.logData.api_status_code = errorCode;
    try{
      await serviceLogging(error, req, 'error');
    }
    catch(error){
      return res.status(errorCode).send({
        request_id: error.request_id,
        message: msgString,
        status: 'fail',
      });
    }    
    return res.status(errorCode).send({
      request_id: error.request_id,
      message: msgString,
      status: 'fail',
    });
  }
}

module.exports = {
  serviceLogging,
  s3Logging,
  handleError,
};

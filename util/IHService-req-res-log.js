const s3helper = require('./s3helper');
const IHServiceReqResLogSchema = require('../models/IHService-req-res-log-schema');
const storeIHServiceRequestDataToS3 = async (req, res, requestRow) => {
  try {
    const apiName = req.apiName;
    var logData = {
      company_id: req.company && req.company._id ? req.company._id : null,
      company_code: req.company && req.company.code ? req.company.code : null,
      company_name: req.company && req.company.name ? req.company.name : null,
      vendor_name: 'arthmateIH',
      loan_app_id: requestRow.loan_app_id,
      service_id: '',
      api_name: apiName,
      raw_data: '',
      response_type: 'success',
      request_type: 'request',
      timestamp: Date.now(),
      request_id: `${req.company.code}-${apiName}-${Date.now()}`,
      document_uploaded_s3: '',
      api_response_type: 'JSON',
      api_response_status: '',
    };
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const keyRequestLog = `${logData.vendor_name}/${logData.api_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload request data on s3
    let s3LogResult = await s3helper.uploadFileToS3(
      req.raw_data_object,
      keyRequestLog,
    );
    if (!s3LogResult) {
      logData.document_uploaded_s3 = 0;
      logData.response_type = 'error';
    }
    logData.document_uploaded_s3 = 1;
    logData.response_type = '';
    logData.api_response_status = '';
    logData.raw_data = s3LogResult.Location;
    logData.request_type = 'request';
    //insert request data s3 upload response to database
    return await IHServiceReqResLogSchema.addNew(logData);
  } catch (error) {
    return error;
  }
};

const storeIHServiceResponseDataToS3 = async (
  req,
  res,
  dataToStore,
  requestRow,
) => {
  try {
    const apiName = req.apiName;
    var logData = {
      company_id: req.company && req.company._id ? req.company._id : null,
      company_code: req.company && req.company.code ? req.company.code : null,
      company_name: req.company && req.company.name ? req.company.name : null,
      loan_app_id: requestRow.loan_app_id,
      vendor_name: 'arthmateIH',
      service_id: '',
      api_name: apiName,
      raw_data: '',
      response_type: dataToStore ? 'success' : 'error',
      request_type: '',
      timestamp: Date.now(),
      request_id: `${req.company.code}-${apiName}-${Date.now()}`,
      document_uploaded_s3: '',
      api_response_type: '',
      api_response_status: dataToStore ? 'SUCCESS' : 'FAIL',
    };
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const keyRequestLog = `${logData.vendor_name}/${logData.api_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload request data on s3
    let s3LogResult = await s3helper.uploadFileToS3(dataToStore, keyRequestLog);
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    }
    logData.document_uploaded_s3 = 1;
    logData.raw_data = s3LogResult.Location;
    logData.request_type = 'response';
    //insert request data s3 upload response to database
    return await IHServiceReqResLogSchema.addNew(logData);
  } catch (error) {
    return error;
  }
};

module.exports = {
  storeIHServiceRequestDataToS3,
  storeIHServiceResponseDataToS3,
};

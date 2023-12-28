const helper = require('../util/s3helper.js');
const bureaurReqResLogSchema = require('../models/service-req-res-log-schema');
const moment = require('moment');
const axios = require('axios');
const leadSchema = require('../models/loan-request-schema');
const validate = require('../util/validate-req-body.js');
const stateCode = require('./cibil-crif-state-mapping.js');
const stateConvertion = require('./stateConvertionMapping.js');
const colenderAssignmentSchema = require('../models/co-lender-assignment-schema');
const colenderProfileSchema = require('../models/co-lender-profile-schema');
const assignmentSchema = require('../models/co-lender-assignment-schema');
const ColenderProfile = require('../models/co-lender-profile-schema.js');

async function callCoLenderSelectorAPI(req, res) {
  var { data, company_id, company_code, requestId, dates, objData } =
    await reqObjAndValidation(req);
  /*
   * SELECTOR CACHED CHECK
   **/
  const cachedData = await assignmentSchema.findByLoanAppIdAndPan(
    req.body?.loan_app_id,
    req.body?.appl_pan,
  );
  if (cachedData) {
    const coLender = await ColenderProfile.findByColenderId(
      cachedData.co_lender_id,
    );
    if (!coLender)
      throw {
        errorType: 21,
        message: 'Co-lender does not exist',
      };
    return res.status(200).send({
      request_id: requestId,
      loan_amount: cachedData?.loan_amount,
      pricing: cachedData?.pricing,
      co_lender_shortcode: coLender.co_lender_shortcode,
      co_lender_assignment_id: cachedData.co_lender_assignment_id,
      co_lender_full_name: coLender.co_lender_name,
      loan_app_id: cachedData.loan_app_id,
      status: 'success',
    });
  }

  /*
   * BY DEFAULT CIBIL API
   * STATE CODE MAPPING
   * GENDER MAPPING
   **/
  var bureauResponse = {};
  if (req.body.bureau_type.toUpperCase() !== 'CRIF') {
    bureauResponse = await cibilApiCall(data, bureauResponse);
  } else {
    /*
     * SWITCH TO CRIF API
     * STATE CODE MAPPING
     * GENDER MAPPING
     **/
    bureauResponse = await crifApiCall(data, bureauResponse);
  }
  //Find max CO-LENDER assignment ID.
  return await callDownstreamSelectorApi(
    data,
    company_id,
    bureauResponse,
    company_code,
    requestId,
    req,
    dates,
    objData,
    res,
  );
}
exports.callCoLenderSelectorAPI = callCoLenderSelectorAPI;

async function crifApiCall(data, bureauResponse) {
  const getAge = (birthYear) => {
    var currentYear = new Date().getFullYear();
    let age = currentYear - birthYear;
    return age;
  };

  const calculatedAge = getAge(new Date(data.dob).getFullYear());
  const crifMappedStateCode = data.state
    ? stateCode.stateCodeMapping[data.state]
    : '';

  const crifData = {
    borrower_name_1: `${data.first_name} ${data.last_name}`,
    dob: moment(data.dob).format('YYYY-MM-DD'),
    borrower_age: calculatedAge,
    borrower_age_as_on: moment().format('YYYY-MM-DD'),
    borrower_id_type: 'ID07',
    borrower_id_number: data.appl_pan,
    borrower_telephone_num_type: 'P03',
    borrower_telephone_num: data.appl_phone,
    borrower_address_type: 'D01',
    borrower_address: data.address,
    borrower_city: data.city,
    borrower_state: crifMappedStateCode,
    borrower_pincode: data.pincode,
    enquiry_purpose: data.enquiry_purpose,
    enquiry_stage: data.enquiry_stage,
    loan_amount: data.sanction_amount,
    email_id: data.email_id ? data.email_id : '',
    gender:
      data.gender.toUpperCase() === 'MALE'
        ? 'G01'
        : data.gender.toUpperCase() === 'FEMALE'
        ? 'G02'
        : 'G03',
    loan_app_id: data.loan_app_id,
    consent: 'Y',
    consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
  };
  //prepare config data to make call to the crif api
  const crifConfig = {
    method: 'POST',
    url: `${process.env.SERVICE_MS_URL}/api/crif`,
    headers: {
      Authorization: process.env.SERVICE_MS_TOKEN,
      'Content-Type': 'application/json',
    },
    data: crifData,
  };
  //make call to the pan kyc api
  const crifResponseData = await axios(crifConfig);
  bureauResponse = crifResponseData?.data?.data;
  if (!bureauResponse) {
    throw {
      errorType: 21,
      message: bureauResponse,
    };
  }
  return bureauResponse;
}

async function cibilApiCall(data, bureauResponse) {
  const generateAddress = (address) => {
    let address_line_1 = '';
    let address_line_2 = '';
    let address_line_3 = '';
    let address_line_4 = '';
    let address_line_5 = '';
    address_line_1 = address;
    if (address.length > 40) {
      address_line_1 = address.substring(0, 40);
      address_line_2 = address.substring(40);
    }
    if (address.length > 80) {
      address_line_1 = address.substring(0, 40);
      address_line_2 = address.substring(40, 80);
      address_line_3 = address.substring(80);
    }
    if (address.length > 120) {
      address_line_1 = address.substring(0, 40);
      address_line_2 = address.substring(40, 80);
      address_line_3 = address.substring(80, 120);
      address_line_4 = address.substring(120);
    }
    if (address.length > 160) {
      address_line_1 = address.substring(0, 40);
      address_line_2 = address.substring(40, 80);
      address_line_3 = address.substring(80, 120);
      address_line_4 = address.substring(120, 160);
      address_line_5 = address.substring(160);
    }
    return {
      address_line_1,
      address_line_2,
      address_line_3,
      address_line_4,
      address_line_5,
    };
  };

  // Prepare address as per length for cibil api
  const address = await generateAddress(data.address);
  //prepare config data to make call to the cibil api
  const cibilData = {
    enquiry_purpose: data.enquiry_purpose,
    enquiry_amount: data.sanction_amount.toString(),
    name_first_name_1: data.first_name ? data.first_name : '',
    name_middle_name_1: data.middle_name ? data.middle_name : '',
    name_last_name_1: data.last_name ? data.last_name : '',
    name_birth_date_1: moment(data.dob).format('DDMMYYYY'),
    name_gender_1:
      data.gender.toUpperCase() === 'MALE'
        ? '2'
        : data.gender.toUpperCase() === 'FEMALE'
        ? '1'
        : '3',
    tele_telephone_number_1: data.appl_phone,
    tele_telephone_type_1: '01',
    id_id_number_1: data.appl_pan,
    id_id_type_1: '01',
    add_line1_1: address.address_line_1,
    add_line2_1: address.address_line_2,
    add_line3_1: address.address_line_3,
    add_line4_1: address.address_line_4,
    add_line5_1: address.address_line_5,
    add_state_code_1: data.state
      ? stateConvertion.stateConvertionMapping[data?.state?.toUpperCase()]
      : '',
    add_pin_code_1: data.pincode,
    add_address_category_1: '02',
    en_acc_account_number_1: data.loan_app_id.substring(0, 10),
    loan_app_id: data.loan_app_id,
    consent: data.consent,
    consent_timestamp: data.consent_timestamp,
  };
  //prepare config data to make call to the cibil api
  const cibilConfig = {
    method: 'POST',
    url: `${process.env.SERVICE_MS_URL}/api/cibil-verify`,
    headers: {
      Authorization: process.env.SERVICE_MS_TOKEN,
      'Content-Type': 'application/json',
    },
    data: cibilData,
  };

  //make call to the pan kyc api
  const cibilResponseData = await axios(cibilConfig);
  bureauResponse = cibilResponseData?.data?.result;
  if (!bureauResponse || bureauResponse.controlData.success !== true) {
    throw {
      errorType: 21,
      message: bureauResponse?.controlData?.errorResponseArray,
    };
  }
  return bureauResponse;
}

async function reqObjAndValidation(req) {
  var data = req.body;
  const s3url = req.service.file_s3_path;
  //fetch template from s3
  const jsonS3Response = await helper.fetchJsonFromS3(
    s3url.substring(s3url.indexOf('services')),
  );

  if (!jsonS3Response)
    throw {
      errorType: 21,
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
      errorType: 21,
      message: 'No records found',
    };
  if (resValDataTemp.unknownColumns.length)
    throw {
      errorType: 21,
      message: resValDataTemp.unknownColumns[0],
    };
  if (resValDataTemp.missingColumns.length)
    throw {
      errorType: 21,
      message: resValDataTemp.missingColumns[0],
    };
  if (resValDataTemp.errorRows.length)
    throw {
      errorType: 21,
      message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
    };

  if (typeof req.body.sanction_amount === 'string') {
    throw {
      errorType: 21,
      message: 'sanction_amount must be a floating point number',
    };
  }
  // Check If loan app id exists in loan Request
  const isLoanAppIdExists = await leadSchema.findIfExists(req.body.loan_app_id);
  if (!isLoanAppIdExists)
    throw {
      errorType: 21,
      message: 'Loan app id does not exist',
    };

  //----------------- Request logging in MongoDatabase and S3 bucket --------------------------//
  const dates = moment().format('YYYY-MM-DD HH:mm:ss');
  const company_id = req.company?._id ? req.company?._id : 0;
  const company_code = req.company?.code ? req.company?.code : 'Sample';
  const requestId = company_code + '-CO-LENDER-SELECTOR-' + Date.now();
  const objData = {
    company_id: company_id,
    company_code: company_code,
    request_id: requestId,
    api_name: `CO-LENDER-SELECTOR`,
    loan_app_id: req.body.loan_app_id,
    service_id: process.env.SERVICE_CO_LENDER_SELECTOR_ID
      ? process.env.SERVICE_CO_LENDER_SELECTOR_ID
      : '0',
    response_type: 'success',
    request_type: 'request',
    timestamp: dates,
    pan_card: req.body.appl_pan ? req.body.appl_pan : 'Sample',
    document_uploaded_s3: '1',
    is_cached_response: 'FALSE',
    api_response_type: 'JSON',
    api_response_status: 'SUCCESS',
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
  };

  let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
  const reqKey = `CO-LENDER-SELECTOR/${company_id}/${filename}/${Date.now()}.txt`;
  const uploadResponse = await helper.uploadFileToS3(req.body, reqKey);

  if (!uploadResponse) {
    (objData.document_uploaded_s3 = 0), (objData.response_type = 'error');
  }
  objData.raw_data = uploadResponse.Location;
  //insert request data s3 upload response to database
  const savePartnerRequestLog = await bureaurReqResLogSchema.addNew(objData);
  if (!savePartnerRequestLog)
    throw {
      message: 'Error while adding request data of partner',
    };

  if (req.body.consent !== 'Y') {
    throw {
      errorType: 21,
      message: 'Consent was not provided',
    };
  }
  return { data, company_id, company_code, requestId, dates, objData };
}

async function errorObjData(req, error) {
  let filename3 = Math.floor(10000 + Math.random() * 99999) + '_error';
  const resKey4 = `CO-LENDER-SELECTOR/${
    req.company?._id
  }/ERROR/${filename3}/${Date.now()}.txt`;
  //upload request data on s3
  const respData = await helper.uploadFileToS3(error, resKey4);
  const requestId = req.company?.code + '-CO-LENDER-SELECTOR-' + Date.now();
  const objData = {
    company_id: req.company?._id,
    company_code: req.company?.code,
    request_id: requestId,
    api_name: `CO-LENDER-SELECTOR`,
    loan_app_id: req.body.loan_app_id,
    service_id: process.env.SERVICE_CO_LENDER_SELECTOR_ID
      ? process.env.SERVICE_CO_LENDER_SELECTOR_ID
      : '0',
    request_type: 'request',
    response_type: 'error',
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    pan_card: req.body.appl_pan ? req.body.appl_pan : 'Sample',
    document_uploaded_s3: '1',
    api_response_type: 'JSON',
    api_response_status: 'FAIL',
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
  };
  return { requestId, objData, respData };
}
exports.errorObjData = errorObjData;

async function logErrorToDb(objData, respData, res, requestId) {
  objData.raw_data = respData.Location;
  //insert request data s3 upload response to database
  await bureaurReqResLogSchema.addNew(objData);
  return res.status(500).send({
    request_id: requestId,
    status: 'fail',
    message: 'Please contact the administrator',
  });
}
exports.logErrorToDb = logErrorToDb;

async function logCustomErrorToDb(objData, respData, res, requestId) {
  objData.raw_data = respData.Location;
  //insert request data s3 upload response to database
  await bureaurReqResLogSchema.addNew(objData);
}
exports.logCustomErrorToDb = logCustomErrorToDb;

async function callDownstreamSelectorApi(
  data,
  company_id,
  bureauResponse,
  company_code,
  requestId,
  req,
  dates,
  objData,
  res,
) {
  const maxColenderAssignmentID = await colenderAssignmentSchema.findMaxId();
  var maxId = 0;
  if (!maxColenderAssignmentID?.co_lender_assignment_id) {
    maxId = 1;
  } else {
    maxId = maxColenderAssignmentID?.co_lender_assignment_id + 1;
  }
  const formatedResult = {
    result: bureauResponse,
  };

  const product_id = (await leadSchema.findIfExistsLAID(data.loan_app_id))?.product_id;
  // --------------------- Downstream selector api call--------------------//
  const postData = {
    product_id:product_id,
    request_id: data.loan_app_id,
    loan_amount: data.sanction_amount,
    company_id: company_id,
    pan: data.appl_pan,
    product_type_code: data.product_type_code,
    loan_tenure: data.tenure,
    interest_rate: data?.interest_rate,
    dscr: data.dscr,
    entity_name: data.first_name,
    pincode: data.pincode.toString(),
    dob: data.dob,
    request_id_a_score: data.request_id_a_score,
    request_id_b_score: data.request_id_b_score,
    ceplr_cust_id: data.ceplr_cust_id,
    monthly_income: parseInt(data.monthly_income),
    bureau_response: formatedResult,
  };

  const selectorReqData = {
    product_id:product_id,
    company_id: company_id,
    company_code: company_code,
    request_id: requestId,
    api_name: `CO-LENDER-SELECTOR`,
    loan_app_id: req.body.loan_app_id,
    service_id: process.env.SERVICE_CO_LENDER_SELECTOR_ID
      ? process.env.SERVICE_CO_LENDER_SELECTOR_ID
      : '0',
    response_type: 'success',
    request_type: 'request',
    timestamp: dates,
    pan_card: req.body.appl_pan ? req.body.appl_pan : 'Sample',
    document_uploaded_s3: '1',
    consent: req.body.consent,
    consent_timestamp: req.body.consent_timestamp,
  };

  let filenameOfSelector = Math.floor(10000 + Math.random() * 99999) + '_req';
  const reqKeyOfSelector = `CO-LENDER-SELECTOR/${company_id}/${filenameOfSelector}/${Date.now()}.txt`;
  const uploadResponseOfSelector = await helper.uploadFileToS3(
    postData,
    reqKeyOfSelector,
  );

  if (!uploadResponseOfSelector) {
    (selectorReqData.document_uploaded_s3 = 0),
      (selectorReqData.response_type = 'error');
  }
  selectorReqData.raw_data = uploadResponseOfSelector.Location;
  //insert request data s3 upload response to database
  const savePartnerRequestLogOfSelector =
    await bureaurReqResLogSchema.addNew(selectorReqData);
  if (!savePartnerRequestLogOfSelector)
    throw {
      message: 'Error while adding request data of partner',
    };

  const selectorResponse = await axios.request({
    url: `${process.env.CO_LENDER_SELECTOR_URL}`,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'access-token': process.env.CO_LENDER_SELECTOR_ACCESS_TOKEN,
    },
    data: postData,
  });
  if (selectorResponse?.data?.status?.toUpperCase() === 'REJECTED') {
    throw {
      errorType: 21,
      message: 'No colender available for the borrower',
    };
  }

  // Insert new assignment and CO-LENDER in Assignment Collection
  const assignmentDetails = {
    assignment_id: maxId,
    colender_id: selectorResponse?.data?.co_lender_id,
    loan_amount: selectorResponse?.data?.loan_amount,
    pricing: selectorResponse?.data?.pricing,
    pan: data.appl_pan,
    loan_app_id: data.loan_app_id,
  };
  await assignmentSchema.createNewAssignment(assignmentDetails);
  const colenderId = selectorResponse?.data?.co_lender_id;
  // Fetching Colender Profile Details
  const colenderProfileDetails =
    await ColenderProfile.findColenderProfileDetails(colenderId);
  if (
    !process.env.NON_COLENDER_NAMES.includes(
      colenderProfileDetails[0]?.co_lender_shortcode,
    )
  ) {
    const productTypeCode = req.body?.product_type_code;
    const initialNetAvailableLimit =
      (colenderProfileDetails[0]?.product_types.filter(
        (ele) => ele.product_type_code == productTypeCode,
      ))[0]?.net_available_limit;
    const colenderShareAmountRequest = parseFloat(
      (colenderProfileDetails[0]?.co_lending_share *
        req.body?.sanction_amount) /
        100,
    ).toFixed(2);
    const netAvailableLimt = parseFloat(
      initialNetAvailableLimit - colenderShareAmountRequest,
    ).toFixed(2);
    await ColenderProfile.updateNetAvailableLimt(
      netAvailableLimt,
      colenderId,
      productTypeCode,
    );
  }

  //---------------------------- Service logging for response from downsteam co-lender-selector api ---------------------------//
  let filenameOfDownstreamApi =
    Math.floor(10000 + Math.random() * 99999) + '_res';
  objData.api_name = `CO-LENDER-SELECTOR`;
  const resKey3 = `CO-LENDER-SELECTOR/${company_id}/${filenameOfDownstreamApi}/${Date.now()}.txt`;
  //upload request data on s3
  const respData = await helper.uploadFileToS3(selectorResponse.data, resKey3);
  objData.request_type = 'response';
  objData.response_type = 'success';
  objData.raw_data = respData.Location;
  objData.api_response_status = 'SUCCESS';

  //insert request data s3 upload response to database
  await bureaurReqResLogSchema.addNew(objData);

  const colenderProfileData = await colenderProfileSchema.findColenderName(
    selectorResponse?.data?.co_lender_shortcode,
  );
  const colenderFullName = colenderProfileData?.co_lender_name;

  //---------------------------- Service logging for response from wrapper of co-lender-selector api ---------------------------//
  const finalResponseData = {
    request_id: requestId,
    loan_amount: selectorResponse?.data?.loan_amount,
    pricing: selectorResponse?.data?.pricing,
    co_lender_shortcode: selectorResponse?.data?.co_lender_shortcode,
    co_lender_assignment_id: maxId,
    co_lender_full_name: colenderFullName,
    status: 'success',
  };
  let fileNameOfResponse = Math.floor(10000 + Math.random() * 99999) + '_res';
  objData.api_name = `CO-LENDER-SELECTOR`;
  const resKeyOfResponse = `CO-LENDER-SELECTOR/${company_id}/${fileNameOfResponse}/${Date.now()}.txt`;
  //upload request data on s3
  const LogSchemaResponse = await helper.uploadFileToS3(
    finalResponseData,
    resKeyOfResponse,
  );
  objData.request_type = 'response';
  objData.response_type = 'success';
  objData.raw_data = LogSchemaResponse.Location;
  objData.api_response_status = 'SUCCESS';

  //insert request data s3 upload response to database
  const logData = await bureaurReqResLogSchema.addNew(objData);
  if (!logData) {
    throw error;
  }
  return res.status(200).send({
    request_id: requestId,
    loan_amount: selectorResponse?.data?.loan_amount,
    pricing: selectorResponse?.data?.pricing,
    co_lender_shortcode: selectorResponse?.data?.co_lender_shortcode,
    co_lender_assignment_id: maxId,
    co_lender_full_name: colenderFullName,
    loan_app_id: data.loan_app_id,
    status: 'success',
  });
}

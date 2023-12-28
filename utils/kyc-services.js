'use strict';
const moment = require('moment');
const axios = require('axios');
var xmltojs = require('xml2js');
const s3helper = require('../util/s3helper.js');
const Compliance = require('../models/compliance-schema.js');
const BureauDetailsSchema = require('../models/bureau-data-schema');
const stateCode = require('../utils/stateCodeMapping.js');
const stateConvertion = require('../utils/stateConvertionMapping.js');

const convertXmlToJosn = async (encodedXml) => {
  return new Promise((resolve, reject) => {
    let buff = new Buffer.from(encodedXml, 'base64');
    let text = buff.toString('ascii');
    let parsestring = xmltojs.parseString;
    parsestring(text, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });
  });
};

const getAge = (birthYear) => {
  var currentYear = new Date().getFullYear();
  let age = currentYear - birthYear;
  return age;
};

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

const CKYCSearch = async (req, res, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  try {
    const ckycSerachData = {
      id_type: 'C',
      id_no: data.appl_pan,
      loan_app_id: data.loan_app_id,
      consent: 'Y',
      //created_at from loanrequest table
      consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    //prepare config data to make call to the ckyc search api
    const ckycSearchConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/ckyc-search`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: ckycSerachData,
    };
    //make call to the ckyc seach api
    const ckycSearchResp = await axios(ckycSearchConfig);
    if (ckycSearchResp.data) {
      //convert ckyc search xml response to json to get kyc_id
      const xmlToJson = await convertXmlToJosn(
        ckycSearchResp.data.data.encodedXml,
      );

      complianceData.ckyc_number =
        xmlToJson.PID_DATA.SearchResponsePID[0].CKYC_NO[0];
      complianceData.ckyc_search = 'Y';
      //record kyc compliance data in tablec
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );

      return {
        success: true,
        ckyc_id: xmlToJson.PID_DATA.SearchResponsePID[0].CKYC_NO[0],
      };
    }
  } catch (error) {
    complianceData.ckyc_status = 'N';
    complianceData.ckyc_search = 'N';
    complianceData.ckyc_match = 'N';
    //record kyc compliance data in tablec
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const CKYCDownload = async (req, res, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  try {
    const ckycDownloadData = {
      ckyc_no: data.ckyc_id,
      auth_factor_type: '01',
      auth_factor: moment(data.dob).format('DD-MM-YYYY'),
      loan_app_id: data.loan_app_id,
      consent: 'Y',
      consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    };
    //prepare config data to make call to the ckyc search api
    const ckycDownloadConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/ckyc-download-v2`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: ckycDownloadData,
    };
    //make call to the ckyc seach api
    const ckycDownloadResp = await axios(ckycDownloadConfig);
    if (ckycDownloadResp.data?.success === true) {
      complianceData.ckyc_status = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return {
        success: true,
        data: ckycDownloadResp.data,
      };
    } else {
      complianceData.ckyc_status = 'N';
      complianceData.ckyc_match = 'N';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return {
        success: false,
      };
    }
  } catch (error) {
    complianceData.ckyc_status = 'N';
    complianceData.ckyc_match = 'N';
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const PanKYC = async (req, res, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  const panKYCData = {
    pan: data.appl_pan,
    loan_app_id: data.loan_app_id,
    consent: 'Y',
    consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
  };
  try {
    //prepare config data to make call to the pan kyc api
    const panKYCConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/kz_pan_kyc`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: panKYCData,
    };
    //make call to the pan kyc api
    const panKYCResp = await axios(panKYCConfig);
    if (panKYCResp.data?.data?.result) {
      complianceData.pan_status = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true, data: panKYCResp.data };
    } else {
      complianceData.pan_status = 'N';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return {
        success: false,
      };
    }
  } catch (error) {
    complianceData.pan_status = 'N';
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const NameMatchWithCKYC = async (req, ckycData, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    name_match: '',
    name_match_conf: '',
    cust_id: data.cust_id,
  };
  const fName = data.first_name ? data.first_name.trim() : '';
  const mName = data.middle_name ? data.middle_name.trim() : '';
  let lName =
    data.last_name &&
    !/null|[^A-Za-z\s.]|\.\s\./i.test(data.last_name.replace(/\s+/g, ' '))
      ? data.last_name.trim()
      : '';
  if (data.last_name === '.') {
    lName = '';
  }
  let userFullName = `${fName || ''} ${mName || ''} ${lName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
  var fullName = ckycData.split(' ');
  var firstName = fullName[1];
  var middleName = '';
  if (fullName.length === 4) {
    middleName = fullName[2];
  }
  var lastName = fullName[fullName.length - 1];
  const nameMatchData = {
    input_fname: data.first_name,
    input_mname: data.middle_name,
    input_lname: data.last_name,
    input_name: userFullName,
    kyc_fname: firstName,
    kyc_mname: middleName,
    kyc_lname: lastName,
    kyc_name: ckycData,
    type: 'individual',
  };
  try {
    //prepare config data to make call to the pan kyc api
    const nameMatchConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/kz-name`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: nameMatchData,
    };
    //make call to the pan kyc api
    const nameMatchResp = await axios(nameMatchConfig);
    complianceData.name_match_conf = nameMatchResp.data?.data?.result?.score;
    if (nameMatchResp.data?.data?.result?.score >= 0.6) {
      complianceData.name_match = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return {
        success: true,
        name_match_conf: nameMatchResp.data?.data?.result?.score,
      };
    } else {
      complianceData.name_match = 'N';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return {
        success: false,
        name_match_conf: nameMatchResp.data?.data?.result?.score,
      };
    }
  } catch (error) {
    complianceData.name_match = null;
    complianceData.name_match_conf = null;
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const NameMatchWithPAN = async (req, panName, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    name_match: '',
    name_match_conf: '',
    cust_id: data.cust_id,
  };
  const fName = data.first_name ? data.first_name.trim() : '';
  const mName = data.middle_name ? data.middle_name.trim() : '';
  let lName =
    data.last_name &&
    !/null|[^A-Za-z\s.]|\.\s\./i.test(data.last_name.replace(/\s+/g, ' '))
      ? data.last_name.trim()
      : '';
  if (data.last_name === '.') {
    lName = '';
  }
  let userFullName = `${fName || ''} ${mName || ''} ${lName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
  var fullName = panName.split(' ');
  var firstName = fullName[1];
  var middleName = '';
  if (fullName.length === 4) {
    middleName = fullName[2];
  }
  var lastName = fullName[fullName.length - 1];
  const nameMatchData = {
    input_fname: data.first_name,
    input_mname: data.middle_name,
    input_lname: data.last_name,
    input_name: userFullName,
    kyc_fname: firstName,
    kyc_mname: middleName,
    kyc_lname: lastName,
    kyc_name: panName,
    type: 'individual',
  };
  try {
    //prepare config data to make call to the pan kyc api
    const nameMatchConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/kz-name`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: nameMatchData,
    };
    //make call to the pan kyc api
    const nameMatchResp = await axios(nameMatchConfig);
    complianceData.name_match_conf = nameMatchResp.data?.data?.result?.score;
    if (nameMatchResp.data?.data?.result?.score >= 0.6) {
      complianceData.name_match = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true };
    } else {
      complianceData.name_match = 'N';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: false };
    }
  } catch (error) {
    complianceData.name_match = null;
    complianceData.name_match_conf = null;
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const NameMatchWithOcrOrParseData = async (req, loanReq, parsedData, type) => {
  const fName = loanReq.first_name ? loanReq.first_name : '';
  const lName = loanReq.last_name ? loanReq.last_name : '';
  let nameMatchData;
  if (type == 'aadhaar') {
    const aadhaar_mname = parsedData.aadhaar_mnname
      ? parsedData.aadhaar_mnname
      : '';
    //prepare data for aadhaar match
    nameMatchData = {
      input_fname: fName,
      input_lname: loanReq.last_name,
      input_name: `${fName} ${lName}`,
      kyc_fname: parsedData.aadhar_first_name,
      kyc_mname: aadhaar_mname,
      kyc_lname: parsedData.aadhaar_last_name,
      kyc_name: `${parsedData.aadhar_first_name} ${aadhaar_mname} ${parsedData.aadhaar_last_name}`,
      type: 'individual',
    };
  } else {
    const pan_mname = parsedData.pan_mname ? parsedData.pan_mname : '';
    //prepare data for pan match
    nameMatchData = {
      input_fname: fName,
      input_lname: loanReq.last_name,
      input_name: `${fName} ${lName}`,
      kyc_fname: parsedData.pan_first_name,
      kyc_mname: pan_mname,
      kyc_lname: parsedData.pan_last_name,
      kyc_name: `${parsedData.pan_first_name} ${pan_mname} ${parsedData.pan_last_name}`,
      type: 'individual',
    };
  }

  try {
    //prepare config data to make call to the pan kyc api
    const nameMatchConfig = {
      method: 'POST',
      url: `${process.env.SERVICE_MS_URL}/api/kz-name`,
      headers: {
        Authorization: process.env.SERVICE_MS_TOKEN,
        'Content-Type': 'application/json',
      },
      data: nameMatchData,
    };
    //make call to the pan kyc api
    const nameMatchResp = await axios(nameMatchConfig);
    const name_match_conf = nameMatchResp.data?.data?.result?.score;
    if (name_match_conf >= 0.6) {
      return { success: true };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.log('error >>', error);
    return {
      success: false,
    };
  }
};

const PinMatchWithCKYC = async (req, corresPin, permPin, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    pincode_match: '',
    pincode_match_add_type: '',
    cust_id: data.cust_id,
  };
  try {
    //get kyc compliance data in table
    const getCompliance = await Compliance.findByLoanAppId(data.loan_app_id);

    if (data.pincode === corresPin) {
      complianceData.pincode_match = 'Y';
      complianceData.pincode_match_add_type = 'C';

      //update ckyc match if ckyc status , name_match and pincode_match are "Y"
      if (
        getCompliance[0].name_match == 'Y' &&
        getCompliance[0].ckyc_status == 'Y'
      ) {
        complianceData.ckyc_match = 'Y';
      } else {
        complianceData.ckyc_match = 'N';
      }

      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true };
    } else if (data.pincode === permPin) {
      complianceData.pincode_match = 'Y';
      complianceData.pincode_match_add_type = 'P';

      //update ckyc match if ckyc status , name_match and pincode_match are "Y"
      if (
        getCompliance[0].name_match == 'Y' &&
        getCompliance[0].ckyc_status == 'Y'
      ) {
        complianceData.ckyc_match = 'Y';
      } else {
        complianceData.ckyc_match = 'N';
      }

      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true };
    } else {
      complianceData.pincode_match = 'N';
      complianceData.pincode_match_add_type = 'N';
      complianceData.ckyc_match = 'N';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true };
    }
  } catch (error) {
    complianceData.name_match = null;
    complianceData.name_match_conf = null;
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const OKYC = async (data, partnerName) => {
  try {
    //prepare config data to make call to the okyc api
    const fName = data.first_name ? data.first_name : '';
    const mName = data.middle_name ? data.middle_name : '';
    const lName = data.last_name ? data.last_name : '';
    const OKYCData = {
      partner_name: partnerName,
      loan_app_id: data.loan_app_id,
      loan_id: data.partner_loan_app_id,
      partner_id: data.partner_borrower_id,
      borrower_name: `${fName} ${mName} ${lName}`,
      phone_number: data.appl_phone,
      loan_amount: data.sanction_amount,
      origin: 2,
    };
    const OKYCConfig = {
      method: 'POST',
      url: `${process.env.OKYC_URL}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.OKYC_AUTHORIZATION}`,
      },
      data: OKYCData,
    };
    //make call to the pan kyc api
    const OKYCResp = await axios(OKYCConfig);
    return {
      data: OKYCResp.data,
    };
  } catch (error) {
    return {
      success: 'fail',
      message: 'cannot fetch data from okyc api',
    };
  }
};
const BureauServiceCall = async (req, res, data) => {
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  try {
    //check if bureau call is already made for loan_app_id or partner_loan_id
    const bureauRecordExist = await BureauDetailsSchema.findOneWithLAIDAndPLID(
      data.loan_app_id,
      data.partner_loan_app_id,
    );
    // If bureau record exist then update bureau_status as Y in compliance table
    if (bureauRecordExist) {
      complianceData.bureau_status = 'Y';
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
    }

    // Call Bureau service according to partner name
    switch (req.product.bureau_partner_name.toUpperCase()) {
      case 'CRIF':
        return BureauCrif(req, res, data);
      case 'CIBIL':
        return BureauCibil(req, res, data);
      default:
        return null;
    }
  } catch (error) {
    console.log('BureauServiceCall error', error);
    return error;
  }
};

const BureauCrif = async (req, res, data) => {
  const calculatedAge = getAge(new Date(data.dob).getFullYear());
  const mappedStateCode = data.state
    ? stateCode.stateCodeMapping[data.state.toUpperCase()]
    : '';
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  try {
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
      borrower_address: data.resi_addr_ln1,
      borrower_city: data.city,
      borrower_state: mappedStateCode,
      borrower_pincode: data.pincode,
      enquiry_purpose: 'ACCT-ORIG',
      enquiry_stage: 'PRE-SCREEN',
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
    const crifResp = await axios(crifConfig);
    if (crifResp.data) {
      complianceData.bureau_status = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true };
    }
  } catch (error) {
    complianceData.bureau_status = 'N';
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

const BureauCibil = async (req, res, data) => {
  //prepare data to record in kyc service compliance table
  let complianceData = {
    company_id: req.company._id,
    product_id: req.product._id,
    loan_app_id: data.loan_app_id,
    pan: data.appl_pan,
    dob: data.dob,
    cust_id: data.cust_id,
  };
  try {
    const mappedStateCode = data.state
      ? stateConvertion.stateConvertionMapping[data.state.toUpperCase()]
      : '';
    // Prepare address as per length for cibil api
    const address = await generateAddress(data.resi_addr_ln1);
    //prepare config data to make call to the cibil api
    const cibilData = {
      enquiry_purpose: '05',
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
      add_state_code_1: mappedStateCode,
      add_pin_code_1: data.pincode,
      add_address_category_1: '02',
      en_acc_account_number_1: ' ',
      loan_app_id: data.loan_app_id,
      consent: 'Y',
      consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
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
    const cibilResp = await axios(cibilConfig);
    if (cibilResp.data) {
      complianceData.bureau_status = 'Y';
      //record kyc compliance data in table
      const recordCompliance = await Compliance.findIfExistAndRecord(
        data.loan_app_id,
        complianceData,
      );
      return { success: true, cibilResp: cibilResp.data };
    }
  } catch (error) {
    complianceData.bureau_status = 'N';
    //record kyc compliance data in table
    const recordCompliance = await Compliance.findIfExistAndRecord(
      data.loan_app_id,
      complianceData,
    );
    return {
      success: false,
    };
  }
};

module.exports = {
  CKYCSearch,
  PanKYC,
  OKYC,
  NameMatchWithCKYC,
  NameMatchWithPAN,
  PinMatchWithCKYC,
  CKYCDownload,
  BureauCrif,
  BureauServiceCall,
  getAge,
  generateAddress,
  NameMatchWithOcrOrParseData,
};

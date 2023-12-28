const bodyParser = require('body-parser');
const jwt = require('../../util/jwt');
const BorrowerInfo = require('../../models/borrowerinfo-common-schema');
const LoanRequest = require('../../models/loan-request-schema');
const Compliance = require('../../models/compliance-schema');
const loanDocument = require('../../models/loandocument-common-schema');
const puppeteer = require('puppeteer');
let ejs = require('ejs');
const xml2js = require('xml2js');
var parser = new xml2js.Parser();
const s3helper = require('../../util/s3helper');
const DocumentMappingSchema = require('../../models/document-mappings-schema.js');

var {
  kyc_data_validator,
} = require('../../validator/kyc/kyc_payload_validator');
const {
  OvdService,
  smartParserService,
} = require('../../utils/ovd_service/ovd_service');
/**
 * Processing Aadhar/Pan=>XML/JSON
 * @author Tarun Kr Singh
 * @param {*} app
 * @param {*} connection
 * @return {*} 200, In case file is uploaded Successfully
 * @throws {*} 400, with document code
 */
module.exports = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  //TPARTY-206 task url
  app.post(
    '/api/kyc/loandocument/parser',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        let inputs = req.body;
        // validate the inputs
        const errors = await kyc_data_validator(inputs);
        if (Object.keys(errors).length > 0 && errors.constructor === Object) {
          throw {
            code: 422,
            success: false,
            message: 'Invalid Payload.',
            errors: errors,
          };
        }
        //now verify loan app id
        var loan_app = await LoanRequest.findIfExists(inputs.loan_app_id);
        if (!loan_app) {
          throw {
            success: false,
            message: 'Invalid Loan App ID',
          };
        }
        const documentMappings = await DocumentMappingSchema.getAll();
        let documentMapping = {};
        for await (let ele of documentMappings) {
          documentMapping[ele.doc_code] = ele.doc_type;
        }
        //fetch document type
        let document_type =
          req.body.code == '114'
            ? 'Aadhaar'
            : req.body.code == '116'
            ? 'Pan'
            : '';
        if (document_type == '') {
          throw {
            success: false,
            message: `Invalid document received, ${req.body.code}`,
          };
        }
        // fetch parser type from loan app id
        let raw_parser;
        if (document_type == 'Aadhaar') {
          raw_parser = JSON.parse(JSON.stringify(req.product)).aadhaar_type;
        } else if (document_type == 'Pan') {
          raw_parser = JSON.parse(JSON.stringify(req.product)).pan_type;
        }
        let borrower_id = loan_app.borrower_id;
        let global_doc_stage;
        let borrower_info = await BorrowerInfo.findOneWithKBI(borrower_id);

        if (!borrower_info) {
          global_doc_stage = 'pre_approval';
        } else {
          let raw_doc_stage = borrower_info.stage;
          if (raw_doc_stage == 0) {
            global_doc_stage = 'pre_approval';
          } else if (raw_doc_stage == 1) {
            global_doc_stage = 'post_approval';
          } else if (raw_doc_stage == 2) {
            global_doc_stage = 'post_disbursal';
          }
        }

        let pan_resp_object = {
          pan_fname: '',
          pan_mname: '',
          pan_lname: '',
        };
        let aadhaar_resp_object = {
          aadhaar_fname: '',
          aadhaar_lname: '',
          aadhaar_mname: '',
          aadhaar_dob: '',
          aadhaar_pincode: '',
          parsed_aadhaar_number: '',
        };
        if (raw_parser == 'Aadhaar-UIDAI' && document_type == 'Aadhaar') {
          try {
            let bufferObj;
            let decodedString;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = bufferObj.toString('utf8');
              var xml_json;
              parser.parseString(decodedString, function (err, result) {
                xml_json = result;
              });
            } catch (e) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let personal_data =
              xml_json.OfflinePaperlessKyc.UidData[0].Poi[0].$;
            let address_data = xml_json.OfflinePaperlessKyc.UidData[0].Poa[0].$;
            let refrence_id = xml_json.OfflinePaperlessKyc.$.referenceId;
            let name_arr = personal_data.name.split(' ');
            let date_arr = personal_data.dob.split('-');
            aadhaar_resp_object.aadhaar_fname = name_arr[0];
            aadhaar_resp_object.aadhaar_lname =
              name_arr.length > 1 ? name_arr[name_arr.length - 1] : '';
            aadhaar_resp_object.aadhaar_mname =
              name_arr.length == 3 ? name_arr[1] : '';
            aadhaar_resp_object.aadhaar_dob =
              date_arr.length > 1
                ? `${date_arr[2]}-${date_arr[1]}-${date_arr[0]}`
                : '';
            aadhaar_resp_object.aadhaar_pincode = address_data.pc;
            aadhaar_resp_object.parsed_aadhaar_number = `xxxxxxxx${refrence_id.slice(
              0,
              4,
            )}`;
            //validate pincode
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;

            if (
              aadhaar_resp_object.aadhaar_fname == undefined &&
              aadhaar_resp_object.aadhaar_lname == undefined &&
              aadhaar_resp_object.aadhaar_dob == undefined &&
              aadhaar_resp_object.aadhaar_pincode == undefined &&
              aadhaar_resp_object.parsed_aadhaar_number == undefined
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            if (aadhaar_resp_object.aadhaar_fname == undefined) {
              aadhaar_resp_object.aadhaar_fname = '';
            }
            if (aadhaar_resp_object.aadhaar_lname == undefined) {
              aadhaar_resp_object.aadhaar_lname = '';
            }
            if (aadhaar_resp_object.aadhaar_dob == undefined) {
              aadhaar_resp_object.aadhaar_dob = '';
            }
            if (aadhaar_resp_object.aadhaar_pincode == undefined) {
              aadhaar_resp_object.aadhaar_pincode = '';
            }
            if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
              aadhaar_resp_object.parsed_aadhaar_number = '';
            }
            if (
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let aadhaar_verified_flag = 'N';
            if (
              aadhaar_resp_object.aadhaar_fname.length > 0 &&
              aadhaar_resp_object.aadhaar_dob.length > 0 &&
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              aadhaar_resp_object.parsed_aadhaar_number.length > 0
            ) {
              aadhaar_verified_flag = 'Y';
            }
            //insert into collection started
            var db_flag = false;
            aadhaar_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(aadhaar_resp_object);
              db_flag = true;
            } catch (e) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              // loan_id: raw_db_flag_resp.loan_id,
              parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
              aadhaar_received: 'Y',
              aadhaar_verified: aadhaar_verified_flag,
              aadhaar_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );
            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (e) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };
            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }
            if (db_flag == true && s3_flag == true) {
              //lets create ovd
              try {
                if (aadhaar_verified_flag == 'Y') {
                  let ajx_inputs = {
                    image: xml_json.OfflinePaperlessKyc.UidData[0].Pht
                      ? `data:image/png;base64,${xml_json.OfflinePaperlessKyc.UidData[0].Pht}`
                      : '',
                    mode: 'OfflinePaperlessKYC',
                    ref: '',
                    aadhaarId: aadhaar_resp_object.parsed_aadhaar_number,
                    shareCode: '',
                    timestamp: new Date().toUTCString(),
                    name: personal_data.name ? personal_data.name : '',
                    mobile: '',
                    dob: `${date_arr[0]}-${date_arr[1]}-${date_arr[2]}`,
                    gender: personal_data.gender ? personal_data.gender : '',
                    email: '',
                    co: address_data.careof ? address_data.careof : '',
                    house: address_data.house ? address_data.house : '',
                    street: address_data.street ? address_data.street : '',
                    landmark: address_data.landmark
                      ? address_data.landmark
                      : '',
                    locality: address_data.loc ? address_data.loc : '',
                    pincode: aadhaar_resp_object.aadhaar_pincode,
                    po: address_data.po ? address_data.po : '',
                    district: address_data.dist ? address_data.dist : '',
                    sub_district: address_data.subdist
                      ? address_data.subdist
                      : '',
                    vtc: address_data.vtc ? address_data.vtc : '',
                    state: address_data.state ? address_data.state : '',
                  };
                  ///call ovd service to genrate ovd
                  const ovd_response = await OvdService(ajx_inputs);
                  if (ovd_response.success == false) {
                    throw {
                      success: false,
                      message: `Error while generating ovd`,
                    };
                  }
                  let created_ovd_file = ovd_response.ovd_resp;
                  //uploading ovd to s3
                  const key2 = `loandocument/${
                    JSON.parse(JSON.stringify(req.company)).code
                      ? JSON.parse(JSON.stringify(req.company)).code
                      : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${inputs.loan_app_id}/117.txt`;
                  let upload_ovd_file;
                  try {
                    upload_ovd_file = await s3helper.uploadFileToS3(
                      created_ovd_file,
                      key2,
                    );
                  } catch (err) {
                    throw {
                      success: false,
                      message:
                        err?.message ||
                        `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }
                  let ovd_loan_document_data = {
                    file_url: upload_ovd_file.Location,
                    file_type: documentMapping['117'],
                  };
                  let loan_document_common_ovd_resp;
                  try {
                    loan_document_common_ovd_resp =
                      await loanDocument.findByIdAndCodeThenUpdate(
                        '117',
                        inputs.loan_app_id,
                        ovd_loan_document_data,
                      );
                  } catch (err) {
                    throw {
                      success: false,
                      message:
                        err?.message ||
                        `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }

                  let loan_document_common_ovd_resp2;
                  if (loan_document_common_ovd_resp == null) {
                    //new row we have to add
                    try {
                      let new_ovd_row_data = {
                        company_id: raw_db_flag_resp.company_id,
                        loan_app_id: raw_db_flag_resp.loan_app_id,
                        partner_loan_app_id:
                          raw_db_flag_resp.partner_loan_app_id,
                        borrower_id: raw_db_flag_resp.borrower_id,
                        doc_stage: global_doc_stage,
                        file_url: ovd_loan_document_data.file_url,
                        file_type: ovd_loan_document_data.file_type,
                        code: '117',
                      };
                      loan_document_common_ovd_resp2 =
                        await loanDocument.addNew(new_ovd_row_data);
                    } catch (e) {
                      throw {
                        success: false,
                        message:
                          e?.message ||
                          `Invalid document received, ${req.body.code}`,
                      };
                    }
                  }
                }
              } catch (err) {
                throw {
                  success: false,
                  message: `OVD ERROR`,
                  error: err,
                };
              }
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message:
                err?.message || `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (
          raw_parser == 'Aadhaar-Digilocker' &&
          document_type == 'Aadhaar'
        ) {
          try {
            let bufferObj;
            let decodedString;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = JSON.parse(bufferObj.toString('utf8'));
            } catch (e) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let name_arr =
              decodedString.actions[0].details.aadhaar.name.split(' ');
            var date_arr =
              decodedString.actions[0].details.aadhaar.dob.split('/');
            aadhaar_resp_object.aadhaar_fname = name_arr[0];
            aadhaar_resp_object.aadhaar_lname =
              name_arr.length > 1 ? name_arr[name_arr.length - 1] : '';
            aadhaar_resp_object.aadhaar_mname =
              name_arr.length == 3 ? name_arr[1] : '';
            aadhaar_resp_object.aadhaar_dob =
              date_arr.length > 1
                ? `${date_arr[2]}-${date_arr[1]}-${date_arr[0]}`
                : 0;
            aadhaar_resp_object.aadhaar_pincode =
              decodedString.actions[0].details.aadhaar.currentAddressDetails.pincode;
            aadhaar_resp_object.parsed_aadhaar_number =
              decodedString.actions[0].details.aadhaar.idNumber;
            //now check if anything invalid or not
            //validate pincode
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;
            if (
              aadhaar_resp_object.aadhaar_fname == undefined &&
              aadhaar_resp_object.aadhaar_lname == undefined &&
              aadhaar_resp_object.aadhaar_dob == undefined &&
              aadhaar_resp_object.aadhaar_pincode == undefined &&
              aadhaar_resp_object.parsed_aadhaar_number == undefined
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            if (aadhaar_resp_object.aadhaar_fname == undefined) {
              aadhaar_resp_object.aadhaar_fname = '';
            }
            if (aadhaar_resp_object.aadhaar_lname == undefined) {
              aadhaar_resp_object.aadhaar_lname = '';
            }
            if (aadhaar_resp_object.aadhaar_dob == undefined) {
              aadhaar_resp_object.aadhaar_dob = '';
            }
            if (aadhaar_resp_object.aadhaar_pincode == undefined) {
              aadhaar_resp_object.aadhaar_pincode = '';
            }
            if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
              aadhaar_resp_object.parsed_aadhaar_number = '';
            }
            if (
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let aadhaar_verified_flag = 'N';
            if (
              aadhaar_resp_object.aadhaar_fname.length > 0 &&
              aadhaar_resp_object.aadhaar_dob.length > 0 &&
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              aadhaar_resp_object.parsed_aadhaar_number.length > 0
            ) {
              aadhaar_verified_flag = 'Y';
            }
            //insert into collection started
            var db_flag = false;
            aadhaar_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(aadhaar_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
              aadhaar_received: 'Y',
              aadhaar_verified: aadhaar_verified_flag,
              aadhaar_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );
            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };
            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }
            if (db_flag == true && s3_flag == true) {
              //lets create ovd
              try {
                if (aadhaar_verified_flag == 'Y') {
                  let address_arr =
                    decodedString.actions[0].details.aadhaar.permanentAddressDetails.address.split(
                      ',',
                    );
                  var care_off = '';
                  var house_off = '';
                  //check if care of is present or not
                  if (
                    address_arr[0].split(' ')[0] == 'S/O' ||
                    address_arr[0].split(' ')[0] == 'C/O' ||
                    address_arr[0].split(' ')[0] == 'D/O'
                  ) {
                    care_off = address_arr[0];
                    house_off = address_arr[1];
                  } else {
                    house_off = address_arr[0];
                  }
                  let ajx_inputs = {
                    image: decodedString.actions[0].details.aadhaar.image
                      ? `data:image/png;base64,${decodedString.actions[0].details.aadhaar.image}`
                      : '',
                    mode: 'OfflinePaperlessKYC',
                    ref: '',
                    aadhaarId: aadhaar_resp_object.parsed_aadhaar_number,
                    shareCode: '',
                    timestamp: new Date().toUTCString(),
                    name: decodedString.actions[0].details.aadhaar.name
                      ? decodedString.actions[0].details.aadhaar.name
                      : '',
                    mobile: '',
                    dob: `${date_arr[0]}-${date_arr[1]}-${date_arr[2]}`,
                    gender: decodedString.actions[0].details.aadhaar.gender
                      ? decodedString.actions[0].details.aadhaar.gender
                      : '',
                    email: '',
                    co: care_off,
                    house: house_off,
                    street: '',
                    landmark: '',
                    locality: decodedString.actions[0].details.aadhaar
                      .permanentAddressDetails.localityOrPostOffice
                      ? decodedString.actions[0].details.aadhaar
                          .permanentAddressDetails.localityOrPostOffice
                      : '',
                    pincode: aadhaar_resp_object.aadhaar_pincode,
                    po: decodedString.actions[0].details.aadhaar
                      .permanentAddressDetails.localityOrPostOffice
                      ? decodedString.actions[0].details.aadhaar
                          .permanentAddressDetails.localityOrPostOffice
                      : '',
                    district: decodedString.actions[0].details.aadhaar
                      .permanentAddressDetails.districtOrCity
                      ? decodedString.actions[0].details.aadhaar
                          .permanentAddressDetails.districtOrCity
                      : '',
                    sub_district: '',
                    vtc: decodedString.actions[0].details.aadhaar
                      .permanentAddressDetails.districtOrCity
                      ? decodedString.actions[0].details.aadhaar
                          .permanentAddressDetails.districtOrCity
                      : '',
                    state: decodedString.actions[0].details.aadhaar
                      .permanentAddressDetails.state
                      ? decodedString.actions[0].details.aadhaar
                          .permanentAddressDetails.state
                      : '',
                  };

                  ///call ovd service to genrate ovd
                  const ovd_response = await OvdService(ajx_inputs);
                  if (ovd_response.success == false) {
                    throw {
                      success: false,
                      message: `Error while generating ovd`,
                    };
                  }
                  let created_ovd_file = ovd_response.ovd_resp;
                  //uploading ovd to s3
                  const key2 = `loandocument/${
                    JSON.parse(JSON.stringify(req.company)).code
                      ? JSON.parse(JSON.stringify(req.company)).code
                      : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${inputs.loan_app_id}/117.txt`;
                  let upload_ovd_file;
                  try {
                    upload_ovd_file = await s3helper.uploadFileToS3(
                      created_ovd_file,
                      key2,
                    );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }
                  let ovd_loan_document_data = {
                    file_url: upload_ovd_file.Location,
                    file_type: documentMapping['117'],
                  };
                  let loan_document_common_ovd_resp;
                  try {
                    loan_document_common_ovd_resp =
                      await loanDocument.findByIdAndCodeThenUpdate(
                        '117',
                        inputs.loan_app_id,
                        ovd_loan_document_data,
                      );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }

                  let loan_document_common_ovd_resp2;
                  if (loan_document_common_ovd_resp == null) {
                    //new row we have to add
                    try {
                      let new_ovd_row_data = {
                        company_id: raw_db_flag_resp.company_id,
                        loan_app_id: raw_db_flag_resp.loan_app_id,
                        partner_loan_app_id:
                          raw_db_flag_resp.partner_loan_app_id,
                        borrower_id: raw_db_flag_resp.borrower_id,
                        doc_stage: global_doc_stage,
                        file_url: ovd_loan_document_data.file_url,
                        file_type: ovd_loan_document_data.file_type,
                        code: '117',
                      };
                      loan_document_common_ovd_resp2 =
                        await loanDocument.addNew(new_ovd_row_data);
                    } catch (e) {
                      throw {
                        success: false,
                        message: `Invalid document received, ${req.body.code}`,
                      };
                    }
                  }
                }
              } catch (err) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                  error: err,
                };
              }
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (
          raw_parser == 'Aadhaar-KARZA' &&
          document_type == 'Aadhaar'
        ) {
          try {
            let bufferObj;
            let decodedString;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = JSON.parse(bufferObj.toString('utf8'));
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            if (!decodedString.hasOwnProperty('data')) {
              decodedString = {
                data: { ...decodedString },
              };
            }
            let name_arr =
              decodedString.data.result.dataFromAadhaar.name.split(' ');
            aadhaar_resp_object.aadhaar_fname = name_arr[0];
            aadhaar_resp_object.aadhaar_lname =
              name_arr.length > 1 ? name_arr[name_arr.length - 1] : '';
            aadhaar_resp_object.aadhaar_mname =
              name_arr.length == 3 ? name_arr[1] : '';
            aadhaar_resp_object.aadhaar_dob =
              decodedString.data.result.dataFromAadhaar.dob;
            aadhaar_resp_object.aadhaar_pincode =
              decodedString.data.result.dataFromAadhaar.address.splitAddress.pincode;
            aadhaar_resp_object.parsed_aadhaar_number = `xxxxxxxx${decodedString.data.result.dataFromAadhaar.maskedAadhaarNumber.substr(
              -4,
            )}`;
            //now check if anything invalid or not
            //validate pincode
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;
            if (
              aadhaar_resp_object.aadhaar_fname == undefined &&
              aadhaar_resp_object.aadhaar_lname == undefined &&
              aadhaar_resp_object.aadhaar_dob == undefined &&
              aadhaar_resp_object.aadhaar_pincode == undefined &&
              aadhaar_resp_object.parsed_aadhaar_number == undefined
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            if (aadhaar_resp_object.aadhaar_fname == undefined) {
              aadhaar_resp_object.aadhaar_fname = '';
            }
            if (aadhaar_resp_object.aadhaar_lname == undefined) {
              aadhaar_resp_object.aadhaar_lname = '';
            }
            if (aadhaar_resp_object.aadhaar_dob == undefined) {
              aadhaar_resp_object.aadhaar_dob = '';
            }
            if (aadhaar_resp_object.aadhaar_pincode == undefined) {
              aadhaar_resp_object.aadhaar_pincode = '';
            }
            if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
              aadhaar_resp_object.parsed_aadhaar_number = '';
            }
            if (
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let aadhaar_verified_flag = 'N';
            if (
              aadhaar_resp_object.aadhaar_fname.length > 0 &&
              aadhaar_resp_object.aadhaar_dob.length > 0 &&
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              aadhaar_resp_object.parsed_aadhaar_number.length > 0
            ) {
              aadhaar_verified_flag = 'Y';
            }
            //insert into collection started
            var db_flag = false;
            aadhaar_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(aadhaar_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
              aadhaar_received: 'Y',
              aadhaar_verified: aadhaar_verified_flag,
              aadhaar_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );
            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };
            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }
            if (db_flag == true && s3_flag == true) {
              //lets create ovd
              try {
                if (aadhaar_verified_flag == 'Y') {
                  let date_arr = aadhaar_resp_object.aadhaar_dob.split('-');
                  // intilize chromium browser
                  let ajx_inputs = {
                    image: decodedString.data.result.dataFromAadhaar.image
                      ? `data:image/png;base64,${decodedString.data.result.dataFromAadhaar.image}`
                      : '',
                    mode: 'OfflinePaperlessKYC',
                    ref: '',
                    aadhaarId: aadhaar_resp_object.parsed_aadhaar_number,
                    shareCode: '',
                    timestamp: new Date().toUTCString(),
                    name: decodedString.data.result.dataFromAadhaar.name
                      ? decodedString.data.result.dataFromAadhaar.name
                      : '',
                    mobile: '',
                    dob: `${date_arr[2]}-${date_arr[1]}-${date_arr[0]}`,
                    gender: decodedString.data.result.dataFromAadhaar.gender
                      ? decodedString.data.result.dataFromAadhaar.gender
                      : '',
                    email: '',
                    co: '',
                    house: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.houseNumber
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.houseNumber
                      : '',
                    street: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.street
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.street
                      : '',
                    landmark: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.landmark
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.landmark
                      : '',
                    locality: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.location
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.location
                      : '',
                    pincode: aadhaar_resp_object.aadhaar_pincode,
                    po: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.postOffice
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.postOffice
                      : '',
                    district: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.district
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.district
                      : '',
                    sub_district: decodedString.data.result.dataFromAadhaar
                      .address.splitAddress.subdistrict
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.subdistrict
                      : '',
                    vtc: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.vtcName
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.vtcName
                      : '',
                    state: decodedString.data.result.dataFromAadhaar.address
                      .splitAddress.state
                      ? decodedString.data.result.dataFromAadhaar.address
                          .splitAddress.state
                      : '',
                  };

                  ///call ovd service to genrate ovd
                  const ovd_response = await OvdService(ajx_inputs);
                  if (ovd_response.success == false) {
                    throw {
                      success: false,
                      message: `Error while generating ovd`,
                    };
                  }
                  let created_ovd_file = ovd_response.ovd_resp;
                  //uploading ovd to s3
                  const key2 = `loandocument/${
                    JSON.parse(JSON.stringify(req.company)).code
                      ? JSON.parse(JSON.stringify(req.company)).code
                      : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${inputs.loan_app_id}/117.txt`;
                  let upload_ovd_file;
                  try {
                    upload_ovd_file = await s3helper.uploadFileToS3(
                      created_ovd_file,
                      key2,
                    );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }
                  let ovd_loan_document_data = {
                    file_url: upload_ovd_file.Location,
                    file_type: documentMapping['117'],
                  };
                  let loan_document_common_ovd_resp;
                  try {
                    loan_document_common_ovd_resp =
                      await loanDocument.findByIdAndCodeThenUpdate(
                        '117',
                        inputs.loan_app_id,
                        ovd_loan_document_data,
                      );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }

                  let loan_document_common_ovd_resp2;
                  if (loan_document_common_ovd_resp == null) {
                    //new row we have to add
                    try {
                      let new_ovd_row_data = {
                        company_id: raw_db_flag_resp.company_id,
                        loan_app_id: raw_db_flag_resp.loan_app_id,
                        partner_loan_app_id:
                          raw_db_flag_resp.partner_loan_app_id,
                        borrower_id: raw_db_flag_resp.borrower_id,
                        doc_stage: global_doc_stage,
                        file_url: ovd_loan_document_data.file_url,
                        file_type: ovd_loan_document_data.file_type,
                        code: '117',
                      };
                      loan_document_common_ovd_resp2 =
                        await loanDocument.addNew(new_ovd_row_data);
                    } catch (e) {
                      throw {
                        success: false,
                        message: `Invalid document received, ${req.body.code}`,
                      };
                    }
                  }
                }
              } catch (err) {
                throw {
                  success: false,
                  message: `OVD ERROR`,
                  error: err,
                };
              }
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (
          raw_parser == 'Aadhaar-Digio' &&
          document_type == 'Aadhaar'
        ) {
          try {
            let bufferObj;
            let decodedString;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = bufferObj.toString('utf8');

              var xml_json;
              parser.parseString(decodedString, function (err, result) {
                xml_json = result;
              });
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let personal_data =
              xml_json.Certificate.CertificateData[0].KycRes[0].UidData[0]
                .Poi[0].$;
            let address_data =
              xml_json.Certificate.CertificateData[0].KycRes[0].UidData[0]
                .Poa[0].$;
            let refrence_id =
              xml_json.Certificate.CertificateData[0].KycRes[0].UidData[0].$
                .uid;
            let name_arr = personal_data.name.split(' ');
            let date_arr = personal_data.dob.split('-');
            aadhaar_resp_object.aadhaar_fname = name_arr[0];
            aadhaar_resp_object.aadhaar_lname =
              name_arr.length > 1 ? name_arr[name_arr.length - 1] : '';
            aadhaar_resp_object.aadhaar_mname =
              name_arr.length == 3 ? name_arr[1] : '';
            aadhaar_resp_object.aadhaar_dob =
              date_arr.length > 1
                ? `${date_arr[2]}-${date_arr[1]}-${date_arr[0]}`
                : '';
            aadhaar_resp_object.aadhaar_pincode = address_data.pc;
            aadhaar_resp_object.parsed_aadhaar_number = `xxxxxxxx${refrence_id.substr(
              -4,
            )}`;

            //validate pincode
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;

            if (
              aadhaar_resp_object.aadhaar_fname == undefined &&
              aadhaar_resp_object.aadhaar_lname == undefined &&
              aadhaar_resp_object.aadhaar_dob == undefined &&
              aadhaar_resp_object.aadhaar_pincode == undefined &&
              aadhaar_resp_object.parsed_aadhaar_number == undefined
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            if (aadhaar_resp_object.aadhaar_fname == undefined) {
              aadhaar_resp_object.aadhaar_fname = '';
            }
            if (aadhaar_resp_object.aadhaar_lname == undefined) {
              aadhaar_resp_object.aadhaar_lname = '';
            }
            if (aadhaar_resp_object.aadhaar_dob == undefined) {
              aadhaar_resp_object.aadhaar_dob = '';
            }
            if (aadhaar_resp_object.aadhaar_pincode == undefined) {
              aadhaar_resp_object.aadhaar_pincode = '';
            }
            if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
              aadhaar_resp_object.parsed_aadhaar_number = '';
            }
            if (
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let aadhaar_verified_flag = 'N';
            if (
              aadhaar_resp_object.aadhaar_fname.length > 0 &&
              aadhaar_resp_object.aadhaar_dob.length > 0 &&
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              aadhaar_resp_object.parsed_aadhaar_number.length > 0
            ) {
              aadhaar_verified_flag = 'Y';
            }
            //insert into collection started

            var db_flag = false;
            aadhaar_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(aadhaar_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              // loan_id: raw_db_flag_resp.loan_id,
              parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
              aadhaar_received: 'Y',
              aadhaar_verified: aadhaar_verified_flag,
              aadhaar_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );

            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };

            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }

            if (db_flag == true && s3_flag == true) {
              //lets create ovd
              try {
                if (aadhaar_verified_flag == 'Y') {
                  let ajx_inputs = {
                    image: xml_json.Certificate.CertificateData[0].KycRes[0]
                      .UidData[0].Pht
                      ? `data:image/png;base64,${xml_json.Certificate.CertificateData[0].KycRes[0].UidData[0].Pht}`
                      : '',
                    mode: 'OfflinePaperlessKYC',
                    ref: '',
                    aadhaarId: aadhaar_resp_object.parsed_aadhaar_number,
                    shareCode: '',
                    timestamp: new Date().toUTCString(),
                    name: personal_data.name ? personal_data.name : '',
                    mobile: '',
                    dob: personal_data.dob ? personal_data.dob : '',
                    gender: personal_data.gender ? personal_data.gender : '',
                    email: '',
                    co: address_data.co ? address_data.co : '',
                    house: address_data.house ? address_data.house : '',
                    street: address_data.street ? address_data.street : '',
                    landmark: address_data.landmark
                      ? address_data.landmark
                      : '',
                    locality: address_data.loc ? address_data.loc : '',
                    pincode: aadhaar_resp_object.aadhaar_pincode,
                    po: address_data.po ? address_data.po : '',
                    district: address_data.dist ? address_data.dist : '',
                    sub_district: '',
                    vtc: address_data.vtc ? address_data.vtc : '',
                    state: address_data.state ? address_data.state : '',
                  };

                  //call ovd service to genrate ovd
                  const ovd_response = await OvdService(ajx_inputs);
                  if (ovd_response.success == false) {
                    throw {
                      success: false,
                      message: `Error while generating ovd`,
                    };
                  }
                  let created_ovd_file = ovd_response.ovd_resp;
                  //uploading ovd to s3
                  const key2 = `loandocument/${
                    JSON.parse(JSON.stringify(req.company)).code
                      ? JSON.parse(JSON.stringify(req.company)).code
                      : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${inputs.loan_app_id}/117.txt`;
                  let upload_ovd_file;
                  try {
                    upload_ovd_file = await s3helper.uploadFileToS3(
                      created_ovd_file,
                      key2,
                    );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }
                  let ovd_loan_document_data = {
                    file_url: upload_ovd_file.Location,
                    file_type: documentMapping['117'],
                  };
                  let loan_document_common_ovd_resp;
                  try {
                    loan_document_common_ovd_resp =
                      await loanDocument.findByIdAndCodeThenUpdate(
                        '117',
                        inputs.loan_app_id,
                        ovd_loan_document_data,
                      );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }

                  let loan_document_common_ovd_resp2;
                  if (loan_document_common_ovd_resp == null) {
                    //new row we have to add
                    try {
                      let new_ovd_row_data = {
                        company_id: raw_db_flag_resp.company_id,
                        loan_app_id: raw_db_flag_resp.loan_app_id,
                        partner_loan_app_id:
                          raw_db_flag_resp.partner_loan_app_id,
                        borrower_id: raw_db_flag_resp.borrower_id,
                        doc_stage: global_doc_stage,
                        file_url: ovd_loan_document_data.file_url,
                        file_type: ovd_loan_document_data.file_type,
                        code: '117',
                      };
                      loan_document_common_ovd_resp2 =
                        await loanDocument.addNew(new_ovd_row_data);
                    } catch (e) {
                      throw {
                        success: false,
                        message: `Invalid document received, ${req.body.code}`,
                      };
                    }
                  }
                }
              } catch (err) {
                throw {
                  success: false,
                  message: `OVD ERROR`,
                  error: err,
                };
              }
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (raw_parser == 'Smart-Parser' && document_type == 'Aadhaar') {
          try {
            let bufferObj;
            let decodedString;
            let isJson = true;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = bufferObj.toString('utf8');
              try {
                decodedString = JSON.parse(decodedString);
              } catch (err) {
                isJson = false;
              }
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, Unable to process`,
                error: err,
              };
            }

            //validate pincode
            let pincode_regex = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;
            //create payload for smart parser
            let timestamp = Date.now();
            let uniqueKey = inputs.loan_app_id + timestamp;
            let smartParserPayload = {
              request_id: uniqueKey,
              kyc_file:
                isJson === false ? inputs.base64pdfencodedfile : decodedString,
            };

            const smart_parser_response =
              await smartParserService(smartParserPayload);
            if (smart_parser_response.success == false) {
              throw {
                success: false,
                message: `Error while Fetching Data`,
              };
            }
            if (smart_parser_response.parser_resp.data.f_Name) {
              aadhaar_resp_object.aadhaar_fname =
                smart_parser_response?.parser_resp.data.f_Name;
            } else {
              throw {
                success: false,
                message: `Invalid document received, First name is required`,
              };
            }
            if (smart_parser_response.parser_resp.data.m_Name) {
              aadhaar_resp_object.aadhaar_mname =
                smart_parser_response?.parser_resp.data.m_Name;
            }
            if (smart_parser_response.parser_resp.data.l_Name) {
              aadhaar_resp_object.aadhaar_lname =
                smart_parser_response?.parser_resp.data.l_Name;
            } else {
              throw {
                success: false,
                message: `Invalid document received, Last name is required`,
              };
            }
            if (smart_parser_response?.parser_resp.data.Pin) {
              aadhaar_resp_object.aadhaar_pincode =
                smart_parser_response?.parser_resp.data.Pin;
            } else {
              throw {
                success: false,
                message: `Invalid document received. Pincode is required`,
              };
            }
            if (smart_parser_response?.parser_resp.data.DOB) {
              aadhaar_resp_object.aadhaar_dob =
                smart_parser_response?.parser_resp.data.DOB;
            } else {
              throw {
                success: false,
                message: `Invalid document received. DOB is required`,
              };
            }
            if (smart_parser_response?.parser_resp.data.ID) {
              aadhaar_resp_object.parsed_aadhaar_number =
                smart_parser_response?.parser_resp.data.ID;
            } else {
              throw {
                success: false,
                message: `Invalid document received. ID is Required`,
              };
            }

            if (
              aadhaar_resp_object.aadhaar_fname == undefined &&
              aadhaar_resp_object.aadhaar_lname == undefined &&
              aadhaar_resp_object.aadhaar_dob == undefined &&
              aadhaar_resp_object.aadhaar_pincode == undefined &&
              aadhaar_resp_object.parsed_aadhaar_number == undefined
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            if (aadhaar_resp_object.aadhaar_fname == undefined) {
              aadhaar_resp_object.aadhaar_fname = '';
            }
            if (aadhaar_resp_object.aadhaar_lname == undefined) {
              aadhaar_resp_object.aadhaar_lname = '';
            }
            if (aadhaar_resp_object.aadhaar_dob == undefined) {
              aadhaar_resp_object.aadhaar_dob = '';
            }
            if (aadhaar_resp_object.aadhaar_pincode == undefined) {
              aadhaar_resp_object.aadhaar_pincode = '';
            }
            if (aadhaar_resp_object.parsed_aadhaar_number == undefined) {
              aadhaar_resp_object.parsed_aadhaar_number = '';
            }
            if (
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              pincode_regex.test(aadhaar_resp_object.aadhaar_pincode) == false
            ) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
            let aadhaar_verified_flag = 'N';
            if (
              aadhaar_resp_object.aadhaar_fname.length > 0 &&
              aadhaar_resp_object.aadhaar_dob.length > 0 &&
              aadhaar_resp_object.aadhaar_pincode.length > 0 &&
              aadhaar_resp_object.parsed_aadhaar_number.length > 0
            ) {
              aadhaar_verified_flag = 'Y';
            }
            //insert into collection started
            var db_flag = false;
            aadhaar_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(aadhaar_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              // loan_id: raw_db_flag_resp.loan_id,
              parsed_aadhaar_number: aadhaar_resp_object.parsed_aadhaar_number,
              aadhaar_received: 'Y',
              aadhaar_verified: aadhaar_verified_flag,
              aadhaar_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );

            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[req.body.code],
            };

            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }

            if (db_flag == true && s3_flag == true) {
              //lets create ovd
              try {
                if (aadhaar_verified_flag == 'Y') {
                  let ajx_inputs = {
                    image: smart_parser_response?.parser_resp?.data?.photo
                      ? `data:image/png;base64,${smart_parser_response?.parser_resp?.data.photo}`
                      : '',
                    mode: 'OfflinePaperlessKYC',
                    ref: '',
                    aadhaarId:
                      smart_parser_response?.parser_resp?.data?.ID | '',
                    shareCode: '',
                    timestamp: new Date().toUTCString(),
                    name: smart_parser_response?.parser_resp?.data?.Name || '',
                    mobile: '',
                    dob: smart_parser_response?.parser_resp?.data?.DOB || '',
                    gender:
                      smart_parser_response?.parser_resp?.data?.gender || '',
                    email: '',
                    co: smart_parser_response?.parser_resp?.data?.Father || '',
                    house:
                      smart_parser_response?.parser_resp?.data?.house || '',
                    street:
                      smart_parser_response?.parser_resp?.data?.street || '',
                    landmark:
                      smart_parser_response?.parser_resp?.data?.landmark || '',
                    locality:
                      smart_parser_response?.parser_resp?.data?.locality || '',
                    pincode:
                      smart_parser_response?.parser_resp?.data?.pincode || '',
                    po: smart_parser_response?.parser_resp?.data?.po || '',
                    district:
                      smart_parser_response?.parser_resp?.data?.district || '',
                    sub_district: '',
                    vtc: smart_parser_response?.parser_resp?.data?.vtc || '',
                    state:
                      smart_parser_response?.parser_resp?.data?.state || '',
                  };
                  //call ovd service to genrate ovd
                  const ovd_response = await OvdService(ajx_inputs);
                  if (ovd_response.success == false) {
                    throw {
                      success: false,
                      message: `Error while generating ovd`,
                    };
                  }
                  let created_ovd_file = ovd_response.ovd_resp;
                  //uploading ovd to s3
                  const key2 = `loandocument/${
                    JSON.parse(JSON.stringify(req.company)).code
                      ? JSON.parse(JSON.stringify(req.company)).code
                      : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${inputs.loan_app_id}/117.txt`;
                  let upload_ovd_file;
                  try {
                    upload_ovd_file = await s3helper.uploadFileToS3(
                      created_ovd_file,
                      key2,
                    );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }
                  let ovd_loan_document_data = {
                    file_url: upload_ovd_file.Location,
                    file_type: documentMapping['117'],
                  };
                  let loan_document_common_ovd_resp;
                  try {
                    loan_document_common_ovd_resp =
                      await loanDocument.findByIdAndCodeThenUpdate(
                        '117',
                        inputs.loan_app_id,
                        ovd_loan_document_data,
                      );
                  } catch (err) {
                    throw {
                      success: false,
                      message: `Invalid document received, ${req.body.code}`,
                      error: err,
                    };
                  }

                  let loan_document_common_ovd_resp2;
                  if (loan_document_common_ovd_resp == null) {
                    //new row we have to add
                    try {
                      let new_ovd_row_data = {
                        company_id: raw_db_flag_resp.company_id,
                        loan_app_id: raw_db_flag_resp.loan_app_id,
                        partner_loan_app_id:
                          raw_db_flag_resp.partner_loan_app_id,
                        borrower_id: raw_db_flag_resp.borrower_id,
                        doc_stage: global_doc_stage,
                        file_url: ovd_loan_document_data.file_url,
                        file_type: ovd_loan_document_data.file_type,
                        code: '117',
                      };
                      loan_document_common_ovd_resp2 =
                        await loanDocument.addNew(new_ovd_row_data);
                    } catch (e) {
                      throw {
                        success: false,
                        message: `Invalid document received, ${req.body.code}`,
                      };
                    }
                  }
                }
              } catch (err) {
                throw {
                  success: false,
                  message: `OVD ERROR`,
                  error: err,
                };
              }
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (raw_parser == 'Smart-Parser' && document_type == 'Pan') {
          try {
            let bufferObj;
            let decodedString;
            let isJson = true;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = bufferObj.toString('utf8');
              try {
                decodedString = JSON.parse(decodedString);
              } catch (err) {
                isJson = false;
              }
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, Unable to process`,
                error: err,
              };
            }
            //create payload for smart parser
            let timestamp = Date.now();
            let uniqueKey = inputs.loan_app_id + timestamp;
            let smartParserPayload = {
              request_id: uniqueKey,
              kyc_file:
                isJson === false ? inputs.base64pdfencodedfile : decodedString,
            };

            const smart_parser_response =
              await smartParserService(smartParserPayload);
            if (smart_parser_response.success == false) {
              throw {
                success: false,
                message: `Error while Fetching Data`,
              };
            }
            if (smart_parser_response.parser_resp.data.f_Name) {
              pan_resp_object.pan_fname =
                smart_parser_response?.parser_resp.data.f_Name;
            } else {
              throw {
                success: false,
                message: `Invalid document received, First name is required`,
              };
            }
            if (smart_parser_response.parser_resp.data.l_Name) {
              pan_resp_object.pan_lname =
                smart_parser_response?.parser_resp.data.l_Name;
            }
            if (smart_parser_response.parser_resp.data.m_Name) {
              pan_resp_object.pan_mname =
                smart_parser_response?.parser_resp.data.m_Name;
            }

            //now check if anything invalid or not

            if (pan_resp_object.pan_fname == undefined) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            } //insert into collection started

            var db_flag = false;
            pan_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(pan_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              // loan_id: raw_db_flag_resp.loan_id,
              pan_received: 'Y',
              pan_verified:
                pan_resp_object.pan_fname != undefined &&
                pan_resp_object.pan_fname.length > 0
                  ? 'Y'
                  : 'N',
              pan_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );

            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            //return
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };

            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }

            if (db_flag == true && s3_flag == true) {
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else if (raw_parser == 'Pan-KARZA' && document_type == 'Pan') {
          try {
            let bufferObj;
            let decodedString;
            try {
              bufferObj = Buffer.from(inputs.base64pdfencodedfile, 'base64');
              decodedString = JSON.parse(bufferObj.toString('utf8'));
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            if (!decodedString.hasOwnProperty('data')) {
              decodedString = {
                data: { ...decodedString },
              };
            }

            let name_arr = decodedString.data.result.name.split(' ');

            pan_resp_object.pan_fname = name_arr[0];
            pan_resp_object.pan_lname =
              name_arr.length >= 2 ? name_arr[name_arr.length - 1] : '';
            pan_resp_object.pan_mname = name_arr.length >= 3 ? name_arr[1] : '';

            //now check if anything invalid or not

            if (pan_resp_object.pan_fname == undefined) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            } //insert into collection started

            var db_flag = false;
            pan_resp_object['loan_app_id'] = loan_app.loan_app_id;
            var raw_db_flag_resp;

            try {
              raw_db_flag_resp =
                await LoanRequest.updateXMLROW(pan_resp_object);
              db_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }
            //insert into new checklist collection
            let new_checklist_data = {
              company_id: JSON.parse(JSON.stringify(req.product)).company_id,
              product_id: JSON.parse(JSON.stringify(req.product))._id,
              loan_app_id: inputs.loan_app_id,
              // loan_id: raw_db_flag_resp.loan_id,
              pan_received: 'Y',
              pan_verified:
                pan_resp_object.pan_fname != undefined &&
                pan_resp_object.pan_fname.length > 0
                  ? 'Y'
                  : 'N',
              pan_match: 'N',
            };
            var raw_checklist_db_resp = await Compliance.XMLFindAndUpdate(
              inputs.loan_app_id,
              new_checklist_data,
            );

            //insert into s3 started
            var s3_flag = false;
            let uploadedFilePath;
            const key = `loandocument/${
              JSON.parse(JSON.stringify(req.company)).code
                ? JSON.parse(JSON.stringify(req.company)).code
                : 'BK'
            }/${JSON.parse(JSON.stringify(req.product)).name.replace(
              /\s/g,
              '',
            )}/${Date.now()}/${inputs.loan_app_id}/${req.body.code}.txt`;
            try {
              uploadedFilePath = await s3helper.uploadFileToS3(
                inputs['base64pdfencodedfile'],
                key,
              );
              s3_flag = true;
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            //return
            let loan_document_data = {
              file_url: uploadedFilePath.Location,
              file_type: documentMapping[inputs.code],
            };

            //updating db to loan_document_common
            let loan_document_common_resp;
            try {
              loan_document_common_resp =
                await loanDocument.findByIdAndCodeThenUpdate(
                  inputs.code,
                  inputs.loan_app_id,
                  loan_document_data,
                );
            } catch (err) {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
                error: err,
              };
            }

            let loan_document_common_resp2;
            if (loan_document_common_resp == null) {
              //new row we have to add
              try {
                let new_row_data = {
                  company_id: raw_db_flag_resp.company_id,
                  loan_app_id: raw_db_flag_resp.loan_app_id,
                  partner_loan_app_id: raw_db_flag_resp.partner_loan_app_id,
                  borrower_id: raw_db_flag_resp.borrower_id,
                  doc_stage: global_doc_stage,
                  file_url: loan_document_data.file_url,
                  file_type: documentMapping[inputs.code],
                  code: inputs.code,
                };
                loan_document_common_resp2 =
                  await loanDocument.addNew(new_row_data);
              } catch (e) {
                throw {
                  success: false,
                  message: `Invalid document received, ${req.body.code}`,
                };
              }
            }

            if (db_flag == true && s3_flag == true) {
              return res.status(200).send({
                success: true,
                message: 'Loan document uploaded successfully.',
              });
            } else {
              throw {
                success: false,
                message: `Invalid document received, ${req.body.code}`,
              };
            }
          } catch (err) {
            throw {
              success: false,
              message: `Invalid document received, ${req.body.code}`,
            };
          }
        } else {
          throw {
            success: false,
            message: `Invalid document received, ${req.body.code}`,
          };
        }
      } catch (error) {
        res
          .status(
            error.code && error.code != null && error.code != undefined
              ? error.code
              : 400,
          )
          .json(error);
        return;
      }
    },
  );
};

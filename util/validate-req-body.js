const moment = require('moment');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const helper = require('./helper');
const kycValidation = require('./kyc-validation');
const LoanRequestSchema = require('../models/loan-request-schema.js');
//const SigndeskEnach = require("../models/signdesk-schema");
const axios = require('axios');
//const { CREDIT_GRID, CREDIT_GRID_STATUS } = require("../../book-king-ui/constants/apiUrls.js");
const { check, validationResult } = require('express-validator');

const leadSchemaMap = require('../maps/lead');
const loanSchemaMap = require('../maps/borrowerinfo');
const leadSchema = require('../maps/lead');
const loanSchema = require('../maps/borrowerinfo');
const loanDocumentSchema = require('../maps/loandocument');
const dataEnum = {
  templates: {
    lead: Object.keys(JSON.parse(JSON.stringify(leadSchema.data))),
    loan: Object.keys(JSON.parse(JSON.stringify(loanSchema.data))),
    loandocument: Object.keys(
      JSON.parse(JSON.stringify(loanDocumentSchema.data)),
    ),
  },
  excludes: {
    lead: leadSchema.excludes,
    loan: loanSchema.excludes,
    loandocument: loanDocumentSchema.excludes,
  },
  enums: {
    lead: JSON.parse(JSON.stringify(leadSchema.data)),
    loan: JSON.parse(JSON.stringify(loanSchema.data)),
    loandocument: JSON.parse(JSON.stringify(loanDocumentSchema.data)),
  },
};

const validateDataWithTemplate = (template, data) => {
  let errorTemplates = {};
  let errorRows = [];
  let validatedRows = [];
  let unknownColumns = [];
  let missingColumns = [];
  let exactErrorColumns = [];
  let exactEnumErrorColumns = [];
  let emptyErrorColumns = [];
  let enumData = {};
  ['lead', 'loan', 'loandocument'].forEach((item) => {
    const enumFieldsData = dataEnum.enums[item];
    const enumFields = Object.keys(dataEnum.enums[item]);
    let enumFieldsDataFiltered = {};
    enumFields.forEach((item) => {
      if (enumFieldsData[item].hasOwnProperty('enum'))
        enumFieldsDataFiltered[item] = enumFieldsData[item]['enum'];
    });
    enumData[item] = enumFieldsDataFiltered;
  });

  let templateKeys = template.map((item) => {
    return item.field;
  });
  Object.keys(data[0]).forEach((key) => {
    if (templateKeys.indexOf(key) < 0)
      unknownColumns.push({
        [key]: 'Unknown column in field list',
      });
  });
  if (unknownColumns.length)
    return {
      missingColumns,
      errorRows,
      validatedRows,
      unknownColumns,
    };
  //Check if any column is missing compared to the templated upload against this schema
  missingColumns = template.filter((column, index) => {
    return (
      column.isOptional === 'TRUE' && (enumData.loan.hasOwnProperty(column.field) || enumData.lead.hasOwnProperty(column.field)) ? null : column.checked == 'TRUE' && data[0].hasOwnProperty(column.field) == false
    );
  });
  if (missingColumns.length)
    return {
      missingColumns,
      errorRows,
      validatedRows,
      unknownColumns,
      exactErrorColumns,
    };

  //Check for empty
  data.forEach((row) => {
    Object.keys(row).forEach((column) => {
      const checker = template.filter((check) => {
        return check.field == column;
      });
      if (checker[0]?.allowEmpty === false && row[column] === '') {
        emptyErrorColumns.push(`${column} can not be empty`);
      }
    });
  });
  if (emptyErrorColumns.length)
    return {
      emptyErrorColumns,
      missingColumns,
      errorRows,
      validatedRows,
      unknownColumns,
      exactErrorColumns,
      exactEnumErrorColumns,
    };

  //Check if all fields required are provided
  //And do the validation
  data.forEach((row, index) => {
    let columnError = null;
    let exactColumnError = {};
    let enumColumnError = {};
    Object.keys(row)
      .filter((key) => key != '')
      .forEach((column) => {
        const checker = template.filter((check) => {
          return check.field == column;
        });
        const value =
          row[column] === '' ||
            row[column] === undefined ||
            row[column] === null
            ? ''
            : row[column];
        let validation = validateData(checker[0].type, value);
        if (column === "per_addr_ln1") {
          if (String(value).length <= 4) {
            validation = false
          }
        }
        if (checker[0].checked === 'TRUE' && validation === false && !(checker[0].isOptional === 'TRUE' && (enumData.loan.hasOwnProperty(checker[0].field) || enumData.lead.hasOwnProperty(checker[0].field)))) {
          if (column === "per_addr_ln1") {
            if (String(value).length <= 4) {
              row[column] = "Minimum 5 Character are required";
              columnError = row;
              exactColumnError[column] = "Minimum 5 Character are required"
            }
          } else {
            row[column] = checker[0].validationmsg;
            columnError = row;
            exactColumnError[column] = checker[0].validationmsg;
          }
        } else if (
          checker[0].checked === 'FALSE' &&
          validation === false &&
          value !== ''
        ) {
          row[column] = checker[0].validationmsg;
          columnError = row;
          exactColumnError[column] = checker[0].validationmsg;
        }
        if ((enumData?.loan.hasOwnProperty(checker[0]?.field) || enumData?.lead?.hasOwnProperty(checker[0]?.field)) && checker[0]?.isOptional === 'TRUE' && value === '') {
          columnError = null;
        }
        // Merge lead and loan map
        let leadLoanMerged = {
          ...leadSchemaMap.data,
          ...loanSchemaMap.data,
        };
        if (
          leadLoanMerged.hasOwnProperty(column) &&
          leadLoanMerged[column].hasOwnProperty('enum')
        ) {
          if (leadLoanMerged[column]['enum']) {
            if (
              leadLoanMerged[column]['enum'].indexOf(value) < 0 &&
              value != ''
            ) {
              const validationMsgEnum = `Incorrect enum value for field ${column}, possible values could be ${leadLoanMerged[column]['enum']}`;
              exactEnumErrorColumns.push(validationMsgEnum);
            }
          }
        }
      });
    if (columnError) {
      errorRows.push(columnError);
      exactErrorColumns.push(exactColumnError);
    }
    if (!columnError) validatedRows.push(row);
  });
  return {
    missingColumns,
    errorRows,
    validatedRows,
    unknownColumns,
    exactErrorColumns,
    exactEnumErrorColumns,
  };
};

const validateData = (type, value, callback) => {
  switch (type) {
    case 'b64':
      const b64 =
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      return b64.test(value);
      break;
    case 'string':
      const string = /^.{1,750}$/;
      return string.test(value);
      break;
    case 'pincode':
      const pincode = /^(\d{6})$/;
      return pincode.test(value);
      break;
    case 'ifsc':
      const ifsc = /^[A-Z]{4}[0]{1}[a-zA-Z0-9]{6}$/;
      return ifsc.test(value);
      break;
    case 'mobile':
      const mobile = /^(\d{10})$/;
      return mobile.test(value);
      break;
    case 'phone':
      const phone = /^(\d{11})$/;
      return phone.test(value);
      break;
    case 'pan':
      const pan =
        /^([A-Z]){3}([ABCFGHLJPTE]){1}([A-Z]){1}([0-9]){4}([A-Z]){1}?$/;
      return pan.test(value);
      break;
    case 'email':
      const email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,10})+$/;
      return email.test(value);
      break;
    case 'aadhaar':
      const aadhaar = /(^.{8}[0-9]{4})$/;
      return aadhaar.test(value);
      break;
    case 'alphanum':
      const alphanum = /^[a-zA-Z0-9]{1,50}$/;
      return alphanum.test(value);
      break;
    case 'date':
      const date = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      return date.test(value);
      break;
    case 'dateTime':
      const dateTime =
        /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\ (0[0-9]|1[0-9]|2[0123])\:([012345][0-9])\:([012345][0-9])$)/;
      return dateTime.test(value);
      break;
    case 'dob':
      const dob = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
      return dob.test(value);
      break;
    case 'float':
      const float = /^(?:\d*\.\d{1,2}|\d+)$/;
      return float.test(value) ? true : value == 0 || value == 0.0;
      break;
    case 'passport':
      const passport = /^[A-Z][0-9]{7}$/;
      return passport.test(value);
      break;
    case 'number':
      const number = /^[0-9.]+$/;
      return number.test(value);
      break;
    case 'integer':
      const integer = /^[-+]?\d*$/;
      return integer.test(value);
      break;
    case 'gst':
      const gst =
        /^([0][1-9]|[1-2][0-9]|[3][0-8]|[9][79])([a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9a-zA-Z]{1}[zZ]{1}[0-9a-zA-Z]{1})+$/;
      return gst.test(value);
      break;
    case 'driving':
      const driving = /^([A-Z]{2}[0-9]{2}\s[0-9]{11})+$/;
      return driving.test(value);
      break;
    case 'epic':
      const epic = /^([a-zA-Z]){3}([0-9]){7}?$/;
      return epic.test(value);
      break;
    case 'ack':
      const ack = /^([0-9]){15}$/;
      return ack.test(value);
      break;
    case 'uan':
      const uan = /^\d{12}$/;
      return uan.test(value);
      break;
    case 'vpa':
      const vpa = /^\w+.\w+@\w+$/;
      return vpa.test(value);
      break;
    case 'twodigit':
      const twodigit = /^\d{2}$/;
      return twodigit.test(value);
      break;
    case 'alpha':
      const alpha = /^[A-Za-z\s]{1,250}$/;
      return alpha.test(value);
      break;
    case 'singleAlpha':
      const singleAlpha = /^[A-Z\s]{1}$/;
      return singleAlpha.test(value);
      break;
    case 'consent':
      const consent = /^\w{1}$/;
      return consent.test(value);
      break;
    case 'confirmation':
      const confirmation = /^(Y|N)$/;
      return confirmation.test(value);
      break;
    case 'consumerid':
      const consumerid = /^\d{12}/;
      return consumerid.test(value);
      break;
    case 'timestamp':
      const timestamp = /^(\d{10})$/;
      return timestamp.test(value);
      break;
    case 'txntype':
      const txntype =
        /^(overdue|interest|pf|usage|repayment|manage|emi|waiver|bounce*)$/;
      return txntype.test(value);
      break;
    case 'bounce':
      const bounce = /^(bounce*)$/;
      return bounce.test(value);
      break;
    case 'emi':
      const emi = /^(emi*)$/;
      return emi.test(value);
      break;
    case 'manage':
      const manage = /^(manage*)$/;
      return manage.test(value);
      break;
    case 'repayment':
      const repayment = /^(repayment*)$/;
      return repayment.test(value);
      break;
    case 'usage':
      const usage = /^(usage*)$/;
      return usage.test(value);
      break;
    case 'pf':
      const pf = /^(pf*)$/;
      return pf.test(value);
      break;
    case 'interest':
      const interest = /^(interest*)$/;
      return interest.test(value);
      break;
    case 'overdue':
      const overdue = /^(overdue*)$/;
      return overdue.test(value);
      break;
    case 'txnentry':
      const txnentry = /^(cr|dr*)$/;
      return txnentry.test(value);
      break;
    case 'usageTxnentry':
      const dr = /^(dr*)$/;
      return dr.test(value);
      break;
    case 'repayTxnentry':
      const cr = /^(cr*)$/;
      return cr.test(value);
      break;
    case 'decimalUARAUPRP':
      const decimalUARAUPRP = /^(\d{1,8})(.\d{1,4})?(UA|RA|UP|RP)$/;
      return decimalUARAUPRP.test(value);
    case 'decimalRARP':
      const decimalRARP = /^(\d{1,8})(.\d{1,4})?(RA|RP)$/;
      return decimalRARP.test(value);
    case 'decimalUAUP':
      const decimalUAUP = /^(\d{1,8})(.\d{1,4})?(UA|UP)$/;
      return decimalUAUP.test(value);
    case 'decimalAP':
      const decimalAP = /^(\d{1,8})(.\d{1,4})?(A|P)$/;
      return decimalAP.test(value);
    case 'otp':
      const otp = /^[0-9]{6}$$/;
      return otp.test(value);
    case 'duesArray':
      return value.length;
      break;
    case 'ckycnumber':
      const ckycnumber = /^([0-9]){14}$/;
      return ckycnumber.test(value);
      break;
    case 'vehicleNo':
      const vehicleNo =
        /^[A-Z]{2}\d[A-Z]{2}\d{4}$|^[A-Z]{2}\d{2}[A-Z0-9]{2}\d{3,4}$|^[A-Z]{2}\d{2}[A-Z]\d{4}$|^[A-Z]{2}\d{6}$|^[A-Z]{3}\d{4}|^[A-Z]{2}\d{1}[A-Z]{3}\d{3,4}$|^[A-Z]{2}\d{1}[A-Z]{1}\d{4}|^[A-Z]{2}\d{2}[A-Z]{1}\d{3}$|^[A-Z]{2}\d[A-Z]{3}\d{4}$|^[A-Z]{2}\d{2}[A-Z]{1,2}\d{2}$|^[0-9]{2}[B,H]{2}[0-9]{4}[A-Z]{1,2}$/;
      return vehicleNo.test(value);
      break;
    case 'consentDateTime':
      const dateTimeRegex =
        /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])\ (0[0-9]|1[0-9]|2[0123])\:([012345][0-9])\:([012345][0-9])$)/;
      const isValidDateTime = dateTimeRegex.test(value);
      if (!isValidDateTime) {
        return false;
      }
      const userDate = value;
      const consentTimestampUTC = new Date(userDate + ' GMT+0530');
      const inputDate = new Date(
        Date.UTC(
          userDate.slice(0, 4),
          userDate.slice(5, 7) - 1,
          userDate.slice(8, 10),
          userDate.slice(11, 13),
          userDate.slice(14, 16),
          userDate.slice(17, 19),
        ),
      );
      const serverDate = new Date();
      const isFutureDate = consentTimestampUTC > serverDate;
      if (isFutureDate) {
        return false;
      }
      const year = inputDate.getUTCFullYear();
      const isValidYear = year > 0 && year <= 9999;
      if (!isValidYear) {
        return false;
      }
      const month = inputDate.getUTCMonth() + 1;
      const day = inputDate.getUTCDate();
      const hour = inputDate.getUTCHours();
      const minute = inputDate.getUTCMinutes();
      const second = inputDate.getUTCSeconds();
      const monthString = month < 10 ? '0' + month : month.toString();
      const dayString = day < 10 ? '0' + day : day.toString();
      const hourString = hour < 10 ? '0' + hour : hour.toString();
      const minuteString = minute < 10 ? '0' + minute : minute.toString();
      const secondString = second < 10 ? '0' + second : second.toString();
      const formattedDate = `${year}-${monthString}-${dayString} ${hourString}:${minuteString}:${secondString}`;
      return formattedDate === value;
      break;
    case 'object':
        return !!value; 
        break; 
    default:
      return true;
      break;
  }
};

const validateProductData = [
  check('name').notEmpty().withMessage('product_name is required'),
  check('max_loan_amount')
    .notEmpty()
    .withMessage('max_loan_amount is required'),
  check('loan_tenure_type')
    .notEmpty()
    .withMessage('loan_tenure_type is required'),
  check('loan_tenure').notEmpty().withMessage('loan_tenure is required'),
  check('interest_rate_type')
    .notEmpty()
    .withMessage('interest_rate_type is required'),
  check('workday_weeek').notEmpty().withMessage('workday_weeek is required'),
  check('repayment_schedule')
    .notEmpty()
    .withMessage('repayment_schedule is required'),
  check('asset_classification_policy')
    .notEmpty()
    .withMessage('asset_classification_policy is required'),
  check('subvention_fees')
    .notEmpty()
    .withMessage('subvention_fees is required')
    .matches(/^(UA|UP)$/)
    .withMessage('Please enter valid subvention_fees'),
  check('processing_fees')
    .notEmpty()
    .withMessage('processing_fees is required')
    .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
    .withMessage('Please enter valid processing_fees'),
  check('usage_fee')
    .notEmpty()
    .withMessage('usage_fee is required')
    .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
    .withMessage('Please enter valid usage_fee'),
  check('int_value')
    .notEmpty()
    .withMessage('int_value is required')
    .matches(/^(\d{1,8})(.\d{1,4})?(A|P)$/)
    .withMessage('Please enter valid int_value'),
];

const productFlagMapper = [
  {
    flag: 'subvention_based',
    dataFields: ['subvention_fees'],
  },
  {
    flag: 'application_fee',
    dataFields: ['app_charges'],
  },
  {
    flag: 'stamp_charges',
    dataFields: ['stamp_charges'],
  },

  {
    flag: 'advance_emi',
    dataFields: ['advance_emi'],
  },
  {
    flag: 'a_score',
    dataFields: ['a_score_request_id'],
  },
  {
    flag: 'b_score',
    dataFields: ['b_score_request_id'],
  },
];

const validateProductconfigWithRequestData = (req, res, product, data) => {
  let errorStr = '';
  let isError = false;
  productFlagMapper.forEach((item) => {
    if (product[item.flag]) {
      errorStr += 'Fields- ';
      item?.fields?.forEach((field) => {
        if (
          !product[field] ||
          product[field] === 'null' ||
          product[field] === null ||
          product[field] === undefined ||
          product[field] === 'undefined'
        ) {
          isError = true;
          errorStr += `${field} ${product[field]} |*| `;
        }
      });
      errorStr += 'payloadFields- ';
      item.dataFields.forEach((dataField) => {
        if (
          !data[dataField] ||
          data[dataField] === 'null' ||
          data[dataField] === null ||
          data[dataField] === undefined ||
          data[dataField] === 'undefined'
        ) {
          isError = true;
          errorStr += `${dataField} ${data[dataField]} |*| `;
        }
      });
    }
  });
  if (isError) {
    return {
      success: false,
      message: errorStr,
    };
  }
  return { success: true };
};

module.exports = {
  validateDataWithTemplate,
  validateProductData,
  validateProductconfigWithRequestData,
};

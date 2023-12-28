const moment = require('moment');
const axios = require('axios');
var crypto = require('crypto');
const s3helper = require('../util/s3helper.js');
const serReqResLog = require('../models/service-req-res-log-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const RepaymentInstallment = require('../models/repayment-installment-schema');
const NachPresentmentSchema = require('../models/nach-presentment-schema');
const nachEncDecHelper = require('../util/camspay-nach-encdec-helper.js');
const randomStringHelper = require('../util/customLoanIdHelper.js');

const generateAuthorization = (correlation, timestamp, method, apiUrl, key) => {
  try {
    const hash = crypto
      .createHmac('SHA256', key)
      .update(
        correlation +
          '|' +
          timestamp +
          '|' +
          method.toUpperCase() +
          '|' +
          apiUrl,
      )
      .digest('base64');
    return hash;
  } catch (error) {
    return error;
  }
};

const validatePresentmentData = (req, res, next) => {
  try {
    let loanIdMissing = [];
    let customerNameMissing = [];
    let dueAmtMissing = [];
    let dueDateMissing = [];
    let repayScheduleIdMissing = [];
    let emiNumberMissing = [];
    let inputData = req.body.TRANSACT;
    inputData.forEach((record) => {
      if (record.hasOwnProperty('LOAN_NO') == false || !record.LOAN_NO) {
        loanIdMissing.push(record);
      }
      if (record.hasOwnProperty('DUE_AMOUNT') == false || !record.DUE_AMOUNT) {
        dueAmtMissing.push(record);
      }
      if (
        record.hasOwnProperty('REPAY_SCHEDULE_ID') == false ||
        !record.REPAY_SCHEDULE_ID
      ) {
        repayScheduleIdMissing.push(record);
      }
      if (record.hasOwnProperty('EMI_NO') == false || !record.EMI_NO) {
        emiNumberMissing.push(record);
      }
      if (record.hasOwnProperty('CUST_NAME') == false || !record.CUST_NAME) {
        customerNameMissing.push(record);
      }
      if (record.hasOwnProperty('DUE_DATE') == false || !record.DUE_DATE) {
        dueDateMissing.push(record);
      }
    });
    if (loanIdMissing.length)
      throw { success: false, message: 'LOAN_NO is missing for some records' };
    if (dueAmtMissing.length)
      throw {
        success: false,
        message: 'DUE_AMOUNT is missing for some records',
      };
    if (customerNameMissing.length)
      throw {
        success: false,
        message: 'CUST_NAME is missing for some records',
      };
    if (dueDateMissing.length)
      throw { success: false, message: 'DUE_DATE is missing for some records' };
    if (repayScheduleIdMissing.length)
      throw {
        success: false,
        message: 'REPAY_SCHEDULE_ID is missing for some records',
      };
    if (emiNumberMissing.length)
      throw {
        success: false,
        message: 'EMI_NO is missing for some records',
      };
    req.inputData = inputData;
    const uniqueLoanIds = [
      ...new Set(
        inputData.map((item) => {
          return item.LOAN_NO;
        }),
      ),
    ];
    req.uniqueLoanIds = uniqueLoanIds;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const prepareNachPresentationData = async (req, res, next) => {
  try {
    let nachPresentmentData = {};
    let finalNachPresentmentData = [];

    //check if all borrower ids exists in borrower info table
    let uniqueLoanIds = [
      ...new Set(
        req.inputData.map((item) => {
          return item.LOAN_NO;
        }),
      ),
    ];
    // Check if all the unique loan ids are present in borrower info
    const loanIdAlreadyExist =
      await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
    if (loanIdAlreadyExist < uniqueLoanIds.length)
      throw {
        success: false,
        message: 'Few loan ids not present in loan',
      };
    loanIdAlreadyExist.forEach((loan) => {
      req.inputData.forEach((transact) => {
        if (transact.LOAN_NO === loan.loan_id) {
          finalNachPresentmentData.push({
            CATEGORY_CODE: process.env.CATEGORY_CODE || '',
            TRXN_BATCH_NO: Math.floor(1000000000 + Math.random() * 9000000000),
            TRANSACTION_REF_NO: Date.now(),
            MANDATE_REF_NO: loan.mandate_ref_no ? loan.mandate_ref_no : '',
            PRODUCT_CODE: req.product._id,
            PRODUCT_NAME: req.product.name,
            LOAN_NO: transact.LOAN_NO,
            CUST_NAME: transact.CUST_NAME,
            DUE_AMT: (
              Math.round((transact.DUE_AMOUNT * 1 + Number.EPSILON) * 100) / 100
            ).toFixed(2),
            EMI_AMT: (
              Math.round((transact.EMI_AMOUNT * 1 + Number.EPSILON) * 100) / 100
            ).toFixed(2),
            DUE_DATE: moment(transact.DUE_DATE)
              .format('DD-MMM-YYYY')
              .toUpperCase(),
            DUE_DAY: moment(transact.DUE_DATE).format('D') * 1,
            UMRN: transact.UMRN ? transact.UMRN : '',
            USER_TRXN_NO: transact.USER_TRXN_NO ? transact.USER_TRXN_NO : '',
            REPAY_SCHEDULE_ID: transact.REPAY_SCHEDULE_ID
              ? transact.REPAY_SCHEDULE_ID
              : '',
            EMI_NO: transact.EMI_NO ? transact.EMI_NO : '',
          });
        }
      });
    });
    req.nachPresentmentData = finalNachPresentmentData;
    const dataToEncode = {
      TRANSACT: req.nachPresentmentData,
    };
    const encodedData = await nachEncDecHelper.encryptDecrypt(
      'Encrypt',
      dataToEncode,
      '',
    );
    req.encodedData = encodedData;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const storeRequestToS3 = async (req, res, next) => {
  try {
    const apiName = 'NACH-PRESENTATION';
    var logData = {
      company_id: req.company && req.company._id ? req.company._id : null,
      company_code: req.company && req.company.code ? req.company.code : null,
      vendor_name: 'CAMSPAY',
      service_id: '',
      api_name: apiName,
      raw_data: '',
      response_type: '',
      request_type: '',
      timestamp: Date.now(),
      request_id: `${req.company.code}-${apiName}-${Date.now()}`,
      document_uploaded_s3: '',
      api_response_type: 'JSON',
      api_response_status: '',
    };
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const keyRequestLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload request data on s3
    let s3LogResult = await s3helper.uploadFileToS3(
      req.encodedData,
      keyRequestLog,
    );
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    }
    logData.document_uploaded_s3 = 1;
    logData.response_type = 'success';
    logData.api_response_status = '';
    logData.raw_data = s3LogResult.Location;
    logData.request_type = 'request';
    //insert request data s3 upload response to database
    let localLogResult = await serReqResLog.addNew(logData);
    req.logData = logData;
    req.reqS3Url = s3LogResult.Location;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const callNachPresentationAPI = async (req, res, next) => {
  try {
    //Generate random 32 character string
    const correlation = randomStringHelper.generateRandomString(
      32,
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    );
    const timestamp = Date.now();

    const apiUrl = `${process.env.CAMSPAY_NACH_PRESENTMENT_URL}/TransactIngress`;

    const authorization = await generateAuthorization(
      correlation,
      timestamp,
      'POST',
      apiUrl,
      process.env.TOKEN_KEY,
    );
    //Generate HMAC value for authorization
    const nachPresentmentConfig = {
      method: 'post',
      url: apiUrl,
      headers: {
        TOKEN_ID: process.env.TOKEN_ID,
        TOKEN_KEY: process.env.TOKEN_KEY,
        Correlation: correlation,
        Authorization: `${process.env.TOKEN_ID}:${authorization}`,
        Timestamp: timestamp,
        'Content-Type': 'application/json',
      },
      data: { TRANSACTS: req.encodedData },
    };
    const nachPresentmentResp = await axios(nachPresentmentConfig);
    req.nachPresentmentResp = nachPresentmentResp;
    next();
  } catch (error) {
    if (error?.response?.statusText) {
      return res
        .status(400)
        .send({ success: false, message: error?.response?.statusText });
    }
    return res.status(400).send(error);
  }
};

const storeResponseToS3 = async (req, res, next) => {
  try {
    let logData = req.logData;
    //response data from karza address to upload on s3
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const keyResponseLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload response data from camspay nach presentation api on s3
    s3LogResult = await s3helper.uploadFileToS3(
      req.nachPresentmentResp.data,
      keyResponseLog,
    );
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    } else {
      logData.document_uploaded_s3 = 1;
      logData.response_type = 'success';
    }
    logData.raw_data = await s3LogResult.Location;
    logData.request_type = 'response';
    if (req.nachPresentmentResp.status == 200) {
      logData.api_response_status = 'SUCCESS';
    } else {
      logData.api_response_status = 'FAIL';
    }
    //insert response data s3 upload response to database
    localLogResult = await serReqResLog.addNew(logData);
    req.resS3Url = s3LogResult.Location;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const recordNachPresentmentData = async (req, res, next) => {
  try {
    let nachPresentmentDataToRecord = [];
    let dataToUpdateCondition = [];
    req.nachPresentmentData.forEach((item) => {
      nachPresentmentDataToRecord.push({
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req.company.name,
        product_name: req.product.name,
        loan_id: item.LOAN_NO,
        trxn_batch_number: item.TRXN_BATCH_NO ? item.TRXN_BATCH_NO : '',
        mandate_ref_number: item.MANDATE_REF_NO ? item.MANDATE_REF_NO : '',
        cust_name: item.CUST_NAME ? item.CUST_NAME : '',
        due_amount: item.DUE_AMT ? Number(item.DUE_AMT) : '',
        emi_amount: item.EMI_AMT ? Number(item.EMI_AMT) : '',
        due_date: item.DUE_DATE ? item.DUE_DATE : '',
        due_day: item.DUE_DAY ? item.DUE_DAY : '',
        emi_number: item.EMI_NO ? item.EMI_NO : '',
        repay_schedule_id: item.REPAY_SCHEDULE_ID ? item.REPAY_SCHEDULE_ID : '',
        req_s3_url: req.reqS3Url,
        res_s3_url: req.resS3Url,
        created_by: req.user.username,
        updated_by: '',
        nach_transaction_id: req.nachPresentmentResp
          ? req.nachPresentmentResp.data.TRANSACTION_ID
          : '',
        presentation_status_code: req.nachPresentmentResp
          ? req.nachPresentmentResp.data.STATUS_CODE
          : '',
        nach_status_description: req.nachPresentmentResp
          ? req.nachPresentmentResp.data.STATUS_DESCRIPTION
          : '',
        nach_transaction_ref_no: item.TRANSACTION_REF_NO
          ? item.TRANSACTION_REF_NO
          : '',
      });
    });
    const nachPresentmentRecordResp = await NachPresentmentSchema.addInBulk(
      nachPresentmentDataToRecord,
    );
    // Update the status of emis to initiated
    if (req.nachPresentmentResp.data.STATUS_CODE === 0) {
      req.nachPresentmentData.forEach((record) => {
        dataToUpdateCondition.push({
          emi_no: record.EMI_NO,
          repay_schedule_id: record.REPAY_SCHEDULE_ID,
        });
      });
      const updateEmiData =
        await RepaymentInstallment.updateNachPresentmentstatus(
          dataToUpdateCondition,
          { nach_presentment_status: 'initiated' },
        );
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const checkPendingInstallmentExist = async (req, res, next) => {
  try {
    let searchQuery = [];
    let presentmentInitiatedRecords = [];
    let dueAmountMismatch = [];
    let dueDateMismatch = [];
    let loanIdMismatch = [];
    let mandateRefMismatch = [];
    let mandateRefNumberMissing = [];
    req.nachPresentmentData.forEach((record) => {
      searchQuery.push({
        emi_no: record.EMI_NO,
        repay_schedule_id: record.REPAY_SCHEDULE_ID,
      });
    });
    const repayInstallmentExist =
      await RepaymentInstallment.findIfExistBulk(searchQuery);
    if (!repayInstallmentExist.length)
      throw {
        success: false,
        message: 'No repayment records found against provided data',
      };
    if (repayInstallmentExist?.length !== req.nachPresentmentData.length)
      throw {
        success: false,
        message: 'Some emi no and repay schedule id does not exist',
      };

    req.nachPresentmentData.forEach(async (record) => {
      repayInstallmentExist?.forEach(async (item) => {
        if (
          record.EMI_NO == item.emi_no &&
          record.REPAY_SCHEDULE_ID == item.repay_schedule_id
        ) {
          if (
            moment(record.DUE_DATE).format('YYYY-MM-DD') !==
            moment(item.due_date).format('YYYY-MM-DD')
          ) {
            dueDateMismatch.push(record);
          }
          if (record.LOAN_NO !== item.loan_id) {
            loanIdMismatch.push(record);
          }
        }
        if (item.nach_presentment_status === 'initiated') {
          presentmentInitiatedRecords.push(item);
        }
        if (
          record.hasOwnProperty('MANDATE_REF_NO') == false ||
          !record.MANDATE_REF_NO
        ) {
          mandateRefNumberMissing.push(record);
        }
      });
    });

    if (mandateRefNumberMissing.length)
      throw {
        success: false,
        message: 'MANDATE_REF_NO is missing for some records',
      };
    if (dueDateMismatch.length)
      throw { success: false, message: 'Due date mismatch for some records' };
    if (loanIdMismatch.length)
      throw { success: false, message: 'Loan id mismatch for some records' };
    if (presentmentInitiatedRecords.length)
      throw {
        success: false,
        message: 'Nach presentment is already initiated for some records',
      };
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = {
  validatePresentmentData,
  prepareNachPresentationData,
  callNachPresentationAPI,
  recordNachPresentmentData,
  storeRequestToS3,
  storeResponseToS3,
  checkPendingInstallmentExist,
};

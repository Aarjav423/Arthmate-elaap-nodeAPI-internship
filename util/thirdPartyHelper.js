'use strict';
const moment = require('moment');
const axios = require('axios');
const s3helper = require('../util/s3helper.js');
const LoanActivities = require('../models/loan-activities-schema.js');
const Product = require('../models/product-schema.js');
const customLoanId = require('../util/customLoanIdHelper.js');
const { fileUploadError, dbEntryError } = require('./definations.js');

const LMSCreateLead = async (data, breData, response) => {
  try {
    breData.api_type = 'LMS_LEAD';
    delete data.status;
    const authData =
      'Basic ' +
      Buffer.from(
        process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
      ).toString('base64');
    const LeadConfig = {
      method: 'POST',
      url: process.env.LMS_LEAD_URL,
      headers: {
        Authorization: authData,
        'Content-Type': 'application/json',
      },
      data: data,
    };
    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest) {
      return {
        success: false,
        message: 'Error while updating request data to s3',
      };
    }
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    // //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest) {
      return {
        success: false,
        message: 'Error while adding request data to database',
      };
    }
    // call to LMS borrower api
    const leadResponse = await axios(LeadConfig);
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(
      leadResponse.data,
      resKey,
    );
    if (!uploadResponse) {
      return {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    }
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = '';
      breData.response_type =
        leadResponse.data.body['flag'] === 'false' ? 'fail' : 'success';
    }
    if (leadResponse.data.body.flag === 'false') {
      return {
        success: false,
        message: 'leadResponse.data.body.details',
        errorData: leadResponse.data,
      };
    }
    // add response data from BRE to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse) {
      return {
        success: false,
        message: 'Error while adding response data to database',
      };
    }
    if (leadResponse.data.body.flag === 'true') {
      return {
        success: true,
        data: leadResponse.data.body,
      };
    }
  } catch (error) {
    //upload error data from BRE on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };
    return {
      success: false,
      message: error.response?.data?.body?.details,
      data: error.response?.data?.body,
    };
  }
};

const LMSMakeLoan = async (data, breData, response) => {
  try {
    breData.api_type = 'LMS_LOAN';
    delete data.status;
    data.partner_loan_id = data.partner_loan_app_id;
    const authData =
      'Basic ' +
      Buffer.from(
        process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
      ).toString('base64');
    const LoanConfig = {
      method: 'POST',
      url: process.env.LMS_LOAN_URL,
      headers: {
        Authorization: authData,
        'Content-Type': 'application/json',
      },
      data: data,
    };
    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest)
      throw {
        success: false,
        message: 'Error while updating request data to s3',
      };
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
      breData.label = '';
    }
    //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest)
      throw {
        message: 'Error while adding request data to database',
      };
    // call to LMS make loan api
    const loanResponse = await axios(LoanConfig);
    if (!loanResponse.data.body.flag)
      throw {
        errorData: loanResponse.data.body,
      };
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(
      loanResponse.data,
      resKey,
    );
    if (!uploadResponse)
      throw {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = '';
      breData.response_type =
        loanResponse.data.body['flag'] === 'false' ? 'fail' : 'success';
    }
    if (loanResponse.data.body['flag'] === 'false')
      throw {
        success: false,
        message: 'loanResponse.data.body.details',
        data: loanResponse.data,
      };
    // add response data from BRE to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse)
      throw {
        success: false,
        message: 'Error while adding response data to database',
        data: loanResponse.data,
      };
    if (loanResponse.data.body['flag'] === 'true') {
      return {
        success: true,
        data: loanResponse.data.body,
      };
    }
  } catch (error) {
    console.log('error', error);
    //upload error data from BRE on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };
    return {
      success: false,
      message: error.response.data.body.details,
      data: error.response.data.body,
    };
  }
};

const BREValidation = async (req, data) => {
  try {
    data.request_id = data.loan_app_id;
    delete data.status;
    delete data._id;
    delete data.__v;
    data.product_id = req.product._id;
    data.product_name = req.product.name;
    const BREConfig = {
      method: 'POST',
      url: process.env.BRE_URL + '/rules/validate',
      data: data,
    };
    var breData = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_app_id: data.loan_app_id ? data.loan_app_id : null,
      loan_id: data.loan_id ? data.loan_id : null,
      partner_loan_app_id: data.partner_loan_app_id
        ? data.partner_loan_app_id
        : null,
      api_type: 'BRE',
      request_type: '',
      response_type: '',
      label: '',
      url: '',
      timestamp: Date.now(),
    };
    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest)
      throw {
        success: false,
        message: 'Error while updating request data to s3',
      };
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest)
      throw {
        message: 'Error while adding request data',
      };
    const response = await axios(BREConfig);
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(response.data, resKey);
    if (!uploadResponse)
      throw {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = response.data['overall-decision'];
      breData.response_type =
        response.data['overall-decision'] === 'GO' ? 'success' : 'fail';
    }
    if (response.data['overall-decision'] === 'NOGO') {
      const validationErrorDetails = await response.data['rule-decision-list'];
      const ErrorValues = validationErrorDetails
        .filter((objValues) => objValues.action === 'NOGO')
        .map((objValues) => objValues);
      let errorData = {};
      errorData.data = ErrorValues;
      errorData.message = 'Error while validating BRE Data';
      throw {
        success: false,
        errorData: errorData,
      };
    }
    // add response data from BRE to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse)
      throw {
        success: false,
        message: 'Error while adding response data to database',
        data: response.data,
      };
    if (
      response.data['overall-decision'] === 'GO' &&
      req.company.lms_version === 'origin_lms'
    ) {
      //generate loan id
      const customCodeDefault  = req.company.custom_code
        ? req.company.custom_code
        : 'UND';
      const customCode = customCodeDefault.toUpperCase();
      const generatedLoanKey = req.product.loan_key
        ? req.product.loan_key
        : customLoanId.generateRandomString(
            3,
            '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
          );
      const loanKey = generatedLoanKey.toUpperCase();
      if (!req.product.loan_key) {
        const updateLoanKey = await Product.updateData(
          {
            loan_key: loanKey,
          },
          {
            _id: req.product._id,
          },
        );
      }
      const generatedLoanId = await customLoanId.generatedLoanId(
        customCode,
        loanKey,
        data,
      );
      if (generatedLoanId.errorData) {
        let errorData = {};
        errorData.message =
          generatedLoanId.errorData?.errorData ?? 'Error recording Loan_id.';

        throw {
          success: false,
          errorData: errorData,
        };
      }

      data.loan_id = generatedLoanId.loan_id;
      data.upi_handle = generatedLoanId.upi_handle;
      data.upi_reference = generatedLoanId.upi_reference;
      return {
        success: true,
        makeLoanData: data,
      };
    } else if (
      response.data['overall-decision'] === 'GO' &&
      req.company.lms_version !== 'origin_lms'
    ) {
      const BorrowerResponse = await LMSFetchBorrower(req, data, breData);
      if (BorrowerResponse.flag) {
        const updateBorrower = await LMSUpdateBorrower(req, data, breData);
        if (!updateBorrower.flag) {
          let errorData = {};
          errorData.data = updateBorrower.errorData.body;
          errorData.message = updateBorrower.errorData.message;
          throw {
            success: false,
            errorData: errorData,
          };
        }
      }
      if (!BorrowerResponse.flag) {
        const createLead = await LMSCreateLead(data, breData, response.data);
        if (!createLead.success) {
          throw {
            errorData: createLead,
          };
        }
      }
      const makeLoan = await LMSMakeLoan(data, breData, response.data);
      if (makeLoan) {
        if (!makeLoan.success)
          throw {
            errorData: makeLoan,
          };
        return {
          success: true,
          makeLoanData: makeLoan.data,
        };
      }
    }
  } catch (error) {
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };
    return {
      success: false,
      errorData: error,
    };
  }
};

const LMSRepaymentScheduleApi = async (data, req, res) => {
  try {
    if (
      req.company.lms_version !== 'origin_lms' ||
      req.company.lms_version === 'legacy_lms'
    ) {
      const authData =
        'Basic ' +
        Buffer.from(
          process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
        ).toString('base64');
      const LoanConfig = {
        method: 'POST',
        url: process.env.LMS_REPAYMENT_SCHEDULE_URL,
        headers: {
          Authorization: authData,
          'Content-Type': 'application/json',
        },
        data: null,
      };

      var logData = {
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req.company.name,
        product_name: req.product.name,
        loan_app_id: data[0]?.loan_app_id ? data[0]?.loan_app_id : null,
        loan_id: data[0]?.loan_id ? data[0]?.loan_id : null,
        partner_loan_app_id: data[0]?.partner_loan_app_id
          ? data[0]?.partner_loan_app_id
          : null,
        api_type: 'BRE',
        request_type: '',
        response_type: '',
        label: '',
        url: '',
        timestamp: Date.now(),
      };
      logData.api_type = 'LMS_REPAY_SCHEDULE';
      const promise = new Promise(async (resolve, reject) => {
        const RepaymentScheduleData = {
          product_key: req.product.name,
          loan_id: data?.loan_id,
          repayment_schedule_json: data?.repayment_schedule_json,
        };
        /*upload request data to s3*/
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${logData.api_type}/${logData.company_id}/${logData.loan_id}/${filename}/${logData.timestamp}.txt`;
        const uploadRequest = await s3helper.uploadFileToS3(logData, reqKey);
        if (!uploadRequest) {
          return {
            success: false,
            message: 'Error while updating request data to s3',
          };
        }
        if (uploadRequest) {
          logData.request_type = 'request';
          logData.url = uploadRequest.Location;
        }
        /*insert request data s3 upload response to database*/
        const addRequest = await LoanActivities.addNew(logData);
        if (!addRequest) {
          return {
            success: false,
            message: 'Error while adding request data to database',
          };
        }
        await axios({
          ...LoanConfig,
          data: RepaymentScheduleData,
        })
          .then(async (result) => {
            filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${logData.api_type}/${logData.company_id}/${logData.loan_app_id}/${filename}/${logData.timestamp}.txt`;
            const uploadResponse = await s3helper.uploadFileToS3(
              result.data,
              resKey,
            );
            if (!uploadResponse) {
              return {
                success: false,
                message: 'Error while uploading response data to s3',
              };
            }
            if (uploadResponse) {
              logData.request_type = 'response';
              logData.url = uploadResponse.Location;
              logData.label = '';
              logData.response_type =
                result.data.body['flag'] === 'false' ? 'fail' : 'success';
            }
            if (result.data.body.flag === 'false') {
              resolve({
                success: false,
                errorData: result.data,
              });
            }
            /*add response data from BRE to database*/
            const addResponse = await LoanActivities.addNew(logData);
            if (!addResponse) {
              resolve({
                success: false,
                message: 'Error while adding response data to database',
              });
            }
            if (result.data.body.flag === 'true') {
              resolve({
                success: true,
                data: result.data.body,
              });
            }
          })
          .catch(async (error) => {
            /*upload error data from BRE on s3*/
            const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
            const errKey = `${logData.api_type}/${logData.company_id}/${logData.loan_app_id}/${filename}/${logData.timestamp}.txt`;
            const uploadError = await s3helper.uploadFileToS3(error, errKey);
            if (!uploadError)
              reject({
                success: false,
                message: 'Error while uploading error data to s3',
              });
            if (uploadError) {
              logData.request_type = 'error';
              logData.url = uploadError.Location;
              logData.response_type = 'fail';
            }
            /*add error data from BRE to database*/
            const addError = await LoanActivities.addNew(logData);
            if (!addError)
              reject({
                success: false,
                message: 'Error while adding error data to database',
              });
            reject({
              success: false,
              data: error.response.data,
            });
          });
      });
      return promise;
    } else {
      return {
        success: true,
      };
    }
  } catch (error) {
    return error;
  }
};

const LMSRepaymentApi = async (data, req, res) => {
  try {
    if (
      req.company.lms_version !== 'origin_lms' ||
      req.company.lms_version === 'legacy_lms'
    ) {
      const authData =
        'Basic ' +
        Buffer.from(
          process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
        ).toString('base64');
      const LMSRepayConfig = {
        method: 'POST',
        url: process.env.LMS_REPAYMENT_URL,
        headers: {
          Authorization: authData,
          'Content-Type': 'application/json',
        },
        data: null,
      };
      var logData = {
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req.company.name,
        product_name: req.product.name,
        loan_app_id: data.loan_app_id ? data.loan_app_id : null,
        loan_id: data?.loan_id ? data?.loan_id : null,
        partner_loan_app_id: data?.partner_loan_app_id
          ? data?.partner_loan_app_id
          : null,
        api_type: 'BRE',
        request_type: '',
        response_type: '',
        label: '',
        url: '',
        timestamp: Date.now(),
      };
      logData.api_type = 'LMS_REPAY';
      const promise = new Promise((resolve, reject) => {
        let counter = 0;
        data.forEach(async (record) => {
          /*upload request data to s3*/
          let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
          const reqKey = `${logData.api_type}/${logData.company_id}/${logData.loan_id}/${filename}/${logData.timestamp}.txt`;
          const uploadRequest = await s3helper.uploadFileToS3(logData, reqKey);
          if (!uploadRequest) {
            return {
              success: false,
              message: 'Error while updating request data to s3',
            };
          }
          if (uploadRequest) {
            logData.request_type = 'request';
            logData.url = uploadRequest.Location;
          }
          /*insert request data s3 upload response to database*/
          const addRequest = await LoanActivities.addNew(logData);
          if (!addRequest) {
            return {
              success: false,
              message: 'Error while adding request data to database',
            };
          }

          await axios({
            ...LMSRepayConfig,
            data: record,
          })
            .then(async (result) => {
              filename = Math.floor(10000 + Math.random() * 99999) + '_res';
              const resKey = `${logData.api_type}/${logData.company_id}/${logData.loan_app_id}/${filename}/${logData.timestamp}.txt`;
              const uploadResponse = await s3helper.uploadFileToS3(
                result.data,
                resKey,
              );
              if (!uploadResponse) {
                return {
                  success: false,
                  message: 'Error while uploading response data to s3',
                };
              }
              if (uploadResponse) {
                logData.request_type = 'response';
                logData.url = uploadResponse.Location;
                logData.label = '';
                logData.response_type =
                  result.data.body['flag'] === 'false' ? 'fail' : 'success';
              }

              if (result.data.body.flag === 'false') {
                resolve({
                  success: false,
                  errorData: result.data,
                });
              }

              /*add response data from BRE to database*/
              const addResponse = await LoanActivities.addNew(logData);
              if (!addResponse) {
                resolve({
                  success: false,
                  message: 'Error while adding response data to database',
                });
              }

              if (result.data.body.flag === 'true') {
                resolve({
                  success: true,
                  data: result,
                });
              }
              counter++;
              if (counter == data.length) {
                resolve(result);
              }
            })
            .catch(async (error) => {
              /*upload error data from BRE on s3*/
              const filename =
                Math.floor(10000 + Math.random() * 99999) + '_err';
              const errKey = `${logData.api_type}/${logData.company_id}/${logData.loan_app_id}/${filename}/${logData.timestamp}.txt`;
              const uploadError = await s3helper.uploadFileToS3(error, errKey);
              if (!uploadError)
                reject({
                  success: false,
                  message: 'Error while uploading error data to s3',
                });

              if (uploadError) {
                logData.request_type = 'error';
                logData.url = uploadError.Location;
                logData.response_type = 'fail';
              }
              /*add error data from BRE to database*/
              const addError = await LoanActivities.addNew(logData);
              if (!addError)
                reject({
                  success: false,
                  message: 'Error while adding error data to database',
                });
              reject({
                success: false,
                data: error.response.data,
              });
            });
        });
      });
      return promise;
    } else {
      return {
        success: true,
      };
    }
  } catch (error) {
    return error;
  }
};

const thirdPartyUpdateLoanStatus = async (req, data) => {
  try {
    if (
      req.company.lms_version !== 'origin_lms' ||
      req.company.lms_version === 'legacy_lms'
    ) {
      data.request_id = data.loan_app_id;
      const dataValueApi = {
        loan_id: data.loan_id,
        disbursement_status: 'True',
        product_key: req.product.name,
      };
      data.disbursement_status = 'True';
      data.am_loan_id = data.loan_id;
      data.disbursement_status = 'True';
      data.product_key = req.product.name;
      const authData =
        'Basic ' +
        Buffer.from(
          process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
        ).toString('base64');
      var updateloanStatusData = {
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req.company.name,
        product_name: req.product.name,
        loan_app_id: data.loan_app_id ? data.loan_app_id : null,
        loan_id: data.loan_id ? data.loan_id : null,
        partner_loan_app_id: data.partner_loan_app_id
          ? data.partner_loan_app_id
          : null,
        api_type: 'LMS_LOAN_STATUS',
        request_type: '',
        response_type: '',
        label: '',
        url: '',
        timestamp: Date.now(),
      };
      const loanStatusConfig = {
        method: 'POST',
        url: process.env.LMS_LOAN_STATUS_URL,
        headers: {
          Authorization: authData,
          'Content-Type': 'application/json',
        },
        data: dataValueApi,
      };
      //upload request data to s3
      let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
      const reqKey = `${updateloanStatusData.api_type}/${updateloanStatusData.company_id}/${updateloanStatusData.loan_app_id}/${filename}/${updateloanStatusData.timestamp}.txt`;
      const uploadRequest = await s3helper.uploadFileToS3(
        updateloanStatusData,
        reqKey,
      );
      if (!uploadRequest)
        throw {
          success: false,
          message: 'Error while updating request data to s3',
        };
      if (uploadRequest) {
        updateloanStatusData.request_type = 'request';
        updateloanStatusData.url = uploadRequest.Location;
        updateloanStatusData.label = '';
      }
      //insert request data s3 upload response to database
      const addRequest = await LoanActivities.addNew(updateloanStatusData);
      if (!addRequest)
        throw {
          message: 'Error while adding request data',
        };
      // call to LMS loan status update api
      const loanStatusResponse = await axios(loanStatusConfig);
      //upload request data to s3
      if (!loanStatusResponse.data.body.flag)
        throw {
          errorData: loanStatusResponse.data.body,
        };
      filename = Math.floor(10000 + Math.random() * 99999) + '_res';
      const resKey = `${updateloanStatusData.api_type}/${updateloanStatusData.company_id}/${updateloanStatusData.loan_app_id}/${filename}/${updateloanStatusData.timestamp}.txt`;
      const uploadResponse = await s3helper.uploadFileToS3(
        loanStatusResponse.data,
        resKey,
      );
      if (!uploadResponse)
        throw {
          success: false,
          message: 'Error while uploading response data to s3',
        };
      if (uploadResponse) {
        updateloanStatusData.request_type = 'response';
        updateloanStatusData.url = uploadResponse.Location;
        updateloanStatusData.label = '';
        updateloanStatusData.response_type =
          loanStatusResponse.data.body['flag'] === 'false' ? 'fail' : 'success';
      }
      if (loanStatusResponse.data.body['flag'] === 'false')
        throw {
          success: false,
          data: loanStatusResponse.data,
        };
      // add response data from LoanStatus to database
      const addResponse = await LoanActivities.addNew(updateloanStatusData);
      if (!addResponse)
        throw {
          success: false,
          message: 'Error while adding response data to database',
          data: loanStatusResponse.data,
        };
      if (loanStatusResponse.data.body.flag) {
        return {
          success: true,
          data: loanStatusResponse.data.body,
        };
      }
    } else {
      return {
        success: true,
      };
    }
  } catch (error) {
    //upload error data from LoanStatus on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${updateloanStatusData.api_type}/${updateloanStatusData.company_id}/${updateloanStatusData.loan_app_id}/${filename}/${updateloanStatusData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      updateloanStatusData.request_type = 'error';
      updateloanStatusData.url = uploadError.Location;
      updateloanStatusData.response_type = 'fail';
    }
    // add error data from LoanStatus to database
    const addError = await LoanActivities.addNew(updateloanStatusData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };
    return {
      success: false,
      data: error.response.data,
    };
  }
};

const thirdPartyDisbursement = async (req, disburseData, res) => {
  try {
    if (
      req.company.lms_version !== 'origin_lms' ||
      req.company.lms_version === 'legacy_lms'
    ) {
      const dataValueApi = {
        product_key: req.product.name,
        loan_id: disburseData.loan_id,
        txn_amount: disburseData.txn_amount,
        dis_status: 'Success',
        utr_number: disburseData.utr_number,
        utr_date_time_stamp: moment(disburseData.utr_date_time_stamp).format(
          'YYYY-MM-DD',
        ),
      };

      disburseData.loan_id = disburseData.loan_id;
      disburseData.product_key = disburseData.product_key;
      const authData =
        'Basic ' +
        Buffer.from(
          process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
        ).toString('base64');
      var disbursementData = {
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req.company.name,
        product_name: req.product.name,
        loan_app_id: disburseData.loan_app_id ? disburseData.loan_app_id : null,
        loan_id: disburseData.loan_id ? disburseData.loan_id : null,
        partner_loan_app_id: disburseData.partner_loan_app_id
          ? disburseData.partner_loan_app_id
          : null,
        api_type: 'LMS_DISB',
        request_type: '',
        response_type: '',
        label: '',
        url: '',
        timestamp: Date.now(),
      };

      const loanDisburseConfig = {
        method: 'POST',
        url: process.env.LMS_DISBURSEMENT_URL,
        headers: {
          Authorization: authData,
          'Content-Type': 'application/json',
        },
        data: dataValueApi,
      };
      //upload request data to s3
      let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
      const reqKey = `${disbursementData.api_type}/${disbursementData.company_id}/${disbursementData.loan_app_id}/${filename}/${disbursementData.timestamp}.txt`;
      const uploadRequest = await s3helper.uploadFileToS3(
        disbursementData,
        reqKey,
      );
      if (!uploadRequest) throw fileUploadError;
      if (uploadRequest) {
        disbursementData.request_type = 'request';
        disbursementData.url = uploadRequest.Location;
        disbursementData.label = '';
      }
      //insert request data s3 upload response to database
      const addRequest = await LoanActivities.addNew(disbursementData);
      if (!addRequest)
        throw {
          message: 'Error while adding request data',
        };

      // call to TPULS make loan api
      const loanDisburseResponse = await axios(loanDisburseConfig);
      if (loanDisburseResponse) {
        if (!loanDisburseResponse.data.body.flag) {
          throw {
            errorData: loanDisburseResponse.data.body,
          };
        }
        filename = Math.floor(10000 + Math.random() * 99999) + '_res';
        const resKey = `${disbursementData.api_type}/${disbursementData.company_id}/${disbursementData.loan_app_id}/${filename}/${disbursementData.timestamp}.txt`;
        const uploadResponse = await s3helper.uploadFileToS3(
          loanDisburseResponse.data,
          resKey,
        );
        if (!uploadResponse)
          throw {
            success: false,
            message: 'Error while uploading response data to s3',
          };
        if (uploadResponse) {
          disbursementData.request_type = 'response';
          disbursementData.url = uploadResponse.Location;
          disbursementData.label = '';
          disbursementData.response_type =
            loanDisburseResponse.data.body['flag'] === 'false'
              ? 'fail'
              : 'success';
        }
        if (loanDisburseResponse.data.body['flag'] === 'false')
          throw {
            success: false,
            data: loanDisburseResponse.data,
          };
        // add response data from LoanStatus to database
        const addResponse = await LoanActivities.addNew(disbursementData);
        if (!addResponse)
          throw {
            success: false,
            message: 'Error while adding response data to database',
            data: loanDisburseResponse.data,
          };
        if (loanDisburseResponse.data.body.flag) {
          const objResp = {
            success: true,
            data: loanDisburseResponse.data,
          };
          return objResp;
        }
      }
    } else {
      return {
        success: true,
      };
    }
  } catch (error) {
    //upload error data from LoanStatus on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${disbursementData.api_type}/${disbursementData.company_id}/${disbursementData.loan_app_id}/${filename}/${disbursementData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError) return fileUploadError;
    if (uploadError) {
      disbursementData.request_type = 'error';
      disbursementData.url = uploadError.Location;
      disbursementData.response_type = 'fail';
    }
    // add error data from LoanStatus to database
    const addError = await LoanActivities.addNew(disbursementData);
    if (!addError) return dbEntryError;
    return {
      success: false,
      data: error?.response?.data,
    };
  }
};

const LMSBREValidation = async (req, data) => {
  try {
    data.request_id = data.loan_app_id;
    delete data.status;
    delete data._id;
    delete data.__v;
    data.product_id = req.product._id;
    data.product_name = req.product.name;
    const BREConfig = {
      method: 'POST',
      url: process.env.BRE_URL + '/rules/validate',
      data: data,
    };
    var breData = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_app_id: data.loan_app_id ? data.loan_app_id : null,
      loan_id: data.loan_id ? data.loan_id : null,
      partner_loan_app_id: data.partner_loan_app_id
        ? data.partner_loan_app_id
        : null,
      api_type: 'BRE',
      request_type: '',
      response_type: '',
      label: '',
      url: '',
      timestamp: Date.now(),
    };
    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest)
      throw {
        success: false,
        message: 'Error while updating request data to s3',
      };
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest)
      throw {
        message: 'Error while adding request data',
      };
    const response = await axios(BREConfig);
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(response.data, resKey);
    if (!uploadResponse)
      throw {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = response.data['overall-decision'];
      breData.response_type =
        response.data['overall-decision'] === 'GO' ? 'success' : 'fail';
    }
    if (response.data['overall-decision'] === 'NOGO') {
      const validationErrorDetails = await response.data['rule-decision-list'];
      const ErrorValues = validationErrorDetails
        .filter((objValues) => objValues.action === 'NOGO')
        .map((objValues) => objValues);
      let errorData = {};
      errorData.data = ErrorValues;
      errorData.message = 'Error while validating BRE Data';
      throw {
        success: false,
        errorData: errorData,
      };
    }

    // add response data from BRE to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse)
      throw {
        success: false,
        message: 'Error while adding response data to database',
        data: response.data,
      };
    if (response.data['overall-decision'] === 'GO') {
      return {
        success: true,
        breData: response.data,
      };
    }
  } catch (error) {
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };
    return {
      success: false,
      errorData: error,
    };
  }
};

const LMSFetchBorrower = async (req, data, breData) => {
  try {
    breData.api_type = 'LMS_GET_LEAD';
    delete data.status;

    const authData =
      'Basic ' +
      Buffer.from(
        process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
      ).toString('base64');

    const GetBorrowerConfig = {
      method: 'GET',
      url: `${process.env.LMS_LEAD_URL}/${data.borrower_id}`,
      headers: {
        Authorization: authData,
        'Content-Type': 'application/json',
      },
    };

    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest) {
      return {
        success: false,
        message: 'Error while updating request data to s3',
      };
    }
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    // //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest) {
      return {
        success: false,
        message: 'Error while adding request data to database',
      };
    }
    //call to LMS fetch borrower api
    const borrowerResponse = await axios(GetBorrowerConfig);
    //upload LMS fetch borrower api response to s3
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(
      borrowerResponse.data,
      resKey,
    );
    if (!uploadResponse) {
      return {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    }
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = '';
      breData.response_type =
        borrowerResponse.data.flag === 'false' ? 'fail' : 'success';
    }

    if (borrowerResponse.data.flag) {
      return borrowerResponse.data;
    }

    // add response data from LMS to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse) {
      return {
        success: false,
        message: 'Error while adding response data to database',
      };
    }
  } catch (error) {
    //upload error data from LMS on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };

    return {
      success: false,
      errorData: error,
    };
  }
};

const LMSUpdateBorrower = async (req, data) => {
  try {
    var breData = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_app_id: data.loan_app_id ? data.loan_app_id : null,
      loan_id: data.loan_id ? data.loan_id : null,
      partner_loan_app_id: data.partner_loan_app_id
        ? data.partner_loan_app_id
        : null,
      api_type: 'LMS_UPDATE_LEAD',
      request_type: '',
      response_type: '',
      label: '',
      url: '',
      timestamp: Date.now(),
    };
    delete data.status;

    const authData =
      'Basic ' +
      Buffer.from(
        process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
      ).toString('base64');

    delete data.status;

    const updateBorrowerConfig = {
      method: 'PUT',
      url: `${process.env.LMS_LEAD_URL}/${data.borrower_id}`,
      headers: {
        Authorization: authData,
        'Content-Type': 'application/json',
      },
      data,
    };

    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest) {
      return {
        success: false,
        message: 'Error while updating request data to s3',
      };
    }
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest) {
      return {
        success: false,
        message: 'Error while adding request data to database',
      };
    }
    //call to LMS update borrower api
    const updateBorrowerResponse = await axios(updateBorrowerConfig);
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(
      updateBorrowerResponse.data,
      resKey,
    );
    if (!uploadResponse) {
      return {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    }
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = '';
      breData.response_type =
        updateBorrowerResponse.data.body['flag'] === 'false'
          ? 'fail'
          : 'success';
    }

    // add response data from LMS to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse) {
      return {
        success: false,
        message: 'Error while adding response data to database',
      };
    }

    return updateBorrowerResponse.data;
  } catch (error) {
    //upload error data from BRE on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };

    return {
      success: false,
      errorData: error.response.data,
    };
  }
};

const LMSUpdateLOAN = async (req, data) => {
  try {
    var breData = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_app_id: data.loan_app_id ? data.loan_app_id : null,
      loan_id: data.loan_id ? data.loan_id : null,
      partner_loan_app_id: data.partner_loan_app_id
        ? data.partner_loan_app_id
        : null,
      api_type: 'LMS_UPDATE_LOAN',
      request_type: '',
      response_type: '',
      label: '',
      url: '',
      timestamp: Date.now(),
    };
    delete data.status;

    const authData =
      'Basic ' +
      Buffer.from(
        process.env.LMS_USERNAME + ':' + process.env.LMS_PASSWORD,
      ).toString('base64');

    delete data.status;

    const updateBorrowerConfig = {
      method: 'PUT',
      url: `${process.env.LMS_LOAN_URL}/${data.loan_id}`,
      headers: {
        Authorization: authData,
        'Content-Type': 'application/json',
      },
      data,
    };

    //upload request data to s3
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const reqKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadRequest = await s3helper.uploadFileToS3(breData, reqKey);
    if (!uploadRequest) {
      return {
        success: false,
        message: 'Error while updating request data to s3',
      };
    }
    if (uploadRequest) {
      breData.request_type = 'request';
      breData.url = uploadRequest.Location;
    }
    //insert request data s3 upload response to database
    const addRequest = await LoanActivities.addNew(breData);
    if (!addRequest) {
      return {
        success: false,
        message: 'Error while adding request data to database',
      };
    }
    //call to LMS update borrower api
    const updateBorrowerResponse = await axios(updateBorrowerConfig);
    filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const resKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadResponse = await s3helper.uploadFileToS3(
      updateBorrowerResponse.data,
      resKey,
    );
    if (!uploadResponse) {
      return {
        success: false,
        message: 'Error while uploading response data to s3',
      };
    }
    if (uploadResponse) {
      breData.request_type = 'response';
      breData.url = uploadResponse.Location;
      breData.label = '';
      breData.response_type =
        updateBorrowerResponse.data.body['flag'] === 'false'
          ? 'fail'
          : 'success';
    }

    // add response data from LMS to database
    const addResponse = await LoanActivities.addNew(breData);
    if (!addResponse) {
      return {
        success: false,
        message: 'Error while adding response data to database',
      };
    }

    return updateBorrowerResponse.data;
  } catch (error) {
    //upload error data from BRE on s3
    const filename = Math.floor(10000 + Math.random() * 99999) + '_err';
    const errKey = `${breData.api_type}/${breData.company_id}/${breData.loan_app_id}/${filename}/${breData.timestamp}.txt`;
    const uploadError = await s3helper.uploadFileToS3(error, errKey);
    if (!uploadError)
      return {
        success: false,
        message: 'Error while uploading error data to s3',
      };
    if (uploadError) {
      breData.request_type = 'error';
      breData.url = uploadError.Location;
      breData.response_type = 'fail';
    }
    // add error data from BRE to database
    const addError = await LoanActivities.addNew(breData);
    if (!addError)
      return {
        success: false,
        message: 'Error while adding error data to database',
      };

    return {
      success: false,
      errorData: error.response.data,
    };
  }
};

module.exports = {
  BREValidation,
  LMSRepaymentScheduleApi,
  LMSRepaymentApi,
  thirdPartyUpdateLoanStatus,
  thirdPartyDisbursement,
  LMSBREValidation,
  LMSFetchBorrower,
  LMSUpdateBorrower,
  LMSUpdateLOAN,
};

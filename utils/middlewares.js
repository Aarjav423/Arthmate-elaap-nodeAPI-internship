const mathjsLib = require('mathjs');
const asyncLib = require('async');
const LoanRequestSchema = require('../models/loan-request-schema');
const BorrowerInfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const middlewareUtils = require('./middleware-utils');
var mathjs = mathjsLib.create(mathjsLib.all);
mathjs.import({
  int: middlewareUtils.int,
  float: middlewareUtils.float,
  pincodeToState: middlewareUtils.pincodeToState,
  pincodeToCity: middlewareUtils.pincodeToCity,
  dobToAge: middlewareUtils.dobToAge,
  monthlyEmi: middlewareUtils.monthlyEmi,
  calculateDisbursal: middlewareUtils.calculateDisbursal,
  upcoming: middlewareUtils.upcoming,
  dateDiff: middlewareUtils.dateDiff,
  upfrontDailyInterest: middlewareUtils.upfrontDailyInterest,
  calculateDues: middlewareUtils.calculateDues,
});

var normalize = function (x) {
  return x;
  for (var obj in x) {
    if (obj.indexOf('id') < 0) {
      var f = parseFloat(x[obj], 10);
      var isNumber = Number.isNaN(f);
      if (!isNumber) {
        x[obj] = f;
      }
    }
  }
  return x;
};

var massagedBodyWithLoanRequest = async (body, req) => {
  try {
    var loan_id = body.loan_id;
    if (loan_id) {
      const loanRequestData = await LoanRequestSchema.findByKLId(loan_id);
      if (loanRequestData) {
        const borrowerInfo = await BorrowerInfoCommonSchema.findByKLBId(
          loanRequestData.loan_id,
          loanRequestData.borrower_id,
        );
        for (var field in body) {
          var param = body[field];
          if (param[0] == '=') {
            var rawParam = param.substring(1);
            var tempData;
            if (borrowerInfo) {
              tempData = {
                ...body,
                loanrequest: loanRequestData,
                borrowerinfo: borrowerInfo,
                product: normalize(req.product),
                body: body,
              };
            } else {
              tempData = {
                ...body,
                loanrequest: loanRequestData,
                borrowerinfo: body,
                product: normalize(req.product),
                body: body,
              };
            }
            delete tempData[field];
            var result = await mathjs.evaluate(rawParam, tempData);
            body[field] = result;
          }
        }
        return {
          body: body,
          loanRequestData,
          borrowerInfo,
        };
      } else {
        return {
          body: body,
        };
      }
    } else {
      return {
        body: body,
      };
    }
  } catch (error) {
    return error;
  }
};

var injectLoanRequestFromArrayToParseAndEval = async (req, res, next) => {
  if (req.method[0] == 'P') {
    if (Array.isArray(req.body)) {
      asyncLib.reduce(
        req.body,
        [],
        async (acc, body, cb) => {
          var temp = await massagedBodyWithLoanRequest(body, req);
          acc.push(temp.body);
          return acc;
        },
        (doneErr, massagedBody) => {
          req.body = massagedBody;
          if (next) next();
        },
      );
    } else {
      var temp = await massagedBodyWithLoanRequest(req.body, req);
      req.body = temp.body;
      req.loanRequestData = temp.loanRequestData;
      req.borrowerInfo = temp.borrowerInfo;
      if (next) next();
    }
  } else {
    if (next) next();
  }
};

var parseAndEvaluateArray = async function (req, res, next) {
  if (req.method == 'POST') {
    for (var _obj in req.body) {
      var obj = req.body[_obj];
      for (var field in obj) {
        var param = obj[field];
        if (param[0] == '=') {
          var data = {
            ...obj,
            ...req.loanRequestData,
            body: obj,
            product: normalize(req.product),
          };
          var rawParam = param.substring(1);
          var result = await mathjs.evaluate(rawParam, data);
          req.body[_obj][field] = result;
        }
      }
    }
  }
  if (next) {
    next();
  } else {
    return req.body;
  }
};

var parseAndEvaluate = async function (req, res, next) {
  if (req.method == 'POST') {
    for (var field in req.body) {
      var param = req.body[field];
      if (param[0] == '=') {
        var data = {
          ...req.body,
          ...req.loanRequestData,
        };
        var rawParam = param.substring(1);
        var result = await mathjs.evaluate(rawParam, data);
        req.body[_obj][field] = result;
      }
    }
  }
  if (next) {
    next();
  } else {
    return req.body;
  }
};

function echo(x) {
  return x;
}

const tdsValidateData = async (req, res, next) => {
  try {
      const id = req?.body?.tds_request_id || null;
      if (!id)
          throw {
              success: false,
              message: 'tds_request_id is required',
          };

      const status = req?.body?.status || null;
      if (!status)
          throw {
              success: false,
              message: 'Status is required',
          };
      if (status == 'Rejected') {
          const comment = req?.body?.comment || null;
          if (!comment)
              throw {
                  success: false,
                  message: 'Comment is required',
              };

      } else if (status == "Processed") {
          const { bank_name, ifsc, account_number, utr_number, utr_date, comment } = req.body;
          if (!bank_name || !ifsc || !account_number || !utr_number || !utr_date || !comment) {
              throw {
                  success: false,
                  message: 'Incomplete Bank Details',
              };
          }

      } else {
          throw {
              success: false,
              message: 'Invalid Status',
          };
      }
      next();
  } catch (error) {
      console.log(error);
      return res.status(400).send(error);
  }
};

module.exports = {
  injectLoanRequestFromArrayToParseAndEval,
  parseAndEvaluateArray,
  parseAndEvaluate,
  tdsValidateData
};

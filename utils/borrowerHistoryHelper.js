'use strict';
const moment = require('moment');
const CustomerSchema = require('../models/customer-schema');

async function fetchBorrowerHistoryData(request, httpStatus, response) {
  const pan = request.body?.pan;
  const requestId = request.body?.co_lender_assignment_id;
  if (!pan?.trim().length) {
    httpStatus = 400;
    throw {
      message: 'pan number is missing',
    };
  }
  if (!requestId) {
    httpStatus = 400;
    throw {
      message: 'Colender Assignment ID is missing',
    };
  }
  const loanReqHistory = await CustomerSchema.findLoanHistoryByPan(pan);
  const sortedLoanReqHistory = sortedBorrowerHistoryData(loanReqHistory);
  return {
    __return: response.status(200).send({
      co_lender_assignment_id: requestId,
      pan: pan,
      loan_history: sortedLoanReqHistory,
      success: true,
    }),
    httpStatus,
  };
}
exports.fetchBorrowerHistoryData = fetchBorrowerHistoryData;
function sortedBorrowerHistoryData(loanReqHistory) {
  var loanReqHistoryWithDate = loanReqHistory
    .filter((obj) => obj.disbursement_date !== '')
    .map((obj) => {
      return { ...obj, disbursement_date: new Date(obj.disbursement_date) };
    });

  var loanReqHistoryWithoutDate = loanReqHistory.filter(
    (obj) => obj.disbursement_date === '',
  );

  loanReqHistoryWithDate.sort(
    (a, b) => Number(a.disbursement_date) - Number(b.disbursement_date),
  );
  loanReqHistoryWithDate.reverse();
  var loanReqHistoryWithDateTime = loanReqHistoryWithDate.map((obj) => {
    return {
      ...obj,
      disbursement_date: moment(obj.disbursement_date).format(
        'YYYY-MM-DD HH:mm:ss',
      ),
    };
  });
  const sortedLoanReqHistory = loanReqHistoryWithDateTime.concat(
    loanReqHistoryWithoutDate,
  );
  return sortedLoanReqHistory;
}

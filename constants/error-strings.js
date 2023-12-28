'use strict';
const defaultError = 'Something went wrong, kindly contact administrator';
const loanTypeNotFound = 'Selected loan type not found in records';
const partnerExist = 'Partner already exists with same name';
const companyExist = 'Company already exists with same name';
const txn_stages = {
  Initiated: '01',
  Failed: '02',
  Dispute: '03',
  Rejected: '04',
  Success: '05',
};

module.exports = {
  defaultError,
  loanTypeNotFound,
  partnerExist,
  companyExist,
  txn_stages,
};

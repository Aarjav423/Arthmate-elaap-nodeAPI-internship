const {
  findOneWithKLID,
  updateLoanStatus,
  findByCondition: findBICByCondition,
} = require('../../models/borrowerinfo-common-schema');

const {
  findCashCollaterals,
  updateCashCollateral,
} = require('../../models/cash-collaterals-schema');
const { findProductId } = require('../../models/product-schema');
const { getById: getCompanyById } = require('../../models/company-schema');
const {
  findByColenderId,
  getDisburseChannel,
} = require('../../models/disbursement-channel-config-schema');
const {
  findOneByTitle: findDisbursementChannelMasterByTitle,
} = require('../../models/disbursement-channel-master-schema.js');

const {
  findByCondition: findLoanDocumentByCondition,
} = require('../../models/loandocument-common-schema');
const { isLoanExistByLID } = require('../../util/borrower-helper');
const { addNew: addNewStatusLogs } = require('../../models/status-logs-schema');
const {
  findByCondition: findDisbursementLedgerByCondition,
  findNonFailedRequest,
  findEntryForDebit,
  addNew: addDisbursementLedger,
  findEntry,
} = require('../../models/disbursement-ledger-schema');
const { maintainAccessLog } = require('../../util/accessLog');
const {findByLIDAndUsageId}=require("../../models/line-state-audit")
const {findByLoanIdAndRequestId}=require("../../models/loc-batch-drawdown-schema")

module.exports = {
  findOneWithKLID,
  findProductId,
  updateCashCollateral,
  getCompanyById,
  findByColenderId,
  getDisburseChannel,
  findDisbursementChannelMasterByTitle,
  findLoanDocumentByCondition,
  isLoanExistByLID,
  updateLoanStatus,
  findBICByCondition,
  addNewStatusLogs,
  maintainAccessLog,
  findDisbursementLedgerByCondition,
  findNonFailedRequest,
  findEntryForDebit,
  addDisbursementLedger,
  findEntry,
  findCashCollaterals,
  findByLIDAndUsageId,
  findByLoanIdAndRequestId
};

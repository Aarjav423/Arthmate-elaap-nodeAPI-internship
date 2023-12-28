//const underscoreLib = require('underscore');
const moment = require('moment');
var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');

mongoose.Promise = global.Promise;
const ColendLoanTransactionLedgerSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: false,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    company_name: {
      type: String,
      allowNull: true,
    },
    txn_entry: {
      type: String,
      allowNull: true,
    },
    txn_mode: {
      type: String,
      allowNull: true,
    },
    product_name: {
      type: String,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    co_lender_id: {
      type: Number,
      allowNull: true,
    },
    co_lend_loan_id: {
      type: String,
      allowNull: true,
    },
    loan_app_id: {
      type: String,
      allowNull: false,
    },
    utr_number: {
      type: String,
      allowNull: true,
    },
    txn_amount: {
      type: Decimal128,
      allowNull: true,
    },
    excess_amount: {
      type: Decimal128,
      allowNull: true,
    },
    txn_date: {
      type: Date,
      allowNull: true,
    },
    txn_id: {
      type: String,
      allowNull: true,
    },
    label: {
      type: String,
      enum: [
        'repayment',
        'foreclosure',
        'fldg',
        'partpayment',
        'disbursement',
        'credit',
      ],
      allowNull: false,
    },
    interest_amount: {
      type: Decimal128,
      allowNull: true,
    },
    principal_amount: {
      type: Decimal128,
      allowNull: true,
    },
    summary_id: {
      type: Number,
      allowNull: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
ColendLoanTransactionLedgerSchema.plugin(autoIncrement.plugin, 'id');
var ColendLoanTransactionLedger = (module.exports = mongoose.model(
  'co_lend_transaction_ledger',
  ColendLoanTransactionLedgerSchema,
));

module.exports.addNew = (disbursementData) => {
  return ColendLoanTransactionLedger.create(disbursementData);
};

module.exports.findByTransactionidCompany = (ids) => {
  return ColendLoanTransactionLedger.find({
    txn_id: {
      $in: ids,
    },
  });
};

//find records by multiple transaction ids
module.exports.findByTransactionids = (ids) => {
  return ColendLoanTransactionLedger.find({
    type: 'usage',
    txn_id: {
      $in: ids,
    },
  });
};

//bulk insert
module.exports.addInBulk = (usageData) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    usageData.forEach((record) => {
      ColendLoanTransactionLedger.create(record)
        .then((response) => {
          counter++;
          if (counter >= usageData.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.getAllByLoanBorrowerId = (borrower_id, loan_id) => {
  return ColendLoanTransactionLedger.find({
    loan_id,
    borrower_id,
  });
};

//get all by last month-year data
module.exports.getPreviousMonthData = (prevMonthStart, prevMonthEnd, type) => {
  return ColendLoanTransactionLedger.find({
    created_at: {
      $gte: new Date(prevMonthStart),
      $lt: new Date(prevMonthEnd),
    },
    type: type,
  });
};

module.exports.getMonthData = (
  loan_ids,
  prevMonthStart,
  prevMonthEnd,
  type,
) => {
  return ColendLoanTransactionLedger.find({
    invoice_status: type,
    type: 'usage',
    loan_id: {
      $in: loan_ids,
    },
    txn_date: {
      $gte: new Date(prevMonthStart),
      $lt: new Date(prevMonthEnd),
    },
  });
};

module.exports.getMonthDataUsageAndRepay = (data) => {
  return ColendLoanTransactionLedger.find({
    loan_id: data.loan_id,
    txn_date: {
      $gte: new Date(data.prevMonthStart),
      $lt: new Date(data.prevMonthEnd),
    },
  });
};

module.exports.getTransactionHistoryByLoanId = (
  co_lend_loan_id,
  co_lender_id,
) => {
  return ColendLoanTransactionLedger.find({
    co_lend_loan_id: co_lend_loan_id,
    co_lender_id: co_lender_id,
  });
};

module.exports.getLedgersBySummaryId = (summary_id) => {
  return ColendLoanTransactionLedger.find({ summary_id });
};

module.exports.updateBySummaryId = (data) => {
  const query = {
    summary_id: {
      $in: data.summary_ids,
    },
  };
  const update = {
    $set: {
      utr_number: data.utr_number,
      txn_date: data.txn_date,
    },
  };
  var bulk = ColendLoanTransactionLedger.collection.initializeOrderedBulkOp();

  return bulk.find(query).update(update).execute();
};

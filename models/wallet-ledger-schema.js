var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const WalletLedgerSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: true,
  },
  lender_id: {
    type: Number,
    allowNull: true,
  },
  lender_name: {
    type: String,
    allowNull: true,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  product_name: {
    type: String,
    allowNull: true,
  },
  disbursement_channel: {
    type: String,
    allowNull: true,
  },
  txn_amount: {
    type: String,
    allowNull: true,
  },
  txn_type: {
    type: String,
    allowNull: true,
  },
  txn_id: {
    type: String,
    allowNull: true,
  },
  txn_date: {
    type: Date,
    allowNull: true,
  },
  utr_number: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  borrower_id: {
    type: String,
    allowNull: false,
  },
  source_accountholder_name: {
    type: String,
    allowNull: true,
  },
  source_account_number: {
    type: String,
    allowNull: true,
  },
  source_ifsc_code: {
    type: String,
    allowNull: true,
  },
  destination_accountholder_name: {
    type: String,
    allowNull: true,
  },
  destination_account_number: {
    type: String,
    allowNull: true,
  },
  destination_ifsc_code: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
WalletLedgerSchema.plugin(autoIncrement.plugin, 'id');
var WalletLedger = (module.exports = mongoose.model(
  'wallet_ledger',
  WalletLedgerSchema,
));

module.exports.addNew = (data) => {
  return WalletLedger.create(data);
};

module.exports.findByLoanId = (loan_id) => {
  return WalletLedger.find({
    loan_id: loan_id,
  });
};

module.exports.getById = (id) => {
  return WalletLedger.findOne({
    _id: id,
  });
};

module.exports.findByTxnId = (txn_id) => {
  return WalletLedger.find({
    txn_id: txn_id,
  });
};

module.exports.findByUtrNumber = (utr_number) => {
  return WalletLedger.find({
    utr_number: utr_number,
  });
};

module.exports.getWalletBalance = (data) => {
  return WalletLedger.find(data);
};

module.exports.getAllByFilter = async (filter) => {
  const {
    company_id,
    product_id,
    from_date,
    to_date,
    disbursement_channel,
    lender_id,
    page,
    limit,
  } = filter;
  var query = {};
  if (company_id) {
    query['$and'] = [];
    query['$and'].push({
      company_id,
    });
  }
  if (product_id)
    query['$and'].push({
      product_id,
    });
  if (lender_id)
    query['$and'].push({
      lender_id,
    });
  if (from_date !== 'null' && from_date !== 'undefined' && from_date !== '') {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      txn_date: {
        $gte: date,
      },
    });
  }
  if (to_date !== 'null' && to_date !== 'undefined' && to_date !== '') {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      txn_date: {
        $lte: date,
      },
    });
  }
  if (
    disbursement_channel !== '' &&
    disbursement_channel !== null &&
    disbursement_channel !== undefined
  ) {
    query['$and'].push({
      disbursement_channel,
    });
  }

  const ledgerFilterData = await WalletLedger.find(query)
    .skip(page * limit)
    .limit(limit);
  const count = await WalletLedger.count(query);
  const RespData = {
    ledgerList: ledgerFilterData,
    count,
  };
  if (!ledgerFilterData) return false;
  return RespData;
};

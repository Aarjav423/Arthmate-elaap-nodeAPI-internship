var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const DisbursementsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  code: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  borrower_id: {
    type: String,
    allowNull: true,
  },
  partner_loan_id: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: false,
  },
  disburse_channel: {
    type: String,
    allowNull: true,
  },
  txn_amount: {
    type: String,
    allowNull: false,
  },
  txn_date: {
    type: Date,
    allowNull: false,
  },
  txn_id: {
    type: String,
    allowNull: false,
  },
  transfer_type: {
    type: String,
    allowNull: false,
  },
  bank_name: {
    type: String,
    allowNull: true,
  },
  bank_account_no: {
    type: String,
    allowNull: true,
  },
  bank_ifsc_code: {
    type: String,
    allowNull: true,
  },
  borrower_mobile: {
    type: String,
    allowNull: true,
  },
  sender_name: {
    type: String,
    allowNull: true,
  },
  utr: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  batchId: {
    type: String,
    allowNull: true,
  },
  webhook_status_code: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  raw_data: {
    type: String,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
DisbursementsSchema.plugin(autoIncrement.plugin, 'id');
var Disbursement = (module.exports = mongoose.model(
  'disbursement',
  DisbursementsSchema,
));

module.exports.getAll = () => {
  return LoanTemplateNames.find({});
};

module.exports.addNew = (templateName) => {
  return Disbursement.create(templateName);
};

module.exports.getAll = () => {
  return Disbursement.find();
};

module.exports.findByTxnId = (txn_id) => {
  return Disbursement.findOne({ txn_id });
};

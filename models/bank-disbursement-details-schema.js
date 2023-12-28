var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const BankDisbursementDetailsSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  txn_id: {
    type: String,
    allowNull: true,
  },
  amount: {
    type: String,
    allowNull: true,
  },
  debit_account_no: {
    type: String,
    allowNull: true,
  },
  debit_ifsc: {
    type: String,
    allowNull: true,
  },
  debit_trn_remarks: {
    type: String,
    allowNull: true,
  },
  beneficiary_ifsc: {
    type: String,
    allowNull: true,
  },
  beneficiary_account_no: {
    type: String,
    allowNull: true,
  },
  beneficiary_name: {
    type: String,
    allowNull: true,
  },
  beneficiary_mobile_no: {
    type: String,
    allowNull: true,
  },
  mode_of_pay: {
    type: String,
    allowNull: true,
  },
  webhook_link: {
    type: String,
    allowNull: true,
  },
  webhook_status: {
    type: Boolean,
    allowNull: true,
  },
  access_token: {
    type: String,
    allowNull: true,
  },
  is_process: {
    type: Boolean,
    allowNull: true,
  },
  access_token: {
    type: String,
    allowNull: true,
  },
  approval_date: {
    type: Date,
    allowNull: false,
  },
  created_at: {
    type: Date,
    allowNull: false,
  },
  updated_at: {
    type: Date,
    allowNull: false,
  },
  bureau_score: {
    type: Number,
    allowNull: true,
  },
});

var BankDisbursement = (module.exports = mongoose.model(
  'icici_disbursement_details',
  BankDisbursementDetailsSchema,
  'icici_disbursement_details',
));

module.exports.getAll = () => {
  return BankDisbursement.find({});
};

module.exports.findPendingDisbursements = () => {
  return BankDisbursement.find({
    webhook_status: false,
  });
};

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LineStateSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },
  loan_id: {
    type: String,
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
  status: {
    type: String,
    allowNull: true,
  },
  sanction_limit: {
    type: Number,
    allowNull: true,
  },
  available_limit: {
    type: Number,
    allowNull: true,
  },
  int_rate: {
    type: Number,
    allowNull: true,
  },
  penal_interest: {
    type: Number,
    allowNull: true,
  },
  dpd: {
    type: Number,
    allowNull: true,
  },
  dpd_range: {
    type: String,
    allowNull: true,
  },
  npa: {
    type: String,
    allowNull: true,
  },
  excess_payment_ledger: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  created_by: {
    type: String,
    allowNull: true,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
});

var LineState = (module.exports = mongoose.model(
  'line_states',
  LineStateSchema,
  'line_states',
));

module.exports.getAll = () => {
  return LineState.find({});
};

module.exports.findByCondition = (condition) => {
  return LineState.findOne(condition);
};

module.exports.getByLoanIds = (loanIds) => {
  return LineState.find({ loan_id: { $in: loanIds } });
};

module.exports.findByLoanId = (loan_id) => {
  return LineState.findOne({ loan_id });
};

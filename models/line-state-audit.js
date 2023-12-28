var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LineStateAuditSchema = mongoose.Schema({
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
  usage_id: {
    type: String,
    allowNull: true,
  },
  drawdown_date: {
    type: Date,
    allowNull: true,
  },
  due_date: {
    type: Date,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  drawdown_amt: {
    type: String,
    allowNull: true,
  },
  principal_paid: {
    type: String,
    allowNull: true,
  },
  interst_due: {
    type: String,
    allowNull: true,
  },
  interst_paid: {
    type: String,
    allowNull: true,
  },
  lpi_due: {
    type: String,
    allowNull: true,
  },
  lpi_paid: {
    type: String,
    allowNull: true,
  },
  int_accrual: {
    type: String,
    allowNull: true,
  },
  dpd: {
    type: Number,
    allowNull: true,
  },
  payments: {
    type: Array,
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

var LineStateAudit = (module.exports = mongoose.model(
  'line_state_audit',
  LineStateAuditSchema,
  'line_state_audit',
));

module.exports.getAll = () => {
  return LineStateAudit.find({});
};

module.exports.findByCondition = (condition) => {
  return LineStateAudit.findOne(condition);
};

module.exports.getByLoanIds = (loanIds) => {
  return LineStateAudit.find({ loan_id: { $in: loanIds } });
};

module.exports.findByLIDAndUsageId = (filter) => {
  const { loan_id, usage_id } = filter;
  return LineStateAudit.findOne({
    loan_id,
    usage_id,
  });
};

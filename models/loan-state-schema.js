var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');
mongoose.Promise = global.Promise;

const LoanStateSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
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
  prin_os: {
    type: Decimal128,
    allowNull: false,
  },
  int_os: {
    type: Decimal128,
    allowNull: false,
  },
  dpd: {
    type: Number,
    allowNull: true,
  },
  prin_overdue: {
    type: Number,
    allowNull: true,
  },
  int_overdue: {
    type: Number,
    allowNull: true,
  },
  int_accrual: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  total_int_paid: {
    type: String,
    allowNull: true,
  },
  total_prin_paid: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
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
  status: {
    type: String,
    allowNull: true,
  },
  init_prin_os: {
    type: Decimal128,
    allowNull: true,
  },
  init_int_os: {
    type: Decimal128,
    allowNull: true,
  },
  total_lpi_paid: {
    type: Decimal128,
    allowNull: true,
  },
  total_charges_paid: {
    type: Decimal128,
    allowNull: true,
  },
  total_gst_paid: {
    type: Decimal128,
    allowNull: true,
  },
  current_prin_due: {
    type: Decimal128,
    allowNull: true,
  },
  current_int_due: {
    type: Decimal128,
    allowNull: true,
  },
  current_lpi_due: {
    type: Decimal128,
    allowNull: true,
  },
  current_charges_due: {
    type: Decimal128,
    allowNull: true,
  },
  current_gst_due: {
    type: Decimal128,
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
    type: Object,
    allowNull: true,
  },
  asset_class:{
    type: String,
    enum: ["Standard: REGULAR", "Standard: SMA O", "Standard: SMA 1", "Standard: SMA 2", "Standard: SMA 3", "Sub-Standard: NPA 1", "Sub- Standard: NPA 2", "Sub-Standard: NPA 3", "Sub-Standard: NPA 4", "Doubtful Assets: NPA 5"],
    allowNull: false,
  }
});
autoIncrement.initialize(mongoose.connection);
LoanStateSchema.plugin(autoIncrement.plugin, 'id');
var LoanState = (module.exports = mongoose.model(
  'loan_states',
  LoanStateSchema,
  'loan_states',
));

module.exports.getAll = () => {
  return LoanState.find({});
};

module.exports.addNew = (data) => {
  return LoanState.create(data);
};

module.exports.findByCondition = (condition) => {
  return LoanState.findOne(condition);
};

module.exports.updateLoanstate = (query, data) => {
  return LoanState.findOneAndUpdate(query, data, {});
};

module.exports.getByLoanIds = (loanIds) => {
  return loanIds.length > 1
    ? LoanState.find({ loan_id: { $in: loanIds } })
    : LoanState.find({ loan_id: loanIds[0] });
};

module.exports.findByLID = (loan_id) => {
  return LoanState.findOne({ loan_id });
};

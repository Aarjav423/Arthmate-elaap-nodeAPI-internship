var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LoanPaymentSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  amount_paid: {
    type: Number,
    allowNull: true,
  },
  prin_paid: {
    type: Number,
    allowNull: true,
  },
  int_paid: {
    type: Number,
    allowNull: true,
  },
  lpi_paid: {
    type: Number,
    allowNull: true,
  },
  charges_paid: {
    type: Number,
    allowNull: true,
  },
  gst_paid: {
    type: Number,
    allowNull: true,
  },
  utr: {
    type: String,
    allowNull: true,
  },
  utr_date: {
    type: Date,
    allowNull: true,
  },
});
autoIncrement.initialize(mongoose.connection);
LoanPaymentSchema.plugin(autoIncrement.plugin, 'id');
var LoanPayment = (module.exports = mongoose.model(
  'loan_payment',
  LoanPaymentSchema,
));

module.exports.getAll = () => {
  return LoanPayment.find({});
};

module.exports.addNew = (data) => {
  return LoanPayment.create(data);
};

module.exports.findByCondition = (condition) => {
  return LoanPayment.findOne(condition);
};

module.exports.updateLoanPayment = (query, data) => {
  return LoanPayment.findOneAndUpdate(query, data, {});
};

module.exports.getByLoanIds = (loanIds) => {
  return LoanPayment.find({ loan_id: { $in: loanIds } });
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const RequestQueueSoaSchema = mongoose.Schema({
  request_queue_soa_id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
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
  loan_id: {
    type: String,
    allowNull: true,
  },
  file_url: {
    type: String,
    allowNull: false,
  },
  requested_by: {
    type: String,
    allowNull: true,
  },
  product_type: {
    type: String,
    allowNull: true,
    enum: ['TL', 'LOC'],
  },
  status: {
    type: String,
    allowNull: true,
    enum: ['0', '1'],
  },
  requested_date: {
    type: Date,
    default: Date.now,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
RequestQueueSoaSchema.plugin(autoIncrement.plugin, 'request_queue_soa_id');
var RequestQueueSoa = (module.exports = mongoose.model(
  'request_queue_soa',
  RequestQueueSoaSchema,
));
module.exports.addNew = (data) => {
  return RequestQueueSoa.create(data);
};

module.exports.findIfExistByLoanIdAndDate = async (loan_id, date) => {
  return RequestQueueSoa.findOne({
    loan_id: loan_id,
    requested_date: date,
  });
};

module.exports.findById = async (_id) => {
  return RequestQueueSoa.findOne({
    _id,
  });
};

module.exports.findIfExistByLoanId = async (loan_id, status) => {
  return RequestQueueSoa.findOne({
    loan_id: loan_id,
    status: status,
  }).sort({ requested_date: -1 });
};

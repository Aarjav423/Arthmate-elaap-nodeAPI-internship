var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var disbursementSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  disbursement_seq: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: Number,
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
});
autoIncrement.initialize(mongoose.connection);
disbursementSchema.plugin(autoIncrement.plugin, 'id');
var DisbursementStatus = (module.exports = mongoose.model(
  'disbursement_status',
  disbursementSchema,
));

module.exports.findById = (id) => {
  return DisbursementStatus.findOne({
    _id: id,
  });
};

module.exports.addNew = (data) => {
  return DisbursementStatus.create(data);
};

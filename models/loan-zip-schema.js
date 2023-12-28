var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LoanZipSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  co_lender_id: {
    type: Number,
    allowNull: true,
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  co_lender_shortcode: {
    type: String,
    allowNull: true,
  },
  zip_file_url: {
    type: String,
    allowNull: true,
  },
  generated_date: {
    type: String,
    allowNull: true,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
LoanZipSchema.plugin(autoIncrement.plugin, 'id');
var LoanZip = (module.exports = mongoose.model(
  'loan_zipped_details',
  LoanZipSchema,
));

module.exports.findIfExists = (data) => {
  return LoanZip.findOne({
    generated_date: data.created_at,
    co_lender_shortcode: data.co_lender_shortcode,
  });
};

module.exports.findAllWithFilter = (data) => {
  return LoanZip.find({
    co_lender_shortcode: data.co_lender_shortcode,
  });
};

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AScoreDetailsSchema = mongoose.Schema({
  first_name: {
    type: String,
    allowNull: true,
  },
  last_name: {
    type: String,
    allowNull: true,
  },
  dob: {
    type: Date,
    allowNull: true,
  },
  pan: {
    type: String,
    allowNull: true,
  },
  gender: {
    type: String,
    allowNull: true,
  },
  mobile_number: {
    type: String,
    allowNull: true,
  },
  address: {
    type: String,
    allowNull: true,
  },
  city: {
    type: String,
    allowNull: true,
  },
  state_code: {
    type: String,
    allowNull: true,
  },
  pin_code: {
    type: String,
    allowNull: true,
  },
  enquiry_purpose: {
    type: String,
    allowNull: true,
  },
  enquiry_stage: {
    type: String,
    allowNull: true,
  },
  enquiry_amount: {
    type: String,
    allowNull: true,
  },
  en_acc_account_number_1: {
    type: String,
    allowNull: true,
  },
  bureau_type: {
    type: String,
    allowNull: true,
  },
  tenure: {
    type: Number,
    allowNull: true,
  },
  product_type: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  consent: {
    type: String,
    allowNull: true,
  },
  a_score_request_id: {
    type: String,
    allowNull: true,
    default: '',
  },
  a_score: {
    type: String,
    allowNull: true,
  },
  consent_timestamp: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
});

var AScoreDetails = (module.exports = mongoose.model(
  'a_score_details',
  AScoreDetailsSchema,
  'a_score_details',
));

module.exports.getAll = () => {
  return AScoreDetails.find({});
};

module.exports.findByLAID = (loan_app_id) => {
  return AScoreDetails.findOne({ loan_app_id });
};

module.exports.findIfExists = (loan_app_id) => {
  return AScoreDetails.findOne({ loan_app_id });
};
module.exports.updateAScoreDetails = (loan_app_id, data) => {
  return AScoreDetails.findOneAndUpdate({ loan_app_id }, data, { new: true });
};

module.exports.addNew = (data) => {
  var insertdata = new AScoreDetails(data);
  return insertdata.save();
};

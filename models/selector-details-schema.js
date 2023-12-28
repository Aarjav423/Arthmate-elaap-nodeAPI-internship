var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const SelectorSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  first_name: {
    type: String,
    allowNull: true,
  },
  middle_name: {
    type: String,
    allowNull: true,
  },
  last_name: {
    type: String,
    allowNull: true,
  },
  dob: {
    type: String,
    allowNull: true,
  },
  appl_pan: {
    type: String,
    allowNull: true,
  },
  gender: {
    type: String,
    allowNull: true,
  },
  appl_phone: {
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
  state: {
    type: String,
    allowNull: true,
  },
  pincode: {
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
  sanction_amount: {
    type: String,
    allowNull: true,
  },
  bureau_type: {
    type: String,
    allowNull: true,
  },
  tenure: {
    type: String,
    allowNull: true,
  },
  request_id_a_score: {
    type: String,
    allowNull: true,
  },
  request_id_b_score: {
    type: String,
    allowNull: true,
  },
  ceplr_cust_id: {
    type: String,
    allowNull: true,
  },
  interest_rate: {
    type: String,
    allowNull: true,
  },
  dscr: {
    type: String,
    allowNull: true,
  },
  monthly_income: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  is_submitted: {
    type: Boolean,
    allowNull: true,
  },
  co_lender_shortcode: {
    type: String,
    allowNull: true,
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  co_lender_assignment_id: {
    type: String,
    allowNull: true,
  },
  consent: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  consent_timestamp: {
    type: Date,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
SelectorSchema.plugin(autoIncrement.plugin, 'id');
var SelectorDetails = (module.exports = mongoose.model(
  'selector_details',
  SelectorSchema,
));

module.exports.addNew = (loan_app_id, data) => {
  const _query = {
    loan_app_id: loan_app_id,
    ...data,
  };
  return SelectorDetails.create(_query);
};

module.exports.findIfExistByLId = (loan_app_id) => {
  return SelectorDetails.findOne({ loan_app_id });
};

module.exports.updateByLID = (loan_app_id, data) => {
  return SelectorDetails.findOneAndUpdate({ loan_app_id: loan_app_id }, data);
};

module.exports.findIfExistById = (id) => {
  return SelectorDetails.findOne({ _id: id });
};

module.exports.getAll = () => {
  return SelectorDetails.find({});
};

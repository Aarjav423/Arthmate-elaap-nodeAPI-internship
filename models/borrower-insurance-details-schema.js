var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const BorrowerInsuranceDetailsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
    required: true,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  product_name: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  borrower_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  sanction_amount: {
    type: Number,
    allowNull: false,
  },
  master_policy_number: {
    type: String,
    allowNull: false,
  },
  insurance_charges: {
    type: Number,
    allowNull: false,
  },
  policy_premium: {
    type: Number,
    allowNull: false,
  },
  gst_on_policy_premium: {
    type: Number,
    allowNull: false,
  },
  tenure_in_months: {
    type: Number,
    allowNull: false,
  },
  borrower_age: {
    type: Number,
    allowNull: false,
  },
  processor_ratio: {
    type: String,
    allowNull: false,
  },
  partner_ratio: {
    type: String,
    allowNull: false,
  },
  product_key: {
    type: String,
    allowNull: true,
  },
  external_reference_number: {
    type: String,
    allowNull: true,
  },
  policy_number: {
    type: String,
    allowNull: true,
  },
  policy_pdf_url: {
    type: String,
    allowNull: true,
  },
  premium_multiplier: {
    type: Number,
    allowNull: false,
  },
  base_policy_premium: {
    type: Number,
    allowNull: true,
  },
  gst_on_base_policy_premium: {
    type: Number,
    allowNull: true,
  },
  policy_start_date: {
    type: Date,
    allowNull: true,
  },
  policy_end_date: {
    type: Date,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
BorrowerInsuranceDetailsSchema.plugin(autoIncrement.plugin, 'id');
var BorrowerInsuranceDetails = (module.exports = mongoose.model(
  'borrower_insurance_details',
  BorrowerInsuranceDetailsSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new BorrowerInsuranceDetails(data);
  return insertdata.save();
};

module.exports.findByLID = (loan_id) => {
  return BorrowerInsuranceDetails.findOne({ loan_id });
};

module.exports.findByExtRefNumber = (external_reference_number) => {
  return BorrowerInsuranceDetails.findOne({ external_reference_number });
};

module.exports.findByPolicyNumber = (policy_number) => {
  return BorrowerInsuranceDetails.findOne({ policy_number });
};

module.exports.updateByLID = (loan_id, data) => {
  return BorrowerInsuranceDetails.findOneAndUpdate(
    {
      loan_id,
    },
    data,
    {
      new: true,
    },
  );
};

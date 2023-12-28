const { ObjectId, Decimal128 } = require('mongodb');
var mongoose = require('mongoose');

const EnachDetailsSchema = mongoose.Schema({
  id: {
    type: ObjectId,
    primaryKey: true,
    allowNull: false,
  },
  request_id: {
    type: String,
    allowNull: false,
    unique: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  company_id : {
    type: Number,
    allowNull: true,
  },
  customer_title: {
    type: String,
    allowNull: true,
  },
  customer_name: {
    type: String,
    allowNull: true,
  },
  customer_email_id: {
    type: String,
    allowNull: true,
  },
  customer_mobile_code: {
    type: String,
    allowNull: true,
  },
  customer_mobile_no: {
    type: String,
    allowNull: true,
  },
  customer_telephone_code: {
    type: String,
    allowNull: true,
  },
  customer_telephone_no: {
    type: String,
    allowNull: true,
  },
  customer_pan: {
    type: String,
    allowNull: true,
  },
  account_no: {
    type: Number,
    allowNull: true,
  },
  account_type: {
    type: String,
    allowNull: true,
  },
  amount: {
    type: Decimal128,
    allowNull: true,
  },
  amount_type: {
    type: String,
    allowNull: true,
  },
  enach_reason: {
    type: String,
    allowNull: true,
  },
  start_date: {
    type: Date,
    allowNull: true,
  },
  end_date: {
    type: Date,
    allowNull: true,
  },
  emi_frequency: {
    type: String,
    allowNull: true,
  },
  purpose_of_mandate: {
    type: String,
    allowNull: true,
  },
  bank: {
    type: String,
    allowNull: true,
  },
  authentication_mode: {
    type: String,
    allowNull: true,
  },
  corporate_name: {
    type: String,
    allowNull: true,
  },
  utility_number: {
    type: String,
    allowNull: true,
  },
  reference_number: {
    type: String,
    allowNull: true,
  },
  npci_ref_msg_id: {
    type: String,
    allowNull: true,
  },
  status :{
    type: String,
    allowNull: true,
  },
  status_code :{
    type: String,
    allowNull: true,
  },
  status_desc :{
    type: String,
    allowNull: true,
  },
  mandate_id: {
    type: String,
    allowNull: true,
  },
  is_sms_required :{
    type: Boolean,
    allowNull: true,
  },
  is_email_required :{
    type: Boolean,
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

var EnachDetails = (module.exports = mongoose.model(
  'enach_details',
  EnachDetailsSchema,
));

module.exports.getByRequestId = (request_id) => {
  return EnachDetails.findOne({
    request_id: request_id,
  });
};

module.exports.addNew = (subscriptionData) => {
  return EnachDetails.create(subscriptionData);
};

module.exports.getByLoanAppId = (loan_app_id) => {
  return EnachDetails.findOne({
    loan_app_id: loan_app_id,
  });
};

module.exports.getAll = () => {
  return EnachDetails.find({});
};

module.exports.findBydata = (data,fromDate,toDate,companyId,searchBy) => {
  let query = {}
  if (fromDate && toDate) {
   query.created_at = {$gte : fromDate, $lte : toDate}
  }
  if (companyId ) {
   query.company_id = companyId
  }
  if(data){
    query.status =  {"$in" : data}
  }
  if (searchBy){
    query. $or= [
      { request_id: searchBy },
      { mandate_id: searchBy },
      { reference_number: searchBy }
    ]
  }
  return EnachDetails.find(query);
};

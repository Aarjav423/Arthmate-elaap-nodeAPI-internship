const { boolean } = require('mathjs');
const { ObjectId, Decimal128 } = require('mongodb');
var mongoose = require('mongoose');

const request_id = mongoose.Schema(
    {
      req_id: {
        type: String,
        allowNull: false,
      },
      timestamp: {
        type: Date,
        allowNull: false,
      },
    },
    { _id: false },
  );
  

const EnachDetailsHistorySchema = mongoose.Schema({
  id: {
    type: ObjectId,
    primaryKey: true,
    allowNull: false,
  },
  request_id: {
    type: request_id,
    allowNull: true,
    unique: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
    unique: false,
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
  consent: {
    type: String,
    allowNull: true,
  },
  npci_request_id: {
    type: String,
    allowNull: true,
  },
  accptd: {
    type: boolean,
    allowNull: true,
  },
  msg_id: {
    type: String,
    allowNull: true,
  },
  reject_reason:{
    type: String,
    allowNull: true,
  },
  status :{
    type: String,
    allowNull: true,
  },
  mandate_id: {
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
  _class: {
    type: String,
    allowNull: true,
  },
});

var EnachDetailsHistory = (module.exports = mongoose.model(
  'enach_details_history',
  EnachDetailsHistorySchema,
  'enach_details_history'
));

module.exports.findBydata = (request_ID) => {
  return EnachDetailsHistory.find({
    "request_id.req_id" : request_ID,
  });
};

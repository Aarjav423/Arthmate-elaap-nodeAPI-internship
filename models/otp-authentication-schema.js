var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var otpAuthSchema = mongoose.Schema({
  company_id: {
    type: Number,
  },
  otp: {
    type: Number,
    allowNull: false,
  },
  expiry: {
    type: Date,
    allowNull: false,
    Value: Date.now,
  },
  req_url: {
    type: String,
  },
  res_url: {
    type: String,
  },
  consent: {
    type: String,
    enum: ['Y', 'N'],
  },
  consent_timestamp: {
    type: Date,
  },
  mobile_number: {
    type: String,
  },
  generated_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  created_by: {
    type: String,
  },
  request_id: {
    type: String,
    allowNull: true,
  },
});
var mobileData = (module.exports = mongoose.model(
  'otp_authentication',
  otpAuthSchema,
));

//insert single
module.exports.addNew = async (mobileOtpData) => {
  return mobileData.create(mobileOtpData);
};

module.exports.findIfReqIdExists = (request_id) => {
  return mobileData.findOne({
    request_id: request_id,
  });
};

module.exports.findIfOTPExists = (request_id, otp) => {
  return mobileData.findOne({
    request_id: request_id,
    otp: otp,
  });
};

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ckyc_response = mongoose.Schema({
  request_id: {
    type: String,
    allowNull: true,
  },
  api_token: {
    type: String,
    allowNull: true,
  },
  user_name: {
    type: String,
    allowNull: true,
  },
  password: {
    type: String,
    allowNull: true,
  },
  customer_new_ckyc_status_request_details: {
    type: Array,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
});
var KycData = (module.exports = mongoose.model('ckyc_response', ckyc_response));

//insert single
module.exports.addNew = async (kycData) => {
  return KycData.create(kycData);
};

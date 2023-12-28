var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var userKycSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  aadhaar_number: {
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
});
autoIncrement.initialize(mongoose.connection);
userKycSchema.plugin(autoIncrement.plugin, 'id');
var Users = (module.exports = mongoose.model(
  'user_kyc_details',
  userKycSchema,
));

module.exports.findById = (id) => {
  return Users.findOne({
    _id: id,
  });
};

module.exports.addNew = (data) => {
  return Users.create(data);
};

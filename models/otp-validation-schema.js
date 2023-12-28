var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const OtpvalidationListSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  product_id: {
    type: String,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  otp: {
    type: Number,
    allowNull: false,
  },
  reason: {
    type: String,
    allowNull: true,
  },
  expiry: {
    type: Date,
    allowNull: false,
    Value: Date.now,
  },
  created_at: {
    type: Date,
    allowNull: false,
    Value: Date.now,
  },
  updated_at: {
    type: Date,
    Value: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
OtpvalidationListSchema.plugin(autoIncrement.plugin, 'id');
var OtpvalidationList = (module.exports = mongoose.model(
  'otp_validation',
  OtpvalidationListSchema,
));

module.exports.addNew = (data) => {
  return OtpvalidationList.create(data);
};

module.exports.updateData = (otp) => {
  let query = {
    otp: otp,
  };
  return OtpvalidationList.findOneAndUpdate(
    query,
    {
      reason: 'validated',
    },
    {},
  );
};

module.exports.checkAlreadyExists = (where) => {
  return OtpvalidationList.findOne({
    where: where,
  });
};

module.exports.getPaginateddata = (data, callback) => {
  OtpvalidationList.findAndCountAll({
    where: data,
    order: [['id', 'DESC']],
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};
module.exports.findOneWithOtp = (otp, loan_id) => {
  let query = {
    otp: otp,
    loan_id: loan_id,
  };
  return OtpvalidationList.findOne(query);
};

module.exports.deleteRecord = (loan_id) => {
  let query = {
    loan_id: loan_id,
  };
  return OtpvalidationList.deleteOne(query);
};

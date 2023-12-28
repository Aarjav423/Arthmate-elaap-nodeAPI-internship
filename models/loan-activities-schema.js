var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LoanActivitiesSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNullL: false,
  },
  product_name: {
    type: String,
    allowNullL: false,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_app_id: {
    type: String,
    allowNull: false,
  },
  api_type: {
    type: String,
    allowNull: false,
  },
  request_type: {
    type: String,
    enum: ['request', 'response', 'error'],
    allowNull: false,
  },
  response_type: {
    type: String,
    enum: ['success', 'fail', ''],
    allowNull: false,
  },
  label: {
    type: String,
    allowNull: false,
  },
  url: {
    type: String,
    allowNull: false,
  },
  created_by:{
    type: String,
    allowNull: true,
  },
  borrower_id:{
    type: String,
    allowNull: true,
  },
},
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
  }
});

autoIncrement.initialize(mongoose.connection);
LoanActivitiesSchema.plugin(autoIncrement.plugin, 'id');
var LoanActivities = (module.exports = mongoose.model(
  'loan_activities',
  LoanActivitiesSchema,
));

module.exports.addNew = (data) => {
  return LoanActivities.create(data);
};

module.exports.findAll = () => {
  return LoanActivities.find({});
};

module.exports.findByLId = (loan_id) => {
  return LoanActivities.find({
    loan_id,
  });
};

module.exports.findByCondition = (condition) => {
  return LoanActivities.findOne(condition);
};

module.exports.findByLAPId = (loan_app_id) => {
  return LoanActivities.find({
    loan_app_id,
  });
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LoanCustomIdSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  loan_custom_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
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
autoIncrement.initialize(mongoose.connection);
LoanCustomIdSchema.plugin(autoIncrement.plugin, 'id');
var LoanCustom = (module.exports = mongoose.model(
  'loan_custom_id',
  LoanCustomIdSchema,
));

module.exports.getAll = () => {
  return LoanCustom.find({});
};

module.exports.addNew = (data) => {
  return LoanCustom.create(data);
};

module.exports.getCount = () => {
  return LoanCustom.find({}).count();
};

module.exports.findByCondition = (condition) => {
  return LoanCustom.findOne(condition);
};

module.exports.updateUpsertById = (sequence, data) => {
  return LoanCustom.update(
    {
      loan_custom_id: sequence,
    },
    {
      $setOnInsert: data,
    },
    {
      upsert: true,
    },
  );
};

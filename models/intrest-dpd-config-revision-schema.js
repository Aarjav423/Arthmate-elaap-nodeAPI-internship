var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const intrestDpdConfigRevisionSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  added_date: {
    type: Date,
    allowNull: true,
  },
  user_id: {
    type: String,
    allowNull: true,
  },
  user_name: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  destination: {
    type: String,
    allowNull: true,
  },
  fees: {
    type: String,
    allowNull: true,
  },
  subvention_fees: {
    type: String,
    allowNull: true,
  },
  processing_fees: {
    type: String,
    allowNull: true,
  },
  usage_fee: {
    type: String,
    allowNull: true,
  },
  upfront_interest: {
    type: String,
    allowNull: true,
  },
  int_value: {
    type: String,
    allowNull: true,
  },
  interest_free_days: {
    type: String,
    allowNull: true,
  },
  exclude_interest_till_grace_period: {
    type: String,
    allowNull: true,
  },
  tenure_in_days: {
    type: String,
    allowNull: true,
  },
  grace_period: {
    type: String,
    allowNull: true,
  },
  overdue_charges_per_day: {
    type: String,
    allowNull: true,
  },
  penal_interest: {
    type: String,
    allowNull: true,
  },
  overdue_days: {
    type: String,
    allowNull: true,
  },
  penal_interest_days: {
    type: String,
    allowNull: true,
  },
});
autoIncrement.initialize(mongoose.connection);
intrestDpdConfigRevisionSchema.plugin(autoIncrement.plugin, 'id');
var intrestDpdConfigRevision = (module.exports = mongoose.model(
  'intrest_dpd_config_revision',
  intrestDpdConfigRevisionSchema,
));

module.exports.addLog = (data) => {
  return intrestDpdConfigRevision.create(data);
};

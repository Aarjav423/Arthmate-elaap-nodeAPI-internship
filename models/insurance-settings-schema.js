var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const InsuranceSettingsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: true,
  },
  digit_api_reference_number: {
    type: String,
    allowNull: true,
  },
  product_key: {
    type: String,
    allowNull: true,
  },
  package_name: {
    type: String,
    allowNull: true,
  },
  master_policy_number: {
    type: String,
    allowNull: true,
    default: false,
  },
  insured_product_code: {
    type: String,
    allowNull: true,
  },
  partner_api_key: {
    type: String,
    allowNull: true,
  },
  imd_code: {
    type: String,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
InsuranceSettingsSchema.plugin(autoIncrement.plugin, 'id');
var InsuranceSettings = (module.exports = mongoose.model(
  'insurance_settings',
  InsuranceSettingsSchema,
  'insurance_settings',
));

module.exports.addNew = async (data) => {
  const insertdata = new InsuranceSettings(data);
  return insertdata.save();
};

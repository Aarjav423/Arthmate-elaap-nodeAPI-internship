var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const DisbursementChannelConfigSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_code: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: false,
  },
  product_id: {
    type: String,
    allowNull: false,
  },
  product_name: {
    type: String,
    allowNull: false,
  },
  co_lender_id: {
    type: Number,
    allowNull: true,
  },
  disburse_channel: {
    type: String,
    allowNull: false,
  },
  wallet_config_check: {
    type: String,
    default: 0,
    allowNull: false,
  },
  debit_account: {
    type: String,
    allowNull: false,
  },
  debit_account_ifsc: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    default: 1,
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
  available_balance: {
    type: Number,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
DisbursementChannelConfigSchema.plugin(autoIncrement.plugin, 'id');
var DisbursementChannelConfig = (module.exports = mongoose.model(
  'disbursement_channel_config',
  DisbursementChannelConfigSchema,
));

module.exports.getAll = () => {
  return DisbursementChannelConfig.find().sort({ _id: -1 });
};

module.exports.findByCompanyId = (company_id) => {
  return DisbursementChannelConfig.find({
    company_id: company_id,
  });
};

module.exports.findByCompanyAndProductId = (company_id, product_id) => {
  return DisbursementChannelConfig.findOne({
    company_id,
    product_id,
  });
};

module.exports.addNew = (data) => {
  const insertdata = new DisbursementChannelConfig(data);
  return insertdata.save();
};

module.exports.deleteById = (id) => {
  return DisbursementChannelConfig.deleteOne({
    _id: id,
  });
};

module.exports.updateChannelConfigById = (data, id) => {
  return DisbursementChannelConfig.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.updateChannelConfigStatusById = (status, id) => {
  return DisbursementChannelConfig.findOneAndUpdate(
    {
      _id: id,
    },
    {
      status: status,
    },
    {},
  );
};

module.exports.getDisburseChannel = (condition) => {
  return DisbursementChannelConfig.findOne(condition);
};

module.exports.updateAvailableBalance = (
  company_id,
  product_id,
  disburse_channel,
  available_balance,
) => {
  let query = { company_id, product_id, disburse_channel };
  return DisbursementChannelConfig.findOneAndUpdate(
    query,
    {
      available_balance,
    },
    { new: true },
  );
};

module.exports.findByColenderId = (co_lender_id) => {
  return DisbursementChannelConfig.findOne({
    co_lender_id,
  });
};

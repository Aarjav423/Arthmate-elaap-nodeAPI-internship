var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const DisbursementChannelMasterSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: String,
    allowNull: false,
  },
  endpoint: {
    type: String,
    allowNull: false,
  },
  webhook_url: {
    type: String,
    allowNull: false,
  },
  secret_key: {
    type: String,
    allowNull: false,
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
});

autoIncrement.initialize(mongoose.connection);
DisbursementChannelMasterSchema.plugin(autoIncrement.plugin, 'id');
var DisbursementMaster = (module.exports = mongoose.model(
  'disbursement_channel_master',
  DisbursementChannelMasterSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new DisbursementMaster(data);
  return insertdata.save();
};

module.exports.listAll = (data) => {
  return DisbursementMaster.find({});
};

module.exports.findByTitle = (title) => {
  return DisbursementMaster.find({ title: title });
};

module.exports.findOneByTitle = (title) => {
  return DisbursementMaster.findOne({ title: title });
};

module.exports.updateById = (data, id) => {
  return DisbursementMaster.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.deleteById = (id) => {
  return DisbursementMaster.remove({
    _id: id,
  });
};

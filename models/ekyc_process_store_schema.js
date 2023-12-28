var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const EkycProcessStoreSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  kyc_id: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  ekyc_type: {
    type: String,
    allowNull: true,
  },
  kyc_date: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  kyc_vendor: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  pan_card: {
    type: String,
    allowNull: true,
  },
  name: {
    type: String,
    allowNull: true,
  },
  bank_acc_no: {
    type: String,
    allowNull: true,
  },
  ifsc_code: {
    type: String,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
EkycProcessStoreSchema.plugin(autoIncrement.plugin, 'id');
var EkycProcessStore = (module.exports = mongoose.model(
  'ekyc_process_store',
  EkycProcessStoreSchema,
));

module.exports.addNew = (data) => {
  return EkycProcessStore.create(data);
};

module.exports.getPanDetails = (condition) => {
  return EkycProcessStore.findOne(condition).sort({
    _id: -1,
  });
};

module.exports.getEkycList = (loan_id) => {
  return EkycProcessStore.find({
    loan_id: loan_id,
  });
};

module.exports.updateData = (data, condition) => {
  return EkycProcessStore.findOneAndUpdate(condition, data, {});
};

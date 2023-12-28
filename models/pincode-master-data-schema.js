var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const PincodeMasterDataSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },
  taluk: {
    type: String,
    allowNull: true,
  },
  district: {
    type: String,
    allowNull: true,
  },
  area_name: {
    type: String,
    allowNull: true,
  },
  pin_code: {
    type: Number,
    allowNull: true,
  },
  state_code: {
    type: Number,
    allowNull: true,
  },
});

var PincodeMasterData = (module.exports = mongoose.model(
  'pincode_master_data',
  PincodeMasterDataSchema,
  'pincode_master_data',
));

module.exports.addNew = (data) => {
  return PincodeMasterData.create(data);
};

module.exports.findByPincode = (pin_code) => {
  return PincodeMasterData.findOne({
    pin_code: pin_code,
  });
};

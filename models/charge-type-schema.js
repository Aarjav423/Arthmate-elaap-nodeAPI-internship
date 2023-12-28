var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const ChargeTypeSchema = mongoose.Schema({
  charge_id: {
    type: Number,
    allowNull: true,
    unique: true,
  },
  charge_type: {
    type: String,
    allowNull: true,
    unique: true,
  },
});

var ChargeType = (module.exports = mongoose.model(
  'charges_id_mapping',
  ChargeTypeSchema,
  'charges_id_mapping',
));

module.exports.addNew = (data) => {
  return ChargeType.create(data);
};

module.exports.getAll = () => {
  return ChargeType.find({}).select('-_id -__v');
};

module.exports.findByName = (charge_type) => {
  return ChargeType.findOne({ charge_type }).select('-_id -__v');
};

module.exports.findByNameAndId = (charge_type, charge_id) => {
  return ChargeType.findOne({
    charge_type: charge_type,
    charge_id: charge_id,
  }).select('-_id -__v');
};

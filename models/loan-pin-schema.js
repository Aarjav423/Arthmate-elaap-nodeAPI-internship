var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var bcrypt = require('bcryptjs');
const setLoanPinSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
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
  pin: {
    type: String,
    allowNull: false,
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
setLoanPinSchema.plugin(autoIncrement.plugin, 'id');
var setLoanPin = (module.exports = mongoose.model(
  'set_loan_pin',
  setLoanPinSchema,
));

module.exports.addNew = async (data) => {
  // return setLoanPin.create(data);
  var new_pin_data = new setLoanPin(data);
  const password = data.pin;
  const saltRounds = 10;
  try {
    new_pin_data.pin = await bcrypt.hash(password, saltRounds);
    return new_pin_data.save();
  } catch (error) {
    return error;
  }
};

module.exports.findExists = (data) => {
  return setLoanPin.find(data);
};

module.exports.updatePin = async (data, pin) => {
  const password = pin;
  const saltRounds = 10;
  try {
    pin = await bcrypt.hash(password, saltRounds);
    const updatedPin = {
      pin,
    };
    return setLoanPin.findOneAndUpdate(data, updatedPin, {
      new: true,
    });
  } catch (error) {
    return error;
  }
};

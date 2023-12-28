var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const BasePolicyPremiumRateSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },
  min_age: {
    type: Number,
    allowNull: false,
  },
  max_age: {
    type: Number,
    allowNull: false,
  },
  3: {
    type: Number,
    allowNull: false,
  },
  6: {
    type: Number,
    allowNull: false,
  },
  9: {
    type: Number,
    allowNull: false,
  },
  12: {
    type: Number,
    allowNull: false,
  },
  24: {
    type: Number,
    allowNull: false,
  },
  36: {
    type: Number,
    allowNull: false,
  },
  48: {
    type: Number,
    allowNull: false,
  },
  60: {
    type: Number,
    allowNull: false,
  },
});

var BasePolicyPremiumRate = (module.exports = mongoose.model(
  'insurance_base_policy_premium_rate',
  BasePolicyPremiumRateSchema,
));

module.exports.findByAge = (age) => {
  const query = {
    $and: [
      {
        min_age: {
          $lte: age,
        },
      },
      {
        max_age: {
          $gte: age,
        },
      },
    ],
  };
  return BasePolicyPremiumRate.findOne(query);
};

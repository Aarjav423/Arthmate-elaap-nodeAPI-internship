var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const CreditGridRulesSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  credit_grid_id: {
    type: Number,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  key: {
    type: String,
    allowNull: false,
  },
  formula: {
    type: String,
    allowNull: false,
  },
  value: {
    type: String,
    allowNull: false,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
CreditGridRulesSchema.plugin(autoIncrement.plugin, 'id');
var CreditGridRules = (module.exports = mongoose.model(
  'credit_grid_rues',
  CreditGridRulesSchema,
));

module.exports.addNew = (data) => {
  return CreditGridRules.create(data);
};

module.exports.getAll = (product_id) => {
  return CreditGridRules.find({
    product_id,
  });
};

module.exports.updateData = (data, id) => {
  return CreditGridRules.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {
      new: true,
    },
  );
};

module.exports.addInBulk = (grid) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    grid.forEach((record) => {
      CreditGridRules.create(record)
        .then((response) => {
          counter++;
          if (counter >= grid.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const CreditGridSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  product_name: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  lender_id: {
    type: String,
    allowNull: true,
  },
  title: {
    type: String,
    allowNull: false,
  },
  status: {
    type: String,
    allowNull: false,
    default: 'inactive',
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
CreditGridSchema.plugin(autoIncrement.plugin, 'id');
var CreditGrid = (module.exports = mongoose.model(
  'credit_grid',
  CreditGridSchema,
));

module.exports.addNew = (data) => {
  return CreditGrid.create(data);
};

module.exports.getAll = (product_id) => {
  return CreditGrid.find({
    product_id,
  });
};

module.exports.checkIfExistsByPID = (product_id, title) => {
  return CreditGrid.findOne({
    product_id,
    title,
  });
};

module.exports.updateStatus = (status, product_id, id) => {
  return CreditGrid.findOneAndUpdate(
    {
      _id: id,
      product_id,
    },
    status,
    {
      new: true,
    },
  );
};

module.exports.updateGridStatus = (status, product_id, id) => {
  return CreditGrid.findOneAndUpdate(
    {
      _id: id,
      product_id,
    },
    {
      status: status,
    },
    {
      new: true,
    },
  );
};

module.exports.getByGridId = (id) => {
  return CreditGrid.findOne({
    _id: id,
  });
};

module.exports.defineGrid = (product_id, id) => {
  const query = {
    $and: [
      {
        _id: {
          $ne: id,
        },
      },
      {
        product_id: {
          $eq: product_id,
        },
      },
    ],
  };
  return CreditGrid.update(
    query,
    {
      $set: {
        status: 'inactive',
      },
    },
    {
      multi: true,
    },
  );
};

module.exports.getActiveGrid = (product_id) => {
  return CreditGrid.find({
    product_id,
    status: 'active',
  });
};

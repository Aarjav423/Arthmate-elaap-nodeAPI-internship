var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ProductType = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  product_type_id: {
    type: Number,
    allowNull: true,
  },
  product_type_code: {
    type: String,
    allowNull: true,
  },
  product_type_name: {
    type: String,
    allowNull: true,
  },
  created_by: {
    type: String,
    allowNull: true,
  },
  created_date: {
    type: Date,
    allowNull: true,
  },
  last_updated_by: {
    type: String,
    allowNull: true,
  },
  last_updated_datetime: {
    type: Date,
    allowNull: true,
  },
});
var ProductType = (module.exports = mongoose.model(
  'product_type_detail',
  ProductType,
));

module.exports.findProductTypeCode = (product_type_id) => {
  return ProductType.find({
    product_type_id: product_type_id,
  })
    .sort({ _id: -1 })
    .limit(1);
};

module.exports.findProductTypeData = (product_type_name) => {
  return ProductType.findOne({
    product_type_name: product_type_name,
  });
};

module.exports.getAll = () => {
  return ProductType.find({});
};

module.exports.addOne = async (product) => {
  var newProduct = new ProductType(product);
  try {
    return newProduct.save();
  } catch (error) {
    return error;
  }
};

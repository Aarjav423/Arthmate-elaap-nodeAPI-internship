var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const tokenSchema = mongoose.Schema({
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
  company_code: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  co_lender_id: {
    type: Number,
    allowNull: true
  },
  co_lender_shortcode: {
    type: String,
    allowNull: true
  },
  user_id: {
    type: String,
    allowNull: true,
  },
  user_name: {
    type: String,
    allowNull: true,
  },
  name: {
    type: String,
    allowNull: false,
  },
  type: {
    type: String,
    allowNull: false,
  },
  token_id: {
    type: String,
    allowNull: false,
  },
  expired: {
    type: Number,
    allowNull: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
tokenSchema.plugin(autoIncrement.plugin, 'id');
var Tokens = (module.exports = mongoose.model('tokens', tokenSchema));

module.exports.addNew = (data) => {
  return Tokens.create(data);
};

module.exports.listAll = () => {
  return Tokens.find().sort({ _id: -1 });
};

module.exports.findById = (id) => {
  return Tokens.findOne({
    _id: id,
  });
};

module.exports.getByCpompanyIdProductID = (filter) => {
  var query = {};
  const { company_id, product_id } = filter;
  query['$and'] = [];
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id !== null && Number(product_id)) {
    query['$and'].push({
      product_id,
    });
  }
  return Tokens.find(query);
};

module.exports.findByTokenId = (token_id) => {
  return Tokens.findOne({
    token_id: token_id,
  });
};

module.exports.findByCompanyId = (company_id) => {
  return Tokens.find({
    company_id: company_id,
  });
};

module.exports.updateStatus = (id, expired) => {
  const query = {
    token_id: id,
  };
  return Tokens.findOneAndUpdate(
    query,
    {
      expired: expired,
    },
    {},
  );
};

module.exports.deleteById = (id) => {
  return Tokens.deleteOne({
    token_id: id,
  });
};

module.exports.findByCoLenderId =(filter) => {
  
  return Tokens.find(filter)
}
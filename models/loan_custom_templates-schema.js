var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LoanCustomTemplatesSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  type: {
    type: String,
    allowNullL: false,
  },
  status: {
    type: Number,
    allowNullL: true,
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
  created_by: {
    type: String,
    allowNull: true,
    default: '',
  },
  updated_by: {
    type: String,
    allowNull: true,
    default: '',
  },
});

autoIncrement.initialize(mongoose.connection);
LoanCustomTemplatesSchema.plugin(autoIncrement.plugin, 'id');
var LoanCustomTemplate = (module.exports = mongoose.model(
  'loan_custom_templates',
  LoanCustomTemplatesSchema,
));

module.exports.addNew = (customTemplData) => {
  return LoanCustomTemplate.create(customTemplData);
};

module.exports.getAllActive = () => {
  const query = {
    status: 1,
  };
  return LoanCustomTemplate.find(query);
};
module.exports.listAll = (loanTypes) => {
  return LoanCustomTemplate.find();
};

module.exports.findById = (id) => {
  return Services.findOne({
    _id: id,
  });
};

module.exports.listAll = () => {
  return LoanCustomTemplate.find();
};

module.exports.findIfExists = (partner_name, partnerid) => {
  return LoanCustomTemplate.findOne({
    partner_name: partner_name,
    partnerid: partnerid,
  });
};

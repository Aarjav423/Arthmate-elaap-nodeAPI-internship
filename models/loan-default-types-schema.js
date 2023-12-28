var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const loanDefaultTypesSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: String,
    allowNullL: false,
  },
  desc: {
    type: String,
    allowNullL: false,
  },
  template_names: {
    type: String,
    allowNullL: false,
  },
  loan_custom_templates_id: {
    type: Number,
    allowNull: true,
  },
  mapped_table: {
    type: String,
    allowNull: true,
  },
  status: {
    type: Number,
    allowNullL: false,
    defaultValue: 1,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
loanDefaultTypesSchema.plugin(autoIncrement.plugin, 'id');
var LoanType = (module.exports = mongoose.model(
  'loan_default_types',
  loanDefaultTypesSchema,
));

module.exports.addNew = (loanTypeData) => {
  return LoanType.create(loanTypeData);
};

module.exports.findAll = () => {
  return LoanType.find({});
};

module.exports.findById = (id) => {
  return LoanType.findOne({
    _id: id,
  });
};

module.exports.findByIds = (ids) => {
  return LoanType.find({
    id: {
      $in: ids,
    },
  });
};

module.exports.getAllActive = () => {
  return LoanType.find({
    status: 1,
  });
};

module.exports.findByName = (name) => {
  return LoanType.findOne({
    name: name,
  });
};

module.exports.findByNameID = (name, id) => {
  //Find record by name, id
  return LoanType.findOne({
    _id: id,
    name: name,
  });
};

module.exports.findAndUpdate = (name, id) => {
  const query = {
    name: name,
  };
  return LoanType.findOneAndUpdate(
    query,
    {
      loan_custom_templates_id: id,
    },
    {},
  );
};

module.exports.listAll = (loanTypes) => {
  return LoanType.find();
};

module.exports.listAll = () => {
  return LoanType.find();
};

module.exports.findIfExists = (partner_name, partnerid) => {
  return LoanType.findOne({
    partner_name: partner_name,
    partnerid: partnerid,
  });
};

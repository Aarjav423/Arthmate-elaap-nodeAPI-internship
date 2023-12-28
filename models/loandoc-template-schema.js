var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const loanDocTemplateSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  template_url: {
    type: String,
    allowNull: true,
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
});

autoIncrement.initialize(mongoose.connection);
loanDocTemplateSchema.plugin(autoIncrement.plugin, 'id');
var loanDocTemplate = (module.exports = mongoose.model(
  'loandoc_template',
  loanDocTemplateSchema,
));

module.exports.addNew = (loandocumentData) => {
  return loanDocTemplate.create(loandocumentData);
};

module.exports.findByCondition = (condition) => {
  return loanDocTemplate.findOne(condition);
};

module.exports.updateLoanTemplate = (data) => {
  let query = {
    company_id: data.company_id,
    product_id: data.product_id,
  };
  return loanDocTemplate.findOneAndUpdate(
    query,
    {
      template_url: data.template_url,
    },
    {
      new: true,
    },
  );
};

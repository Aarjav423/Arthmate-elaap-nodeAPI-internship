var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LoanTemplateNamesSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: String,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
LoanTemplateNamesSchema.plugin(autoIncrement.plugin, 'id');
var LoanTemplateNames = (module.exports = mongoose.model(
  'loan_templates_names',
  LoanTemplateNamesSchema,
));

module.exports.getAll = () => {
  return LoanTemplateNames.find({});
};

module.exports.addNew = (templateName) => {
  return LoanTemplateNames.create(templateName);
};

module.exports.findIfExists = (templateName) => {
  return LoanTemplateNames.findOne({
    name: templateName,
  });
};

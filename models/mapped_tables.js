var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const MappedTablesSchema = mongoose.Schema({
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
MappedTablesSchema.plugin(autoIncrement.plugin, 'id');
var MappedTables = (module.exports = mongoose.model(
  'loan_mapped_table',
  MappedTablesSchema,
));

module.exports.getAll = () => {
  return MappedTables.find({});
};

module.exports.addNew = (data) => {
  return MappedTables.create(data);
};

module.exports.findIfExists = (tableName) => {
  return MappedTables.findOne({
    name: tableName,
  });
};

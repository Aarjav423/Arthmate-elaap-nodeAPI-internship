var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AllModifiedLogsSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  co_lender_id: {
    type: String,
    allowNull: true,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  product_name: {
    type: String,
    allowNull: true,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
  raw_data: {
    type: String,
    allowNull: true,
  },
  type: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: Number,
    allowNull: true,
  },
  api_name: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    defaultValue: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
AllModifiedLogsSchema.plugin(autoIncrement.plugin, 'id');
const AllModifiedLogsSchemaVal = (module.exports = mongoose.model(
  'all_modified_logs',
  AllModifiedLogsSchema,
));

module.exports.addNew = (data) => {
  var AddAllModifiedLogs = new AllModifiedLogsSchemaVal(data);
  return AddAllModifiedLogs.save();
};

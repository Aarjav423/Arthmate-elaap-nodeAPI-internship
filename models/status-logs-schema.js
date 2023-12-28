var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const StatusLogsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  old_status: {
    type: String,
    allowNull: false,
  },
  new_status: {
    type: String,
    allowNull: false,
  },
  user_email: {
    type: String,
    allowNull: true,
  },
  action_date_time: {
    type: Date,
    allowNull: false,
  },
});
autoIncrement.initialize(mongoose.connection);
StatusLogsSchema.plugin(autoIncrement.plugin, 'id');
var StatusLogs = (module.exports = mongoose.model(
  'status_logs',
  StatusLogsSchema,
  'status_logs',
));

module.exports.addNew = (data) => {
  return StatusLogs.create(data);
};

module.exports.findStatusLogsByLID = async (loan_id, page) => {
  const count = await StatusLogs.find({ loan_id }).count();
  const rows = await StatusLogs.find({ loan_id })
    .sort({ action_date_time: -1 })
    .skip(page * 10)
    .limit(10);
  return {
    count,
    rows,
  };
};

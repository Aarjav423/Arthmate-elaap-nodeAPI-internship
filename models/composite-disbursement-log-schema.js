var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const CompositeDisbursementLogSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  transaction_id: {
    type: String,
    allowNull: false,
  },
  request_type: {
    type: String,
    allowNull: true,
  },
  payment_channel: {
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
    defaultValue: 'disbursement',
  },
  timestamp: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
CompositeDisbursementLogSchema.plugin(autoIncrement.plugin, 'id');
var CompositeDisbursementLog = (module.exports = mongoose.model(
  'composite_disbursement_log',
  CompositeDisbursementLogSchema,
));

module.exports.addNew = (templateName) => {
  return CompositeDisbursementLog.create(templateName);
};

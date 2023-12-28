var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var LineUpdateRecordSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    loan_app_id: {
      type: String,
      allowNull: false,
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    borrower_id: {
      type: String,
      allowNull: false,
    },
    partner_loan_app_id: {
      type: String,
      allowNull: true,
    },
    partner_loan_id: {
      type: String,
      allowNull: false,
    },
    partner_borrower_id: {
      type: String,
      allowNull: true,
    },
    sanction_amount: {
      type: Number,
      allowNull: false,
    },
    updated_by: {
      type: String,
      allowNull: true,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
LineUpdateRecordSchema.plugin(autoIncrement.plugin, 'id');
var LineUpdateRecord = (module.exports = mongoose.model(
  'line_update_record',
  LineUpdateRecordSchema,
  'line_update_record',
));

module.exports.addNew = (data) => {
  return LineUpdateRecord.create(data);
};

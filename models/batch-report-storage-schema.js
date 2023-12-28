var mongoose = require('mongoose');
const BatchReportStorageSchema = mongoose.Schema({
  id: {
    type: String,
    primaryKey: true,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  company_code: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: true,
  },
  product_name: {
    type: String,
    allowNull: true,
  },
  from_date: {
    type: String,
    allowNull: true,
  },
  to_date: {
    type: String,
    allowNull: true,
  },
  file_name: {
    type: String,
    allowNull: false,
  },
  requested_by_name: {
    type: String,
    allowNull: false,
  },
  requested_by_id: {
    type: Number,
    allowNull: false,
  },
  s3_url: {
    type: String,
    allowNull: false,
  },
  report_name: {
    type: String,
    allowNull: true,
    enum: ['ckyc_upload_and_update'],
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

var BatchReportStorage = (module.exports = mongoose.model(
  'batch_report_storage',
  BatchReportStorageSchema,
));

module.exports.findIfExistByDate = async (from_date, to_date, report_name) => {
  return BatchReportStorage.find({
    from_date,
    to_date,
    report_name,
  });
};

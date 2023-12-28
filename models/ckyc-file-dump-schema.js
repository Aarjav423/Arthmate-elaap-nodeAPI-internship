var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ckycDumpSchema = mongoose.Schema({
  id: {
    type: Number,
    allowNull: true,
    autoIncrement: true,
    primaryKey: true,
  },
  file_type: {
    type: String,
    allowNull: true,
  },
  file_name: {
    type: String,
    allowNull: true,
  },
  rejection_remarks: {
    type: String,
    allowNull: true,
  },
  s3_url: {
    type: String,
    allowNull: true,
  },
  is_approved: {
    type: Boolean,
    allowNull: true,
    default: true,
  },
  validation_status: {
    type: Number,
    allowNull: true,
  },
  total_records: {
    type: Number,
    allowNull: true,
  },
  total_success_records: {
    type: Number,
    allowNull: true,
  },
  total_failure_records: {
    type: Number,
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
  created_by: {
    type: String,
    allowNull: true,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
});

ckycDumpSchema.plugin(autoIncrement.plugin, 'id');
var CkycDetailsDump = (module.exports = mongoose.model(
  'ckyc_file_dump',
  ckycDumpSchema,
));

module.exports.addNew = (data) => {
  return CkycDetailsDump.create(data);
};

module.exports.getPaginatedData = async (page, limit) => {
  const reports = await CkycDetailsDump.find().sort({
    created_at: -1,
  });
  const count = await CkycDetailsDump.count();
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

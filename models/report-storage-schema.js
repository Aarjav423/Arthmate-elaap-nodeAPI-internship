var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const ReportStorageSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: Number,
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
    enum: [
      'insurance-billing-records',
      'recon-instalment-repayment',
      'dpd',
      'subvention_invoice',
      'repayment_due',
      'repayment',
      'disbursement',
      'refund',
      'kyc_compliance',
      'repayment_schedule',
      'co-lender-pre-disbursement',
      'borrower-pre-disbursement',
      'ckyc_upload_and_update',
      'screen_report',
      'loc_drawdown_report',
      'co-lender-repayment-report',
      'co-lender-disbursement',
      'insurance',
      'Bureau Report',
      'disbursement_inprogress',
    ],
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  co_lender_id: {
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
});

autoIncrement.initialize(mongoose.connection);
ReportStorageSchema.plugin(autoIncrement.plugin, 'id');
var ReportStorage = (module.exports = mongoose.model(
  'report_storage',
  ReportStorageSchema,
));

module.exports.getAll = () => {
  return ReportStorage.find({});
};

module.exports.addNew = (data) => {
  return ReportStorage.create(data);
};

module.exports.findIfExistByFileName = async (file_name) => {
  return ReportStorage.findOne({
    file_name,
  });
};

module.exports.findById = async (_id) => {
  return ReportStorage.findOne({
    _id,
  });
};

module.exports.getCoLenderRepaymentReports = async (query) => {
  return await ReportStorage.find(query).sort({ created_at: -1 });
};

module.exports.getPaginatedData = async (page, limit, type, company_id) => {
  const query = company_id
    ? { $and: [{ company_id, report_name: type }] }
    : { report_name: type };
  const reports = await ReportStorage.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: -1,
    });
  const count = await ReportStorage.count(query);
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

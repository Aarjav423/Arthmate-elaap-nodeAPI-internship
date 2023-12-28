const { ObjectId } = require('mongodb');
var mongoose = require('mongoose');
const NachReportStoragesSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
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
      allowNull: true,
    },
    report_name: {
      type: String,
      allowNull: true,
    },
    requested_by_name: {
      type: String,
      allowNull: true,
    },
    generated_date: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    s3_url: {
      type: String,
      allowNull: true,
    },
    created_by: {
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
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

const NachReportStoragesModel = (module.exports = mongoose.model(
  'nach_report_storages',
  NachReportStoragesSchema,
));

module.exports.save = (data) => {
  return NachReportStoragesModel.create(data);
};

module.exports.findById = async (id) => {
  return NachReportStoragesModel.find({_id: id});
}

module.exports.findByFilter = async (filter) => {
  const { fromDate, toDate, reportType, page, limit } = filter;
  let to_date = new Date(toDate);
  to_date.setHours(23, 59, 59, 999);

  let query = {};
  if (fromDate && toDate) {
   query.created_at = {$gte : fromDate, $lte : to_date}
  }
  if (reportType) {
    query.report_name = {"$in": reportType}
  }

  let count = await NachReportStoragesModel.find(query).count();
  let data = await NachReportStoragesModel.find(query).skip(page * limit).limit(limit).sort({ _id: -1 });

  const result = {
    count: count,
    data: data
  };
  return result;
};
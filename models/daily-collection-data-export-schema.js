var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const DailyCollectionDataExportSchema = mongoose.Schema({
  id: {
    type: String,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: false,
  },
  product_name: {
    type: String,
    allowNull: false,
  },
  month: {
    type: String,
    allowNull: false,
  },
  year: {
    type: Number,
    allowNull: false,
  },
  report_s3_url: {
    type: String,
    allowNull: false,
  },
  day: {
    type: String,
    allowNull: false,
  },
});

var DailyCollectionDataExport = (module.exports = mongoose.model(
  'daily_collection_data_export',
  DailyCollectionDataExportSchema,
  'daily_collection_data_export',
));

module.exports.addNew = async (data) => {
  return DailyCollectionDataExport.create(data);
};

module.exports.getAll = () => {
  return DailyCollectionDataExport.find({});
};

module.exports.findByFilter = async (data) => {
  var query = {};
  const { day, month, year, page, limit } = data;
  if (day !== 'null' && day !== 'undefined' && day !== '') {
    query.day = day;
  }
  if (month) query.month = month;
  if (year) query.year = year;

  const reports = await DailyCollectionDataExport.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: -1,
    });
  const count = await DailyCollectionDataExport.count(query);
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

module.exports.findById = (id) => {
  return DailyCollectionDataExport.findOne({
    _id: id,
  });
};

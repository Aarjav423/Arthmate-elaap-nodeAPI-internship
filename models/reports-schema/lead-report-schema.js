var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const leadSchema = mongoose.Schema({
  id: {
    type: String,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: true,
  },
  product_id: {
    type: Number,
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
  day: {
    type: Number,
    allowNull: true,
  },
  month: {
    type: Number,
    allowNull: true,
  },
  year: {
    type: Number,
    allowNull: true,
  },
  report_s3_url: {
    type: String,
    allowNull: true,
  },
});

var leadData = (module.exports = mongoose.model(
  'lead_report_details',
  leadSchema,
));

module.exports.addNew = async (data) => {
  return leadData.create(data);
};

module.exports.getAll = () => {
  return leadData.find({});
};

module.exports.findByFilter = async (data) => {
  let page = data.page;
  let limit = data.limit;
  let reports = '';
  let count = '';
  reports = await leadData
    .find({
      day: data.day,
      month: data.month,
      year: data.year * 1,
    })
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: -1,
    });
  count = await leadData.count({
    day: data.day,
    month: data.month,
    year: data.year * 1,
  });
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

module.exports.findById = (id) => {
  return leadData.findOne({
    _id: id,
  });
};

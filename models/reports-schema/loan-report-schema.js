var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const loanSchema = mongoose.Schema({
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

var loanData = (module.exports = mongoose.model(
  'loan_report_details',
  loanSchema,
));

module.exports.addNew = async (data) => {
  return loanData.create(data);
};

module.exports.getAll = () => {
  return loanData.find({});
};

module.exports.findByFilter = async (data) => {
  let page = data.page;
  let limit = data.limit;
  let reports = '';
  let count = '';
  reports = await loanData
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
  count = await loanData.count({
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
  return loanData.findOne({
    _id: id,
  });
};

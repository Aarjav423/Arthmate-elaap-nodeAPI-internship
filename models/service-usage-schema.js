var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const ServiceUsageSchema = mongoose.Schema({
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

var ServiceUsageData = (module.exports = mongoose.model(
  'service_usage_details',
  ServiceUsageSchema,
));

module.exports.addNew = async (data) => {
  return ServiceUsageData.create(data);
};

module.exports.getAll = () => {
  return ServiceUsageData.find({});
};

module.exports.findByFilter = async (data) => {
  let page = data.page;
  let limit = data.limit;
  let reports = '';
  let count = '';
  if (data.month && data.month !== 'NaN') {
    reports = await ServiceUsageData.find({
      month: data.month,
      year: data.year * 1,
    })
      .skip(page * limit)
      .limit(limit)
      .sort({
        created_at: -1,
      });
    count = await ServiceUsageData.count({
      month: data.month,
      year: data.year * 1,
    });
  } else {
    reports = await ServiceUsageData.find({
      year: data.year * 1,
    })
      .skip(page * limit)
      .limit(limit)
      .sort({
        created_at: -1,
      });
    count = await ServiceUsageData.count({
      year: data.year * 1,
    });
  }
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

module.exports.findById = (id) => {
  return ServiceUsageData.findOne({
    _id: id,
  });
};

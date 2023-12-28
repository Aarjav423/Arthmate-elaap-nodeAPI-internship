var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const MonthlyCollectionDataExportSchema = mongoose.Schema({
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
  report_type : {
    type: String,
    allowNull:true,
    default:undefined
  }
},{
  timestamps :{
    createdAt : "created_at",
    updatedAt : "updated_at"
  }
});

var MonthlyCollectionDataExport = (module.exports = mongoose.model(
  'monthly_collection_data_export',
  MonthlyCollectionDataExportSchema,
  'monthly_collection_data_export',
));

module.exports.addNew = async (data) => {
  return MonthlyCollectionDataExport.create(data);
};

module.exports.getAll = () => {
  return MonthlyCollectionDataExport.find({});
};

module.exports.findByFilter = async (data) => {
  const page = data.page;
  const limit = data.limit;
  const reports = await MonthlyCollectionDataExport.find({
    month: data.month,
    year: data.year * 1,
  })
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: -1,
    });
  const count = await MonthlyCollectionDataExport.count({
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
  return MonthlyCollectionDataExport.findOne({
    _id: id,
  });
};

module.exports.findByReportType = async (filter,page,limit) => {
  const rows =await MonthlyCollectionDataExport.find(filter)
      .sort({created_at: -1})
      .skip(page * 1 * limit)
      .limit(limit)
  const count =await MonthlyCollectionDataExport.count(filter)
  return {
    rows ,
    count
  }
}


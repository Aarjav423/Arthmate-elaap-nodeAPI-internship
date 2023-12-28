var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const ForeclosureRequestSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
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
  sr_req_id: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  customer_name: {
    type: String,
    allowNull: false,
  },
  request_type: {
    type: String,
    allowNull: false,
  },
  prin_requested: {
    type: Number,
    allowNull: true,
  },
  int_requested: {
    type: Number,
    allowNull: true,
  },
  foreclosure_charge_requested: {
    type: Number,
    allowNull: true,
  },
  gst_foreclosure_charge_requested: {
    type: Number,
    allowNull: true,
  },
  waiver_requested: {
    type: Number,
    allowNull: true,
  },
  total_foreclosure_amt_requested: {
    type: Number,
    allowNull: true,
  },
  total_foreclosure_amt_calculated: {
    type: Number,
    allowNull: true,
  },
  prin_os: {
    type: Number,
    allowNull: true,
  },
  int_calculated: {
    type: Number,
    allowNull: true,
  },
  foreclosure_charges_calculated: {
    type: Number,
    allowNull: true,
  },
  gst_foreclosure_charges_calculated: {
    type: Number,
    allowNull: true,
  },
  is_approved: {
    type: String,
    allowNull: true,
  },
  remarks_by_approver: {
    type: String,
    allowNull: true,
  },
  request_date: {
    type: Date,
    allowNull: true,
  },
  validity_date: {
    type: Date,
    allowNull: true,
  },
  requested_by: {
    type: String,
    allowNull: true,
  },
  borrower_id: {
    type: String,
    allowNull: true,
  },
  sanction_amount: {
    type: String,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
ForeclosureRequestSchema.plugin(autoIncrement.plugin, 'id');
var ForeclosureRequest = (module.exports = mongoose.model(
  'foreclosure_request',
  ForeclosureRequestSchema,
));

module.exports.getAll = () => {
  return ForeclosureRequest.find({});
};

module.exports.addNew = (data) => {
  return ForeclosureRequest.create(data);
};

module.exports.findByCondition = (condition) => {
  return ForeclosureRequest.findOne(condition);
};

module.exports.updateDataById = (query, data) => {
  return ForeclosureRequest.findOneAndUpdate(query, data, {});
};

module.exports.findDataByIdAndReqId = (id, sr_req_id) => {
  return ForeclosureRequest.findOne({ _id: id, sr_req_id });
};

module.exports.getCount = () => {
  return ForeclosureRequest.find({}).count();
};

module.exports.getFilteredForeclosureRequest = async (filter) => {
  var query = {
    type:null
  };
  query['$and'] = [];
  query['$or'] = [];
  const { company_id, product_id, is_approved, page, limit } = filter;
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id) {
    query['$and'].push({
      product_id,
    });
  }
  if (is_approved) {
    if (is_approved === 'pending') {
      query['$or'].push(
        {
          is_approved: '',
        },
        {
          is_approved: null,
        },
        {
          is_approved: 'P',
        },
      );
    }
    if (is_approved === 'completed') {
      query['$or'].push(
        {
          is_approved: 'Y',
        },
        {
          is_approved: 'N',
        },
      );
    }
  }

  const count = await ForeclosureRequest.find(query).count();
  const rows = await ForeclosureRequest.find(query)
    .sort({ request_date: -1 })
    .skip(page * limit)
    .limit(limit);
  return {
    rows: rows,
    count: count,
  };
};

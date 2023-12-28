var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');

const WaiverRequestSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  sr_req_id: {
    type: String,
    allowNull: true,
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
  loan_id: {
    type: String,
    allowNull: true,
  },
  interest_at_approval: {
    type: Number,
    allowNull: true,
  },
  interest_waiver: {
    type: Number,
    allowNull: true,
  },
  bc_at_approval: {
    type: Number,
    allowNull: true,
  },
  gst_on_bc_at_waiver: {
    type: Number,
    allowNull: true,
  },
  bc_waiver: {
    type: Number,
    allowNull: true,
  },
  gst_reversal_bc: {
    type: Number,
    allowNull: true,
  },
  lpi_at_approval: {
    type: Number,
    allowNull: true,
  },
  lpi_waiver: {
    type: Number,
    allowNull: true,
  },
  request_remark: {
    type: String,
    allowNull: true,
  },
  waiver_req_date: {
    type: Date,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected'],
  },
  approver_id: {
    type: String,
    allowNull: true,
  },
  approver_remarks: {
    type: String,
    allowNull: true,
  },
  action_date: {
    type: Date,
    allowNull: true,
  },
  request_type: {
    type: String,
    allowNull: true,
  },
  requested_by: {
    type: String,
    allowNull: true,
  },
  customer_name: {
    type: String,
    allowNull: true,
  },
  valid_till: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
WaiverRequestSchema.plugin(autoIncrement.plugin, 'id');
var WaiverRequest = (module.exports = mongoose.model(
  'waiver_requests',
  WaiverRequestSchema,
  'waiver_requests',
));

module.exports.addNew = (data) => {
  return WaiverRequest.create(data);
};

module.exports.getAll = () => {
  return WaiverRequest.find({});
};

module.exports.findByCondition = (condition) => {
  return WaiverRequest.findOne(condition);
};

module.exports.getByLoanIds = (loanIds) => {
  return WaiverRequest.find({ loan_id: { $in: loanIds } });
};

module.exports.getOpenWaiverRequest = (loan_id) => {
  return WaiverRequest.find({
    loan_id,
    status: 'pending',
  });
};

module.exports.getCount = () => {
  return WaiverRequest.find({}).count();
};

module.exports.getFilteredWaiverRequest = async (filter) => {
  var query = {};
  query['$and'] = [];

  const { company_id, product_id, status, page, limit } = filter;
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
  if (status !== '' && status !== 'undefined' && status !== undefined) {
    query['$and'].push({
      status,
    });
  }

  const count = await WaiverRequest.find(query).count();
  const rows = await WaiverRequest.find(query)
    .sort({ created_at: -1 })
    .skip(page * limit)
    .limit(limit);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.getFilteredWaiverRequestByLoanId = async (filter) => {
  var query = {};
  query['$and'] = [];

  const { company_id, product_id, status, page, limit, loan_id } = filter;
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
  if (status !== '' && status !== 'undefined' && status !== undefined) {
    query['$and'].push({
      status,
    });
  }

  if (loan_id !== '' && loan_id !== 'undefined' && loan_id !== undefined) {
    query['$and'].push({
      loan_id,
    });
  }

  const count = await WaiverRequest.find(query).count();
  const rows = await WaiverRequest.find(query)
    .sort({ created_at: -1 })
    .skip(page * limit)
    .limit(limit);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.findByIdAndReqId = (_id, sr_req_id) => {
  return WaiverRequest.findOne({ _id, sr_req_id });
};

module.exports.updateDataById = (query, data) => {
  return WaiverRequest.findOneAndUpdate(query, data, { new: true });
};

module.exports.findByReqId = (sr_req_id) => {
  return WaiverRequest.findOne({ sr_req_id });
};

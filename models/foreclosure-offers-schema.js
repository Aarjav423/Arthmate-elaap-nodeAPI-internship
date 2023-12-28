var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
mongoose.Promise = global.Promise;

var ForeclosureOfferObjectSchema = mongoose.Schema({
  seq_id: {
    type: Number,
    allowNull: true,
    required: true,
  },
  int_due: {
    type: Number,
    allowNull: true,
  },
  interest_waiver: {
    type: Number,
    allowNull: true,
  },
  lpi_due: {
    type: Number,
    allowNull: true,
  },
  lpi_waiver: {
    type: Number,
    allowNull: true,
  },
  bounce_charges: {
    type: Number,
    allowNull: true,
  },
  bounce_charges_waiver: {
    type: Number,
    allowNull: true,
  },
  gst_on_bc: {
    type: Number,
    allowNull: true,
  },
  gst_reversal_bc: {
    type: Number,
    allowNull: true,
  },
  foreclosure_charges: {
    type: Number,
    allowNull: true,
  },
  fc_waiver: {
    type: Number,
    allowNull: true,
  },
  gst_on_fc: {
    type: Number,
    allowNull: true,
  },
  gst_reversal_fc: {
    type: Number,
    allowNull: true,
  },
  total_foreclosure_amt: {
    type: Number,
    allowNull: true,
  },
  int_on_termination: {
    type: Number,
    allowNull: true,
  },
  total_foreclosure_amt_requested: {
    type: Number,
    allowNull: true,
  },
  foreclosure_date: {
    type: Date,
    allowNull: true,
  },
  status: {
    type: String,
    enum: [
      'offered',
      'pending',
      'invalid',
      'approved',
      'rejected',
      'completed',
    ],
  },
});

var ForeclosureOfferSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: false,
      required: true,
    },
    product_id: {
      type: Number,
      allowNull: false,
      required: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    prin_os: {
      type: Number,
      allowNull: true,
    },
    prin_os_waiver: {
      type: Number,
      allowNull: true,
    },
    undue_prin_os: {
      type: Number,
      allowNull: true,
    },
    interest_waiver_perc: {
      type: Number,
      enum: [0, 25, 50, 75, 100],
      default: 0,
    },
    lpi_waiver_perc: {
      type: Number,
      enum: [0, 25, 50, 75, 100],
      default: 0,
    },
    bounce_charge_waiver_perc: {
      type: Number,
      enum: [0, 25, 50, 75, 100],
      default: 0,
    },
    fc_waiver_perc: {
      type: Number,
      enum: [0, 25, 50, 75, 100],
      default: 0,
    },
    offers: [ForeclosureOfferObjectSchema],
    request_date: {
      type: String,
      allowNull: true,
    },
    requestor_id: {
      type: String,
      allowNull: true,
    },
    request_id: {
      type: String,
      allowNull: true,
    },
    requestor_comment: {
      type: String,
      allowNull: true,
    },
    approver_id: {
      type: String,
      allowNull: true,
    },
    approver_comment: {
      type: String,
      allowNull: true,
    },
    action_date: {
      type: String,
      allowNull: true,
    },
    excess_received: {
      type: Number,
      allowNull: true,
    },
    type: {
      type: String,
      allowNull: true,
      default:null
    },
    status: {
      type: String,
      enum: [
        'offered',
        'pending',
        'invalid',
        'approved',
        'rejected',
        'completed',
      ],
      allowNull: true,
    },
    action_date: {
      type: Date,
      allowNull: true,
    },
    created_at: {
      type: Date,
      defaultValue: Date.now,
    },
    updated_at: {
      type: Date,
      defaultValue: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);
autoIncrement.initialize(mongoose.connection);
ForeclosureOfferObjectSchema.plugin(autoIncrement.plugin, 'id');
ForeclosureOfferSchema.plugin(autoIncrement.plugin, 'id');
var ForeclosureSchema = (module.exports = mongoose.model(
  'foreclosure_offers',
  ForeclosureOfferSchema,
));

//insert new foreclosure schema
module.exports.addNew = async (data) => {
  return ForeclosureSchema.create(data);
};

//find foreclosure object using id and loan id
module.exports.findByIdAndLoanId = async (id, loanId) => {
  return ForeclosureSchema.findOne({ _id: id, loan_id: loanId });
};

//find foreclosure object using loan id
module.exports.findByLoanId = async (loanId) => {
  return ForeclosureSchema.findOne({ loan_id: loanId }).sort({
    _id: -1,
  });
};

module.exports.findByCondition = async (condition, requestIdFlag) => {
  if (requestIdFlag) {
    return ForeclosureSchema.findOne(condition);
  }
  return ForeclosureSchema.find(condition);
};

module.exports.findByConditionWithLimit = async (
  condition,
  requestIdFlag,
  page,
  limit,
) => {
  if (requestIdFlag) {
    const row = await ForeclosureSchema.findOne(condition)
      .skip(page * limit)
      .limit(limit)
      .sort({
        _id: -1,
      });
    const count = await ForeclosureSchema.findOne(condition).count();
    return {
      rows: row,
      count: count,
    };
  }
  const row = await ForeclosureSchema.find(condition)
    .skip(page * limit)
    .limit(limit)
    .sort({
      _id: -1,
    });
  const count = await ForeclosureSchema.find(condition).count();
  return {
    rows: row,
    count: count,
  };
};

module.exports.getForeClosureRequest = async (filter) => {
  var query = {};
  query['$and'] = [];
  query['$or'] = [];
  const { company_id, product_id } = filter;
  let createfilter = {};
  if (company_id) {
    createfilter['company_id'] = parseInt(company_id);
  }
  if (product_id) {
    createfilter['product_id'] = parseInt(product_id);
  }

  const rows = await ForeclosureSchema.aggregate([
    {
      $match: { ...createfilter },
    },
    {
      $lookup: {
        from: 'product',
        localField: 'product_id',
        foreignField: '_id',
        as: 'product_details',
      },
    },
  ]);
};

//update foreclosure offer array
module.exports.updateOffers = async (id, data) => {
  return ForeclosureSchema.updateOne(
    { _id: id, 'offers.seq_id': data.seq_id },
    {
      $set: {
        'offers.$.interest_waiver': data.interest_waiver,
        'offers.$.lpi_waiver': data.lpi_waiver,
        'offers.$.bounce_charges_waiver': data.bounce_charges_waiver,
        'offers.$.fc_waiver': data.fc_waiver,
        'offers.$.gst_on_bc': data.gst_on_bc,
        'offers.$.gst_on_fc': data.gst_on_fc,
        'offers.$.total_foreclosure_amt_requested':
          data.total_foreclosure_amt_requested,
        'offers.$.status': data.status,
      },
    },
  );
};

module.exports.updateOffersStatus = async (id, seq_id, status) => {
  return ForeclosureSchema.updateOne(
    { _id: id, 'offers.seq_id': seq_id },
    {
      $set: {
        'offers.$.status': status,
      },
    },
  );
};

//update foreclosure schema by id
module.exports.updateForeclosureSchemaById = async (id, data) => {
  return ForeclosureSchema.findByIdAndUpdate(
    { _id: id },
    {
      requestor_comment: data.requestor_comment,
      status: data.status,
    },
    { safe: true, upsert: true },
  );
};
//update foreclosure schema by id
module.exports.updateForeclosureAporoveById = async (id, data) => {
  return ForeclosureSchema.findByIdAndUpdate(
    { _id: id },
    {
      approver_comment: data.approver_comment,
      approver_id: data.approver_id,
      status: data.status,
    },
    { safe: true, upsert: true },
  );
};

//insert singleaadhaar_verified
module.exports.foreclosure = async (data) => {
  return ForeclosureSchema.create(data);
};

//fetch foreclosure by loan id
module.exports.findByLoanAppId = async (loan_id) => {
  let query = {
    loan_id: loan_id,
  };
  return ForeclosureSchema.findOne(query).sort({
    _id: -1,
  });
};

//fetch pending foreclosure by loan id
module.exports.findByLoanAppIdAndStatus = async (loan_id, status) => {
  let query = {
    loan_id: loan_id,
    status: status,
  };
  return ForeclosureSchema.findOne(query).sort({
    _id: -1,
  });
};

module.exports.findOneAndUpdateStatus = async (query) => {
  query['$or'] = [
    { status: 'pending' },
    { status: 'invalid' },
    { status: 'rejected' },
    { status: 'offered' },
  ];
  const foreClosure = await ForeclosureSchema.find(query).updateMany(
    {
      query,
    },
    { $set: { status: 'invalid', 'offers.$[].status': 'invalid' } },
    { multi: true },
  );

  return foreClosure;
};

module.exports.getFilteredForeclosureRequest = async (filter) => {
  var query = {};
  const { company_id, product_id, status, page, limit } = filter;
  let createfilter = {};
  if (company_id) {
    createfilter['company_id'] = parseInt(company_id);
  }
  if (product_id) {
    createfilter['product_id'] = parseInt(product_id);
  }
  if (status !== 'all') {
    query['$and'] = [];
    query['$and'].push({
      status,
    });
    createfilter['status'] = status;
  }

  const count = await ForeclosureSchema.find(query).count();
  const rows = await ForeclosureSchema.aggregate([
    {
      $match: { ...createfilter },
    },
    { $sort: { request_date: -1, _id: -1 } },
    { $skip: page * limit },
    {
      $limit: parseInt(limit),
    },
    {
      $lookup: {
        from: 'borrowerinfo_commons',
        localField: 'loan_id',
        foreignField: 'loan_id',
        as: 'borrower_details',
        pipeline: [
          {
            $addFields: {
              customer_name: { $concat: ['$first_name', ' ', '$last_name'] },
            },
          },
        ],
      },
    },
    {
      $project: {
        company_id: 1,
        product_id: 1,
        offers: 1,
        loan_id: 1,
        status: 1,
        request_date: 1,
        requestor_id: 1,
        borrower_details: {
          $first: '$borrower_details',
        },
      },
    },
  ]);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.findByIdAndUpdateActionDate = (id, date) => {
  return ForeclosureSchema.findOneAndUpdate(
    {
      _id: id,
    },
    {
      $set: {
        action_date: date,
      },
    },
  );
};
module.exports.findByLoanIdAndType = async (loan_id, type) => {
  let query = {
    loan_id: loan_id,
    type: type,
  };
  return ForeclosureSchema.findOne(query).sort({
    _id: -1,
  });
};


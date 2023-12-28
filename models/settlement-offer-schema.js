var autoIncrement = require('mongoose-auto-increment');
const moment = require('moment');
var mongoose = require('mongoose');
const TranchesObjectSchema = mongoose.Schema({
  settlement_amount: {
    type: Number,
    required: true,
  },
  settlement_date: {
    type: Date,
    allowNull: true,
  },
});
const SettlementOfferSchema = mongoose.Schema(
  {
    request_id: {
      type: Number,
      autoIncrement: true,
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
    prin_os: {
      type: Number,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    file_url: {
      type: String,
      allowNull: false,
    },
    requestor_id: {
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
    first_settlement_date: {
      type: Date,
      allowNull: true,
    },
    last_settlement_date: {
      type: Date,
      allowNull: true,
    },
    tranches: [TranchesObjectSchema],
    status: {
      type: String,
      allowNull: true,
      enum: ['Pending', 'Rejected', 'Approved', 'Settled', 'Invalid'],
      default: 'Pending',
    },
    requested_date: {
      type: Date,
      default: Date.now,
      allowNull: true,
    },
    action_date: {
      type: Date,
      default: Date.now,
      allowNull: true,
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
TranchesObjectSchema.plugin(autoIncrement.plugin, 'tranches_id');
SettlementOfferSchema.plugin(autoIncrement.plugin, 'request_id');
let RequestSettlementOffer = (module.exports = mongoose.model(
  'settlement_offer',
  SettlementOfferSchema,
));

module.exports.addNew = async (data) => {
  let checkSettlementAlreadyExist = await RequestSettlementOffer.findOne({
    loan_id: data.loan_id,
    status: { $in: ['Pending', 'Approved', 'Settled'] },
  });
  if (checkSettlementAlreadyExist) {
    const currentDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
    if (
      checkSettlementAlreadyExist.status == 'Pending' &&
      moment(checkSettlementAlreadyExist.first_settlement_date).format(
        'YYYY-MM-DD',
      ) < currentDate
    ) {
      await RequestSettlementOffer.updatedStatus(
        { _id: checkSettlementAlreadyExist._id },
        { status: 'Invalid' },
      );
    } else {
      return { status: false, settlementOffer: checkSettlementAlreadyExist };
    }
  }
  return {
    status: true,
    settlementOffer: await RequestSettlementOffer.create(data),
  };
};

module.exports.findIfExistByLoanIdAndDate = async (loan_id, date) => {
  return RequestSettlementOffer.findOne({
    loan_id: loan_id,
    requested_date: date,
  });
};

module.exports.findById = async (_id) => {
  return RequestSettlementOffer.findOne({
    _id,
  });
};

module.exports.findByLId = async (loan_id) => {
  return RequestSettlementOffer.find({
    loan_id: loan_id,
  });
};

module.exports.findIfExistByLoanId = async (loan_id, status) => {
  return RequestSettlementOffer.findOne({
    loan_id: loan_id,
    status: status,
  }).sort({ requested_date: -1 });
};

module.exports.findByLoanIdAndRequestId = async (loan_id, _id, status) => {
  return await RequestSettlementOffer.findOne({ loan_id, _id, status });
};

module.exports.updatedStatus = async (query, update) => {
  return await RequestSettlementOffer.findOneAndUpdate(
    { ...query },
    { ...update },
    { returnOriginal: false },
  );
};

module.exports.findByConditionWithLimit = async (
  condition,
  requestIdFlag,
  page,
  limit,
) => {
  if (requestIdFlag) {
    const row = await RequestSettlementOffer.find(condition)
      .skip(page * limit)
      .limit(limit)
      .sort({
        _id: -1,
      });
    const count = await RequestSettlementOffer.find(condition).count();
    return {
      rows: row,
      count: count,
    };
  }
  const row = await RequestSettlementOffer.find(condition)
    .skip(page * limit)
    .limit(limit)
    .sort({
      _id: -1,
    });
  const count = await RequestSettlementOffer.find(condition).count();
  return {
    rows: row,
    count: count,
  };
};

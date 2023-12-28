var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');

mongoose.Promise = global.Promise;
const ColendLoanTransactionSummarySchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    summary_id: {
      type: Number,
      allowNull: false,
    },
    txn_id: {
      type: Number,
      allowNull: false,
    },
    co_lender_id: {
      type: Number,
      allowNull: false,
    },
    co_lender_name: {
      type: String,
      allowNull: false,
    },
    to_date: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    txn_amount: {
      type: Decimal128,
      allowNull: true,
    },
    consolidated_prin: {
      type: Decimal128,
      allowNull: true,
    },
    consolidated_int: {
      type: Decimal128,
      allowNull: true,
    },
    status: {
      type: String,
      allowNull: false,
      enum: ['open', 'requested', 'in_progress', 'paid'],
    },
    stage: {
      type: Number,
      allowNull: false,
    },
    utr_number: {
      type: String,
      allowNull: false,
    },
    txn_date: {
      type: String,
      allowNull: false,
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
ColendLoanTransactionSummarySchema.plugin(autoIncrement.plugin, 'id');
var ColendLoanTransactionSummary = (module.exports = mongoose.model(
  'co_lend_transaction_summary',
  ColendLoanTransactionSummarySchema,
));

module.exports.getPaginatedData = async (query, page, limit) => {
  const reports = await ColendLoanTransactionSummary.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: -1,
    });
  const count = await ColendLoanTransactionSummary.count(query);
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

module.exports.updateBySummaryId = async (data) => {
  const query = {
    summary_id: {
      $in: data.summary_ids,
    },
  };
  const update = {
    $set: {
      stage: data.stage,
      status: data.status,
      utr_number: data.utr_number,
      txn_date: data.txn_date,
    },
  };
  var bulk = ColendLoanTransactionSummary.collection.initializeOrderedBulkOp();

  return bulk.find(query).update(update).execute();
};

module.exports.updateStageBySummaryIds = (data) => {
  const query = {
    summary_id: {
      $in: data.summary_ids,
    },
  };
  const update = {
    $set: {
      stage: data.stage,
      status: data.status,
    },
  };
  var bulk = ColendLoanTransactionSummary.collection.initializeOrderedBulkOp();

  return bulk.find(query).update(update).execute();
};

module.exports.findAllCoLenderTransactionSummary = (query) => {
  return ColendLoanTransactionSummary.aggregate([
    {
      $match: query,
    },
    {
      $lookup: {
        from: 'repayment_channel_configs',
        localField: 'co_lender_id',
        foreignField: 'co_lender_id',
        as: 'repayment_channel_configs',
      },
    },
    {
      $unwind: {
        path: '$repayment_channel_configs',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        summary_id: 1,
        co_lender_id: 1,
        txn_amount: 1,
        consolidated_prin: 1,
        consolidated_int: 1,
        status: 1,
        txn_id: 1,
        stage: 1,
        co_lender_name: 1,
        txn_date: 1,
        utr_number: 1,
        created_at: 1,
        channel: '$repayment_channel_configs.disburse_channel',
      },
    },
  ]);
};

const moment = require('moment');
var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const LocBatchDrawdownDataSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
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
    loan_app_id: {
      type: String,
      allowNull: false,
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    borrower_id: {
      type: String,
      allowNull: true,
    },
    partner_loan_app_id: {
      type: String,
      allowNull: false,
    },
    partner_loan_id: {
      type: String,
      allowNull: false,
    },
    partner_borrower_id: {
      type: String,
      allowNull: false,
    },
    first_name: {
      type: String,
      allowNull: false,
    },
    last_name: {
      type: String,
      allowNull: false,
    },
    borrower_mobile: {
      type: String,
      allowNull: false,
    },
    usage_id: {
      type: Number,
      allowNull: false,
    },
    no_of_emi: {
      type: Number,
      allowNull: false,
    },
    status: {
      type: Number,
      allowNull: false,
    },
    drawadown_request_date: {
      type: Date,
      allowNull: false,
    },
    drawdown_amount: {
      type: Number,
      allowNull: false,
    },
    net_drawdown_amount: {
      type: Number,
      allowNull: false,
    },
    usage_fees_including_gst: {
      type: Number,
      allowNull: false,
    },
    processing_fees_including_gst: {
      type: Number,
      allowNull: false,
    },
    usage_fees: {
      type: Number,
      allowNull: false,
    },
    gst_usage_fees: {
      type: Number,
      allowNull: false,
    },
    cgst_usage_fees: {
      type: Number,
      allowNull: false,
    },
    sgst_usage_fees: {
      type: Number,
      allowNull: false,
    },
    igst_usage_fees: {
      type: Number,
      allowNull: false,
    },
    upfront_int: {
      type: Number,
      allowNull: false,
    },
    remarks: {
      type: String,
      allowNull: false,
    },
    disbursement_date_time: {
      type: String,
      allowNull: false,
    },
    disbursement_status_code: {
      type: Number,
      allowNull: false,
    },
    utrn_number: {
      type: String,
      allowNull: false,
    },
    txn_id: {
      type: String,
      allowNull: false,
    },
    repayment_days: {
      type: Number,
      allowNull: true,
    },
    drawdown_request_creation_date: {
      type: Date,
      allowNull: false,
      default: Date.now,
    },
    beneficiary_bank_details_id: {
      type: Number,
      allowNull: true,
    },
    invoice_number: {
      type: String,
      allowNull: true,
    },
    product_scheme_id: {
      type: Number,
      allowNull: true,
    },
    anchor_name: {
      type: String,
      allowNull: true,
    },
    withheld_percentage:{
      type:Number,
      allowNull:true,
    },
    withheld_amount:{
     type:Number,
     allowNull:true,
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
LocBatchDrawdownDataSchema.plugin(autoIncrement.plugin, 'id');
var LocBatchDrawdownData = (module.exports = mongoose.model(
  ' loc_batch_drawdown',
  LocBatchDrawdownDataSchema,
  'loc_batch_drawdown',
));
module.exports.findAllRecordsByLIDHavingPF = (loanIds) => {
  return LocBatchDrawdownData.find({
    $and: [
      {
        loan_id: {
          $in: loanIds,
        },
      },
      { charge_type: 'Processing Fees' },
    ],
  });
};
module.exports.addNew = async (data) => {
  const insertdata = new LocBatchDrawdownData(data);
  return insertdata.save();
};

module.exports.findByLoanId = (loan_id) => {
  return LocBatchDrawdownData.findOne({ loan_id });
};

module.exports.findByLoanIdAndRequestId = (loan_id,request_id) => {
  return LocBatchDrawdownData.findOne({ loan_id,_id:request_id });
};

module.exports.findByLoanIdWithPF = (loan_id) => {
  const query = {
    $and: [
      {
        loan_id,
      },
      {
        processing_fees_including_gst: { $gte: 1 },
      },
    ],
  };
  return LocBatchDrawdownData.findOne(query);
};

module.exports.getFilteredNonProcessedRecords = async (filter) => {
  let query = {};
  const { company_id, product_id, page, limit, status } = filter;

  const count = await LocBatchDrawdownData.find({
    company_id,
    product_id,
    status,
  }).count();
  const rows = await LocBatchDrawdownData.find({
    company_id,
    product_id,
    status,
  })
    .sort({ _id: -1 })
    .skip(page * limit)
    .limit(limit);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.updateByLid = async (filter, data) => {
  return LocBatchDrawdownData.findOneAndUpdate(filter, data);
};

module.exports.getAllByLoanId = async(loan_id, page = 0, limit=10) => {
  let count = await LocBatchDrawdownData.aggregate([
    {
      $match: { loan_id: loan_id },
    },
    {
      $lookup: {
        from: 'loan_transaction_ledgers',
        localField: '_id',
        foreignField: 'request_id',
        as: 'loan_transaction_ledger',
      },
    },
  ])
  let rows = await LocBatchDrawdownData.aggregate([
    {
      $match: { loan_id: loan_id },
    },
    {
      $lookup: {
        from: 'loan_transaction_ledgers',
        localField: '_id',
        foreignField: 'request_id',
        as: 'loan_transaction_ledger',
      },
    },
    {
       $lookup: {
        from: 'line_state_audit',
        let: { ledgerId: { $toString: { $arrayElemAt: ['$loan_transaction_ledger._id', 0] } } },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [ '$usage_id' , '$$ledgerId'],
              },
            },
          },
          {
            $project: {
              usage_id: 1, 
              status: 1,   
              _id: 0, 
            },
          },
        ],
        as: 'line_state_audit',
      },
    },
  ])
  .skip(page * Number.parseInt(limit))
  .limit(Number.parseInt(limit))
  .sort({
    _id: -1,
  });
  return {
    rows,
    count:count.length
  }
};

module.exports.checkDrawdownMatchedToWhichScheme = async (drawdown_id) => {
  let productSchemeMapping =
    (await LocBatchDrawdownData.aggregate([
      {
        $match: {
          _id: parseInt(drawdown_id),
        },
      },
      {
        $lookup: {
          from: 'product_scheme_mappings',
          localField: 'product_scheme_id',
          foreignField: '_id',
          as: 'productscheme',
        },
      },
      {
        $lookup: {
          from: 'schemes',
          localField: 'productscheme.scheme_id',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      {
        $unwind: {
          path: '$productscheme',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$scheme',
          preserveNullAndEmptyArrays: true,
        },
      },
    ])) || [];

  return productSchemeMapping.length > 0 ? productSchemeMapping[0] : null;
};
module.exports.fetchBankDetailsAgainstDrawdownId = async (drawdown_id) => {
  let fetchBankDetails =
    (await LocBatchDrawdownData.aggregate([
      {
        $match: {
          _id: parseInt(drawdown_id),
        },
      },
      {
        $lookup: {
          from: 'master_bank_details',
          localField: 'beneficiary_bank_details_id',
          foreignField: '_id',
          as: 'bankDetails',
        },
      },
      {
        $unwind: {
          path: '$bankDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    ])) || [];

  return fetchBankDetails.length > 0 ? fetchBankDetails[0] : null;
};
module.exports.getAllByLoanIdAndRequestId = (loan_id, id) => {
  return LocBatchDrawdownData.aggregate([
    {
      $match: { loan_id: loan_id, _id: id },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product_id',
        foreignField: '_id',
        as: 'productSchemeMapping',
      },
    },
    {
      $unwind: {
        path: '$productSchemeMapping',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'loan_transaction_ledgers',
        localField: '_id',
        foreignField: 'request_id',
        as: 'loan_transaction_ledger',
      },
    },
    {
      $unwind: {
        path: '$loan_transaction_ledger',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'borrowerinfo_commons',
        localField: 'loan_app_id',
        foreignField: 'loan_app_id',
        as: 'borrower_info_common_data',
      },
    },
    {
      $addFields: {
        borrower_info_common_data: {
          $slice: ['$borrower_info_common_data', 1],
        },
      },
    },
    {
      $unwind: {
        path: '$borrower_info_common_data',
        preserveNullAndEmptyArrays: false,
      },
    },
  ]);
};

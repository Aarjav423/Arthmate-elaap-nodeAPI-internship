var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');
const { ObjectId } = require('mongodb');

var ColenderCommonDetailsSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      allowNull: true,
      autoIncrement: true,
      primaryKey: true,
    },
    co_lender_utr_number: {
      type: String,
      allowNull: true,
    },
    loan_id: {
      type: String,
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

var ColenderCommonDetails = (module.exports = mongoose.model(
  'co_lending_common_details',
  ColenderCommonDetailsSchema,
));

module.exports.findByLoanID = (loan_id) => {
  return ColenderCommonDetails.findOne({ loan_id: loan_id });
};

module.exports.p2pReport = (fDate, tDate, shortCode) => {
  const fromDate = new Date(fDate);
  fromDate.setMinutes(fromDate.getMinutes() - fromDate.getTimezoneOffset());

  const toDate = new Date(tDate);
  toDate.setMinutes(toDate.getMinutes() - toDate.getTimezoneOffset() + 1439);
  return ColenderCommonDetails.aggregate([
    {
      $match: {
        co_lender_shortcode: shortCode,
        created_at: {
          $gte: fromDate,
          $lte: toDate,
        },
      },
    },
    {
      $lookup: {
        from: 'borrowerinfo_commons',
        localField: 'loan_id',
        foreignField: 'loan_id',
        as: 'result',
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'result.company_id',
        foreignField: '_id',
        as: 'company_result',
      },
    },
    {
      $lookup: {
        from: 'loan_transaction_ledgers',
        localField: 'loan_id',
        foreignField: 'loan_id',
        as: 'ledger_loans',
      },
    },
    {
      $project: {
        'Loan ID': '$loan_id',
        'Sanction amount': '$sanction_amount',
        'Company code': {
          $first: '$company_result.short_code',
        },
        'Company name': {
          $first: '$company_result.billing_name',
        },
        'Co-lender status': '$outcome',
        'Creation date': {
          $dateToString: {
            date: '$created_at',
            format: '%Y-%m-%d %H:%M:%S',
          },
        },
        'Loan stage': {
          $first: '$result.stage',
        },
        'Co-lender UTR No': '$co_lender_utr_no',
        'Disbursal date': {
          $first: '$ledger_loans.disbursement_date_time',
        },
        'Net disbursal amount': {
          $first: '$result.net_disbur_amt',
        },
        PF: {
          $first: '$result.processing_fees_amt',
        },
        'GST on PF': {
          $first: '$result.gst_on_pf_amt',
        },
        'Conv Fees': {
          $first: '$result.conv_fees_excluding_gst',
        },
        'GST on cnv fees ': {
          $first: '$result.gst_on_conv_fees',
        },
        Inusrance: {
          $first: '$result.insurance_amount',
        },
        'Broken period': {
          $first: '$result.broken_period_int_amt',
        },
        _id: 0,
      },
    },
  ]);
};

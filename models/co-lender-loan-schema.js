var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');

var ColenderLoanSchema = mongoose.Schema(
  {
    co_lend_loan_id: {
      type: String,
      allowNull: true,
    },
    co_lender_id: {
      type: Number,
      allowNull: true,
    },
    co_lender_shortcode: {
      type: String,
      allowNull: true,
    },
    co_lender_account_no: {
      type: String,
      allowNull: true,
    },
    product_id: {
      type: Number,
      allowNull: true,
    },
    company_id: {
      type: Number,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    co_lend_loan_amount: {
      type: Number,
      allowNull: true,
    },
    net_disbursement_amount: {
      type: Decimal128,
      allowNull: true,
    },
    interest_rate: {
      type: Number,
      allowNull: true,
    },
    co_lending_share: {
      type: Number,
      allowNull: true,
    },
    emi_count: {
      type: Number,
      allowNull: true,
    },
    status: {
      type: String,
      enum: ['open', 'active'],
      allowNull: true,
    },
    stage: {
      type: Number,
      allowNull: true,
    },
    product_type: {
      type: String,
      allowNull: true,
    },
    repayment_type: {
      type: String,
      allowNull: true,
    },
    approval_date: {
      type: Date,
      allowNull: true,
    },
    disbursement_date: {
      type: Date,
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

var ColenderLoan = (module.exports = mongoose.model(
  'co_lender_loans',
  ColenderLoanSchema,
));

module.exports.findByColenderData = (data) => {
  return ColenderLoan.find(data);
};

module.exports.insertDisbursementDate = (colendId, disbDate) => {
  return ColenderLoan.findOneAndUpdate(
    { co_lend_loan_id: colendId },
    {
      disbursement_date: disbDate,
      stage: 1,
      status: 'active',
    },
  );
};

module.exports.findByLoanID = (loan_id) => {
  return ColenderLoan.find({ loan_id: loan_id });
};

module.exports.findByLoanIDAndCoLenderId = (loan_id, co_lender_id) => {
  return ColenderLoan.find({ loan_id: loan_id, co_lender_id: co_lender_id });
};

module.exports.findByProductID = (product_id) => {
  return ColenderLoan.find({ product_id: product_id });
};

module.exports.findAll = (data) => {
  return ColenderLoan.find(data).sort({ created_at: -1 });
};

module.exports.addOne = async (colenderLoan) => {
  var newColenderLoan = new ColenderLoan(colenderLoan);
  try {
    return newColenderLoan.save();
  } catch (error) {
    return error;
  }
};

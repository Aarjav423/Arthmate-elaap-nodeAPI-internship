var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');
var autoIncrement = require('mongoose-auto-increment');
const sharedStatusFields = mongoose.Schema(
  {
    status: {
      type: String,
      allowNull: false,
      enum: ['Approved', 'Rejected', 'Hold', 'Request_Sent'],
    },
    comment: {
      type: String,
      allowNull: false,
    },
    updated_by: {
      type: String,
      allowNull: false,
    },
    updated_at: {
      type: Date,
      allowNull: false,
      default: Date.now,
    },
  },
  { _id: false },
);

var CbiLoanSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    co_lender_id: {
      type: Number,
      allowNull: true,
    },
    co_lender_shortcode: {
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
    status: {
      type: String,
      allowNull: true,
    },
    remarks: {
      type: String,
      allowNull: true,
    },
    status_earlier: {
      type: String,
      allowNull: true,
    },
    remarks_earlier: {
      type: String,
      allowNull: true,
    },
    updated_by_username: {
      type: String,
      allowNull: true,
    },
    username: {
      type: String,
      allowNull: true,
    },
    co_lend_loan_amount: {
      type: Number,
      allowNull: true,
    },
    bre_result_url: {
      type: String,
      allowNull: true,
    },
    bre_status: {
      type: String,
      allowNull: true,
    },
    bre_exe_date: {
      type: Date,
      allowNull: true,
    },
    bre_generated_by: {
      type: String,
      allowNull: true,
    },
    created_at: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    decision_date: {
      type: Date,
      allowNull: true,
    },
    decision_change_date: {
      type: Date,
      allowNull: true,
    },
    updated_at: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    s3_url: {
      type: String,
      allowNull: true,
    },
    sync_status: {
      maker: {
        type: [sharedStatusFields],
        allowNull: true,
      },
      checker1: {
        type: [sharedStatusFields],
        allowNull: true,
      },
      checker2: {
        type: [sharedStatusFields],
        allowNull: true,
      },
    },
    assignee: {
      type: String,
      allowNull: true,
      enum: ['Maker', 'Checker1', 'Checker2'],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);
var CBILoans = (module.exports = mongoose.model('cbi_loans', CbiLoanSchema));

module.exports.findByColenderData = (data) => {
  return CBILoans.find(data);
};

module.exports.findShortCode = (loan_id) => {
  return CBILoans.findOne({ loan_id: loan_id });
};

module.exports.getByLID = (loan_id) => {
  return CBILoans.findOne({ loan_id: loan_id });
};

module.exports.findByLoanID = (loan_id) => {
  return CBILoans.find({ loan_id: loan_id });
};

module.exports.findByProductID = (product_id) => {
  return CBILoans.find({ product_id: product_id });
};

module.exports.findAll = (data) => {
  return CBILoans.find(data).sort({ created_at: -1 });
};

module.exports.findNew = () => {
  return CBILoans.find({});
};
module.exports.findIfApproved = (loan_id) => {
  return CBILoans.findOne({
    loan_id: loan_id,
  });
};
module.exports.updateColenderLoan = (
  loan_id,
  status,
  remarks,
  decision_date,
  username,
) => {
  return CBILoans.findOneAndUpdate(
    {
      loan_id: loan_id,
    },
    {
      status: status,
      remarks: remarks,
      decision_date: decision_date,
      username: username,
    },
    {},
  );
};

module.exports.modifyColenderLoan = (
  loan_id,
  prev_status,
  status,
  prev_remarks,
  remarks,
  decision_change_date,
  username,
) => {
  return CBILoans.findOneAndUpdate(
    {
      loan_id: loan_id,
    },
    {
      status_earlier: prev_status,
      remarks_earlier: prev_remarks,
      status: status,
      remarks: remarks,
      decision_change_date: decision_change_date,
      updated_by_username: username,
    },
    {},
  );
};

module.exports.updateColenderLoanAndAddBreDetails = (
  loan_id,
  label,
  url,
  bre_exe_date,
  bre_generated_by
) => {
  return CBILoans.findOneAndUpdate(
    {
      loan_id: loan_id,
    },
    {
      bre_result_url: url,
      bre_status: label,
      bre_exe_date: bre_exe_date,
      bre_generated_by:bre_generated_by
    },
    {},
  );
};

module.exports.addOne = async (colenderLoan) => {
  var newColenderLoan = new CBILoans(colenderLoan);
  try {
    return newColenderLoan.save();
  } catch (error) {
    return error;
  }
};

module.exports.modifyColenderLoanData = (loan_id, data) => {
  return CBILoans.findOneAndUpdate(
    {
      loan_id: loan_id,
    },
    data,
    { new: true },
  );
};

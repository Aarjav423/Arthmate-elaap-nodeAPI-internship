var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var ColenderAssignmentSchema = mongoose.Schema(
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
    loan_amount: {
      type: Number,
      allowNull: true,
    },
    pricing: {
      type: Number,
      allowNull: true,
    },
    co_lender_assignment_id: {
      type: Number,
      allowNull: true,
      unique: true,
    },
    cust_id: {
      type: String,
      allowNull: true,
    },
    appl_pan: {
      type: String,
      allowNull: false,
    },
    loan_app_id: {
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
var ColenderAssignment = (module.exports = mongoose.model(
  'co_lender_assignment_detail',
  ColenderAssignmentSchema,
));

module.exports.findColenderAssignmentDetails = (request_id, loan_app_id) => {
  return ColenderAssignment.findOne({
    co_lender_assignment_id: request_id,
    loan_app_id: loan_app_id,
  });
};

module.exports.createNewAssignment = (assignmentDetails) => {
  return ColenderAssignment.create({
    co_lender_assignment_id: assignmentDetails.assignment_id,
    co_lender_id: assignmentDetails.colender_id,
    appl_pan: assignmentDetails.pan,
    loan_app_id: assignmentDetails.loan_app_id,
    loan_amount: assignmentDetails.loan_amount,
    pricing: assignmentDetails.pricing,
  });
};

module.exports.findMaxId = () => {
  return ColenderAssignment.findOne({})
    .sort({ co_lender_assignment_id: -1 })
    .limit(1);
};

module.exports.findByLoanAppIdAndPan = (loanAppId, pan) => {
  return ColenderAssignment.findOne({
    loan_app_id: loanAppId,
    appl_pan: pan,
  });
};

module.exports.findByLoanAppId = (loanAppId) => {
  return ColenderAssignment.findOne({
    loan_app_id: loanAppId,
  });
};

const mongoose = require('mongoose');
const leadSubmissionDetailsSchema = new mongoose.Schema(
  {
    created_by: {
      type: String,
    },
    remarks: {
      type: String,
    },
    code: {
      type: String,
    },
    loan_app_id: {
      type: String,
    },
    sequence: {
      type: Number,
    },
    status: {
      type: String,
      allowNull: false,
      default: 'InProgress',
      enum: ['InProgress', 'Deviation', 'Approved', 'Rejected'],
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);
const LeadSubmissionDetails = mongoose.model(
  'lead_submission_details',
  leadSubmissionDetailsSchema,
);

module.exports = LeadSubmissionDetails;

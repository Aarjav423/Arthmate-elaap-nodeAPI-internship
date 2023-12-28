const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const validationChecklistSchema = mongoose.Schema({
  validation_code: {
    type: String,
  },
  validation_status: {
    type: String,
    enum: ['approved', 'deviation', 'rejected'],
  },
  validation_name: {
    type: String,
  },
  validation_remarks: {
    type: String,
  },
});

// Subsection Schema
const subsectionSchema = mongoose.Schema(
  {
    sub_section_code: {
      type: String,
    },
    sub_section_name: {
      type: String,
    },
    sub_section_sequence_no: {
      type: Number,
    },
    sub_section_status: {
      type: String,
      allowNull: false,
      default: 'in_progress',
      enum: ['in_progress', 'deviation', 'approved', 'rejected'],
    },
    sub_section_remarks: {
      type: String,
    },
    is_section_submit:{
      type: String,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    validation_checklist: [validationChecklistSchema],
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

// LeadSectionDetails Schema
const leadSectionDetailsSchema = mongoose.Schema(
  {
    loan_app_id: {
      type: String,
    },
    section_code: {
      type: String,
    },
    section_name: {
      type: String,
    },
    section_sequence_no: {
      type: Number,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    section_status: {
      type: String,
      allowNull: false,
      default: 'in_progress',
      enum: ['in_progress', 'deviation', 'approved', 'rejected'],
    },
    section_remarks: {
      type: String,
    },
    subsections: [subsectionSchema],
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

const SectionSchema = mongoose.model(
  'lead_section_details',
  leadSectionDetailsSchema,
);

module.exports = SectionSchema;

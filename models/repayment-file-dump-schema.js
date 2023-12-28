const { mod } = require('mathjs');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { parseBooleans } = require('xml2js/lib/processors');

const RepaymentFileDumpSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    file_type: {
      type: String,
      enum: ['Origin Repayment File'],
      allowNull: false,
    },
    file_code: {
      type: Number,
      enum: [0],
      allowNull: false,
    },
    file_name: {
      type: String,
      allowNull: false,
    },
    validation_status: {
      type: String,
      enum: ['In Review', 'Approved', 'In Progress', 'Processed', 'Rejected'],
      allowNull: false,
    },
    validation_stage: {
      type: Number,
      enum: [0, 1, 2, 3, 4],
    },
    record_status: {
      type: String,
      enum: ['Success', 'Failed', 'Partial Success'],
      allowNull: true,
    },
    record_stage: {
      type: Number,
      enum: [0, 1, 2],
      allowNull: true,
    },
    total_records: {
      type: Number,
      allowNull: true,
    },
    total_success_records: {
      type: Number,
      allowNull: true,
    },
    total_failure_records: {
      type: Number,
      allowNull: true,
    },
    s3_url: {
      type: String,
      allowNull: false,
    },
    remarks: {
      type: String,
      allowNull: true,
    },
    created_by: {
      type: String,
      allowNull: false,
    },
    updated_by: {
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

const RepaymentFileDumpModel = (module.exports = mongoose.model(
  'repayment_file_dump',
  RepaymentFileDumpSchema,
));

module.exports.save = (data) => {
  return RepaymentFileDumpModel.create(data);
};

module.exports.findByCriteria = async (query) => {
  const { sort, stage, file, from, to, record_stage } = query;
  let criteria = {};
  const sortBy = { created_at: parseBooleans(sort) ? -1 : 1 };
  if (typeof stage !== 'undefined') {
    criteria.validation_stage = stage;
  }
  if (typeof record_stage !== 'undefined') {
    criteria.record_stage = record_stage;
  }
  if (typeof file !== 'undefined') {
    criteria.file_code = file;
  }
  if (typeof from !== 'undefined' && typeof to !== 'undefined') {
    criteria.created_at = {
      $gte: from,
      $lte: to + 'T23:59:59',
    };
  }
  return await RepaymentFileDumpModel.find(criteria)
    .hint({ _id: 1 })
    .sort(sortBy);
};

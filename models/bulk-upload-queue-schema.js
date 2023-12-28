const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const BulkUploadQueueSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: true,
    },
    file_type: {
      type: String,
      allowNull: true,
    },
    file_code: {
      type: Number,
      allowNull: true,
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
    remarks: {
      type: String,
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
    source_s3_url: {
      type: String,
      allowNull:true,
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

const BulkUploadQueueModel= (module.exports = mongoose.model(
  'bulk_upload_queue',
  BulkUploadQueueSchema,
));

module.exports.save = async (data) => {
  return await BulkUploadQueueModel.create(data);
};

module.exports.findById = async (id) => {
  return BulkUploadQueueModel.find({_id: id});
}

module.exports.findByFilter = async (filter) => {
  const { company_id, fromDate, toDate, fileType, page, limit } = filter;
  let to_date = new Date(toDate);
  to_date.setHours(23, 59, 59, 999);

  let query = {};
  if(company_id) {
    query.company_id =  {"$in" : company_id}
  }
  if (fromDate && toDate) {
   query.created_at = {$gte : fromDate, $lte : to_date}
  }
  if (fileType) {
    query.file_type = {"$in": fileType}
  }

  let count = await BulkUploadQueueModel.find(query).count();
  let data = await BulkUploadQueueModel.find(query).skip(page * limit).limit(limit).sort({ _id: -1 });

  const result = {
    count: count,
    data: data
  };
  return result;
};
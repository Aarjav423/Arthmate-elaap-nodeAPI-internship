const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const NachFileQueueSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: false,
    },
    file_type: {
      type: String,
      enum: ['Nach Presentment File'],
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

const NachFileQueueModel = (module.exports = mongoose.model(
  'nach_file_queue',
  NachFileQueueSchema,
));

module.exports.save = (data) => {
  return NachFileQueueModel.create(data);
};

module.exports.findById = async (id) => {
  return NachFileQueueModel.find({_id: id});
}

module.exports.findByFilter = async (filter) => {
  const { company_id, fromDate, toDate, page, limit } = filter;
  let to_date = new Date(toDate);
  to_date.setHours(23, 59, 59, 999);

  let query = {};
  if(company_id){
    query.company_id =  {"$in" : company_id}
  }
  if (fromDate && toDate) {
   query.created_at = {$gte : fromDate, $lte : to_date}
  }

  let count = await NachFileQueueModel.find(query).count();
  let data;
  
  if (count !==0){
    data = await NachFileQueueModel.find(query)
    .select({
      _id: 1,
      file_name: 1,
      created_at: 1,
      created_by: 1,
      total_records: 1,
      total_success_records: 1,
      total_failure_records: 1,
      validation_status: 1,
      record_status: 1,
      remarks: 1
    })
    .skip(page * limit)
    .limit(limit)
    .sort({ _id: -1 });
  }

  const result = {
    count: count,
    data: data
  };
  return result;
};
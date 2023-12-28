var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const RequestQueueReportsSchema = mongoose.Schema({
    request_queue_reports_id: {
        type: Number,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    company_id: {
      type: Number,
      allowNull: true
    },
    company_name: {
      type: String,
      allowNull: true
    },
    company_code: {
      type: String,
      allowNull: true
    },
    product_id: {
      type: Number,
      allowNull: true
    },
    product_name: {
      type: String,
      allowNull: true
    },
    report_name: {
      type: String,
      allowNull: true
    },
    from_date: {
      type: Date,
      allowNull: true
    },
    to_date: {
      type: Date,
      allowNull: true
    },
    report_status:{
      type: String,
      allowNull: true
    },
    requested_by: {
      type: String,
      allowNull: true
    },
    requested_date: {
      type: Date,
      default: Date.now,
      allowNull: true
    },
    file_name: {
      type: String,
      allowNull: true
    },
    file_url: {
      type: String,
      allowNull: true
    },
    status: {
      type: String,
      allowNull: true,
      enum: ['In-progress', 'Generated', 'No-data']
    },
    generated_date: {
      type: Date,
      allowNull: true
    }
});

autoIncrement.initialize(mongoose.connection);
RequestQueueReportsSchema.plugin(autoIncrement.plugin, 'request_queue_reports_id');
var RequestQueueReports = (module.exports = mongoose.model(
  'request_queue_reports',
  RequestQueueReportsSchema,
));

module.exports.addNew = ( data ) => {
  return RequestQueueReports.create(data);
}

module.exports.addFileName = ( _id, fileName ) => {
  return RequestQueueReports.findOneAndUpdate(
    { _id },
    { $set: { file_name: fileName }},
    { new: true }
  );
}

module.exports.findById = ( _id ) => {
  return RequestQueueReports.findOne({ _id });
}

module.exports.getPaginatedData = async( report_name, page, limit, company_id ) => {
  const query = company_id 
    ? { $and : [{ company_id, report_name }] }
    : { report_name };
  const reports = await RequestQueueReports.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({ _id: -1 });
  const count = await RequestQueueReports.count(query);
  return {
    rows: reports,
    count
  };
}

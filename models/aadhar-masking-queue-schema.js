var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AadharMaskingQueueSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  url: {
    type: String,
    allowNull: false,
  },
  date: {
    type: Date,
    allowNull: false,
    defaultValue: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
AadharMaskingQueueSchema.plugin(autoIncrement.plugin, 'id');
var AadharMaskingQueue = (module.exports = mongoose.model(
  'aadhar_masking_queue',
  AadharMaskingQueueSchema,
));

module.exports.deleteWithId = (id) => {
  return AadharMaskingQueue.deleteOne({
    _id: id,
  });
};

module.exports.getRowsFromQuee = (limit) => {
  return AadharMaskingQueue.find().limit(limit).sort({
    date: -1,
  });
};

module.exports.addNew = (data) => {
  return AadharMaskingQueue.create(data);
};

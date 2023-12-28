var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AadharOffline = mongoose.Schema({
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
  company_id: {
    type: Number,
    allowNull: false,
  },
  session_id: {
    type: String,
    allowNull: false,
  },
  security_code: {
    type: String,
    allowNull: true,
  },
  otp: {
    type: String,
    allowNull: true,
  },
  aadhar_number: {
    type: String,
    allowNull: true,
  },
  success: {
    type: Boolean,
    defaultValue: 0,
  },
  reference_id: {
    type: Number,
    allowNull: true,
  },
  share_code: {
    type: Number,
    allowNull: true,
  },
  raw_data: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    defaultValue: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
AadharOffline.plugin(autoIncrement.plugin, 'id');
var AadharOfflineDataSchema = (module.exports = mongoose.model(
  'aadhar_offline',
  AadharOffline,
));

module.exports.addNew = (data, callback) => {
  const AddAadhaar = new AadharOfflineDataSchema(data);
  AddAadhaar.save(callback);
};

module.exports.updateData = (data, session_id, callback) => {
  const query = {
    session_id: session_id,
  };
  AadharOfflineDataSchema.findOneAndUpdate(query, data, {}, callback);
};

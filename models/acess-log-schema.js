var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AccessLogSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  ipaddress: {
    type: String,
    allowNull: true,
  },
  partnerid: {
    type: String,
    allowNull: true,
  },
  data: {
    type: String,
    allowNull: true,
  },
  timestamp: {
    type: String,
    allowNull: true,
  },
});
autoIncrement.initialize(mongoose.connection);
AccessLogSchema.plugin(autoIncrement.plugin, 'id');
var Accesslog = (module.exports = mongoose.model('accesslog', AccessLogSchema));

module.exports.addNew = (accessLogData) => {
  return Accesslog.create(accessLogData);
};

module.exports.listAll = () => {
  return Accesslog.find();
};

module.exports.findOneWithId = (access_log_id) => {
  return Accesslog.findOne({
    _id: access_log_id,
  });
};

module.exports.updateOne = (id, data, callback) => {
  const query = {
    _id: id,
  };
  return Accesslog.findOneAndUpdate(query, data, {});
};

module.exports.deleteWithId = (access_log_id) => {
  return Accesslog.deleteOne({
    _id: access_log_id,
  });
};

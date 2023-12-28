var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const DesignationsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  title: {
    type: String,
    allowNull: false,
  },
  desc: {
    type: String,
    allowNull: true,
  },
  status: {
    type: Number,
    allowNull: true,
  },
  updatedon: {
    type: Date,
    default: Date.now,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  create_date: {
    type: Date,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
DesignationsSchema.plugin(autoIncrement.plugin, 'id');
var Designations = (module.exports = mongoose.model(
  'designations',
  DesignationsSchema,
));

module.exports.addNew = (designation, callback) => {
  var insertdata = new Designations(designation);
  return insertdata.save(callback);
};
module.exports.getAll = () => {
  return Designations.find({});
};

module.exports.updateOne = (data, title) => {
  const query = {
    title: title,
  };
  return Designations.findOneAndUpdate(query, data, {});
};

module.exports.findByName = (title) => {
  return Designations.findOne({
    title: title,
  });
};

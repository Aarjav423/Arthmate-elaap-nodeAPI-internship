var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');

const AccessMetrixSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  tag: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: Number,
    default: 1,
  },
});

autoIncrement.initialize(mongoose.connection);
AccessMetrixSchema.plugin(autoIncrement.plugin, 'id');
var AccessMetrix = (module.exports = mongoose.model(
  'access_metrix',
  AccessMetrixSchema,
  'access_metrix',
));

module.exports.findIfExist = (title, tag) => {
  return AccessMetrix.findOne({ title, tag });
};

module.exports.findIfExistById = (id) => {
  return AccessMetrix.findOne({ _id: id });
};

module.exports.updateAccessMetrix = (query, data) => {
  return AccessMetrix.findOneAndUpdate(query, data, { new: true });
};
module.exports.addNew = (data) => {
  return AccessMetrix.create(data);
};

module.exports.findAll = () => {
  return AccessMetrix.find();
};

module.exports.findPaginatedAccessMetrix = async (page, limit) => {
  const result = await AccessMetrix.find().sort({ _id: -1 });
  if (page == 0 && limit == 0) {
    return { rows: result, count: result?.length ?? 0 };
  } else {
    const paginatedData = await AccessMetrix.find()
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: -1 });
    return { rows: paginatedData, count: result?.length ?? 0 };
  }
};

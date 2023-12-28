var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const BroadcastEventMasterSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  title: {
    type: String,
    allowNull: false,
  },
  key: {
    type: String,
    allowNull: false,
  },
  description: {
    type: String,
    allowNull: false,
  },
  status: {
    type: String,
    allowNull: false,
    default: 'active',
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
BroadcastEventMasterSchema.plugin(autoIncrement.plugin, 'id');
var BroadcastEventMaster = (module.exports = mongoose.model(
  'broadcast_event_master',
  BroadcastEventMasterSchema,
));

module.exports.addNew = (data) => {
  return BroadcastEventMaster.create(data);
};

module.exports.getAll = (product_id) => {
  return BroadcastEventMaster.find({});
};

module.exports.checkIfExistsByKEY_TITLE = (key, title) => {
  const query = {
    $or: [
      {
        key: key,
      },
      {
        title: title,
      },
    ],
  };
  return BroadcastEventMaster.findOne(query);
};

module.exports.checkIfExistsBy_KEY_KEYID = (key, id) => {
  const query = {
    $and: [
      {
        key,
      },
      {
        _id: id,
      },
    ],
  };

  return BroadcastEventMaster.findOne(query);
};

module.exports.updateRecord = (id, record) => {
  return BroadcastEventMaster.findOneAndUpdate(
    {
      _id: id,
    },
    record,
    {
      new: true,
    },
  );
};

module.exports.updateStatus = (status, id) => {
  return BroadcastEventMaster.findOneAndUpdate(
    {
      _id: id,
    },
    status,
    {
      new: true,
    },
  );
};

module.exports.getById = (id) => {
  return BroadcastEventMaster.findOne({
    _id: id,
  });
};

module.exports.getActiveEventMaster = () => {
  return BroadcastEventMaster.find({
    status: 'active',
  });
};

module.exports.getByTitle = (title) => {
  return BroadcastEventMaster.findOne({
    title,
  });
};

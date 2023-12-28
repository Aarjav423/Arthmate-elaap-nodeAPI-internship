var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const SubscribeEventSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  key: {
    type: String,
    allowNull: false,
  },
  key_id: {
    type: Number,
    allowNull: false,
  },
  callback_uri: {
    type: String,
    allowNull: false,
  },
  secret_key: {
    type: String,
    allowNull: false,
  },
  header_key: {
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
SubscribeEventSchema.plugin(autoIncrement.plugin, 'id');
var SubscribeEvent = (module.exports = mongoose.model(
  'subscribe_event',
  SubscribeEventSchema,
));

module.exports.addNew = (data) => {
  return SubscribeEvent.create(data);
};

module.exports.getAll = (product_id) => {
  return SubscribeEvent.find({});
};

module.exports.checkIfExistsBy_CID_PID_KEY = (data) => {
  const { company_id, product_id, key, key_id } = data;
  const query = {
    $and: [
      {
        company_id,
      },
      {
        product_id,
      },
      {
        key,
      },
      {
        key_id: key_id,
      },
    ],
  };
  return SubscribeEvent.findOne(query);
};

module.exports.updateRecord = (id, record) => {
  return SubscribeEvent.findOneAndUpdate(
    {
      _id: id,
    },
    record,
    {
      new: true,
    },
  );
};

module.exports.updateStatus = (id, status) => {
  return SubscribeEvent.findOneAndUpdate(
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
  return SubscribeEvent.findOne({
    _id: id,
  });
};

// call this fundtion whenever you wanna get the
// event registered against product_id and key
module.exports.getBy_PID_KEYID = (product_id, key) => {
  $and: [
    {
      product_id,
    },
    {
      key,
    },
  ];
  return SubscribeEvent.findOne({
    _id: id,
  });
};

module.exports.getActiveEventMaster = () => {
  return SubscribeEvent.find({
    status: 'active',
  });
};

module.exports.getByCondition = (condition) => {
  return SubscribeEvent.findOne(condition);
};

module.exports.getByKey = (condition) => {
  const { company_id, product_id, key } = condition;
  return SubscribeEvent.findOne({ company_id, product_id, key });
};

module.exports.getByColenderKey = (condition) => {
  const { co_lender_id, key } = condition;
  return SubscribeEvent.find({ co_lender_id, key });
};

module.exports.findBy_PID_KEY = (key, product_id) => {
  return SubscribeEvent.findOne({
    key: key,
    product_id: product_id,
  });
};

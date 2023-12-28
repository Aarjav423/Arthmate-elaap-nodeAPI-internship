var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const McaSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  serviceRequestId: {
    type: String,
    allowNull: false,
  },
  request_id: {
    type: String,
    allowNull: false,
  },
  webhook: {
    type: Boolean,
    allowNull: false,
    default: false,
  },
  webhookUrl: {
    type: String,
    allowNull: false,
  },
  webhookConfig: {
    type: Object,
    allowNull: true,
  },
  clientAcknowledgement: {
    type: Object,
    allowNull: true,
  },
  mcaJsonResponse: {
    type: Object,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: false,
    default: 'PENDING',
  },
});

autoIncrement.initialize(mongoose.connection);
McaSchema.plugin(autoIncrement.plugin, 'id');
var mca = (module.exports = mongoose.model('mca', McaSchema));

module.exports.addData = async (data) => {
  try {
    return mca.create(data);
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports.getAll = (offset = 0, limit = 100) => {
  return mca.find({}).skip(offset).limit(limit).sort({
    create_date: -1,
  });
};

module.exports.findById = (id) => {
  return mca.findOne({
    id,
  });
};

module.exports.findBySRI = (sri) => {
  return mca.findOne({
    serviceRequestId: sri,
  });
};

module.exports.findByRI = (sri) => {
  return mca.findOne({
    request_id: sri,
  });
};

module.exports.updateClientAck = (sri, ackData) => {
  return mca.findOneAndUpdate(
    {
      serviceRequestId: sri,
    },
    {
      $set: {
        clientAcknowledgement: ackData,
      },
    },
  );
};

module.exports.updateMcaJson = (sri, mcaJsonResponse) => {
  return mca.findOneAndUpdate(
    {
      serviceRequestId: sri,
    },
    {
      $set: {
        mcaJsonResponse: mcaJsonResponse,
        status: 'COMPLETED',
      },
    },
  );
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const PanAdvKycSchema = mongoose.Schema({
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
  pan: {
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
  panJsonResponse: {
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
PanAdvKycSchema.plugin(autoIncrement.plugin, 'id');
var PanAdvKyc = (module.exports = mongoose.model(
  'pan_advance_kyc',
  PanAdvKycSchema,
));

module.exports.addData = async (data) => {
  try {
    return PanAdvKyc.create(data);
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports.getAll = (offset = 0, limit = 100) => {
  return PanAdvKyc.find({}).skip(offset).limit(limit).sort({
    create_date: -1,
  });
};

module.exports.findById = (id) => {
  return PanAdvKyc.findOne({
    id,
  });
};

module.exports.findBySRI = (sri) => {
  return PanAdvKyc.findOne({
    serviceRequestId: sri,
  });
};

module.exports.findByPAN = (pan) => {
  return PanAdvKyc.findOne({
    pan: pan,
  });
};

module.exports.updateClientAck = (sri, ackData) => {
  return PanAdvKyc.findOneAndUpdate(
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

module.exports.updatePanJson = (sri, panJsonResponse) => {
  return PanAdvKyc.findOneAndUpdate(
    {
      serviceRequestId: sri,
    },
    {
      $set: {
        panJsonResponse: panJsonResponse,
        status: 'COMPLETED',
      },
    },
  );
};

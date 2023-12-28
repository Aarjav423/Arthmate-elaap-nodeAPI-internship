var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var DigitapVerificationSchema = new mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  syncId: {
    type: String,
    allowNull: false,
  },
  userId: {
    type: String,
    allowNull: false,
  },
  syncData: {
    type: Object,
    allowNull: true,
  },
  locationData: {
    type: [],
    allowNull: true,
  },
  scoreInfo: {
    type: Object,
    allowNull: true,
  },
  userJson: {
    type: Object,
    allowNull: true,
  },
  contactJson: {
    type: Object,
    allowNull: true,
  },
  appJson: {
    type: Object,
    allowNull: true,
  },
  phoneJson: {
    type: Object,
    allowNull: true,
  },
  status: {
    type: Boolean,
    allowNull: false,
    default: true,
  },
  updatedBy: {
    type: String,
    allowNull: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  timestamp: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
DigitapVerificationSchema.plugin(autoIncrement.plugin, 'id');
var DigitapVerifications = (module.exports = mongoose.model(
  'digitap_verification',
  DigitapVerificationSchema,
));

module.exports.addData = async (data) => {
  try {
    return DigitapVerifications.create(data);
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports.getAll = (offset = 0, limit = 100) => {
  return DigitapVerifications.find({}).skip(offset).limit(limit).sort({
    create_date: -1,
  });
};

module.exports.findById = (id) => {
  return DigitapVerifications.findOne({
    id,
  });
};

module.exports.findByUserId = (userId) => {
  return DigitapVerifications.findOne({
    userId: userId,
  });
};

module.exports.findBySyncId = (syncId) => {
  return DigitapVerifications.findOne({
    syncId: syncId,
  });
};

module.exports.updateSyncData = (syncId, syncData) => {
  return DigitapVerifications.findOneAndUpdate(
    {
      syncId: syncId,
    },
    {
      $set: {
        syncId: syncData.syncId,
        syncData: syncData,
      },
    },
  );
};

module.exports.updateLocationData = async (userId, locationData) => {
  const user = await DigitapVerifications.findOne({
    userId: userId,
  });
  let result = null;
  if (user) {
    result = await user.update({
      $push: {
        locationData: locationData,
      },
    });
  } else {
    result = await DigitapVerifications.create({
      userId: userId,
      syncId: locationData.syncId,
      locationData: locationData.locationData,
    });
  }
  return result;
};

module.exports.updateScoreInfo = (syncId, scoreInfo) => {
  return DigitapVerifications.findOneAndUpdate(
    {
      syncId: syncId,
    },
    {
      $set: {
        scoreInfo: scoreInfo,
      },
    },
  );
};

module.exports.updateScoreJson = (syncId, userJson) => {
  return DigitapVerifications.findOneAndUpdate(
    {
      syncId: syncId,
    },
    {
      $set: {
        userJson: userJson,
      },
    },
  );
};

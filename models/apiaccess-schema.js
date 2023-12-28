var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ApiAccessSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  xapikey: {
    type: String,
    allowNull: false,
  },
  xapikeysandbox: {
    type: String,
    allowNull: false,
  },
  partnerid: {
    type: String,
    allowNull: false,
  },
  partnername: {
    type: String,
    allowNull: false,
  },
  va: {
    type: String,
    allowNull: false,
  },
  status: {
    type: String,
    allowNull: false,
  },
});
autoIncrement.initialize(mongoose.connection);
ApiAccessSchema.plugin(autoIncrement.plugin, 'id');
var ApiAccess = (module.exports = mongoose.model('apiaccess', ApiAccessSchema));

module.exports.addApiAccess = (apiaccess, callback) => {
  var insertdata = new ApiAccess(apiaccess);
  insertdata.save(callback);
  /*
  ApiAccess.create(apiaccess).then((response) => {
    callback(null, response)
  }).catch((err) => {
    if (err) {
      callback(err, null)
    }
  })*/
};

module.exports.findIfExists = (partnerId, authkey, callback) => {
  var query = {
    partnerid: partnerId,
    xapikey: authkey,
  };
  ApiAccess.findOne(query, function (err, result) {
    if (err) callback(err, null);
    callback(null, result);
  });
  // ApiAccess.findOne({
  //   where: {
  //     partnerid: partnerId,
  //     xapikey: authkey
  //   }
  // }).then((response) => {
  //   if (response === null) {
  //     callback({
  //       message: 'Invalid Headers'
  //     }, null)
  //   } else {
  //     if (JSON.stringify(response.status) === JSON.stringify('ACTIVE')) {
  //       callback(null, response)
  //     } else {
  //       callback({
  //         message: 'Your account is not Active, please contact administrator'
  //       }, null)
  //     }
  //   }
  // }).catch((err) => {
  //   if (err) {
  //     callback(err, null)
  //   }
  // })
};

module.exports.getAll = (partner_id, callback) => {
  let query = {
    partnerid: partner_id,
    status: 'ACTIVE',
  };
  ApiAccess.find(query, callback);
  // ApiAccess.findAll({
  //   where: {
  //     partnerid: partner_id,
  //     status: 'ACTIVE'
  //   }
  // }).then((result) => {
  //   callback(null, result)
  // }).catch((error) => {
  //   callback(error, null)
  // })
};

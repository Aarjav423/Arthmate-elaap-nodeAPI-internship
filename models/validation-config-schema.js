var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const validationConfigSchema = mongoose.Schema({
  id: {
    type: ObjectId,
    allowNull: true,
  },
  code: {
    type: String,
    allowNull: true,
  },
  details: {
    type: String,
    allowNull: true,
  },
  validation_id:{
    type: Number,
    allowNull: true
  },
});

autoIncrement.initialize(mongoose.connection);
validationConfigSchema.plugin(autoIncrement.plugin, 'id');

var ValidationConfig = (module.exports = mongoose.model('validations_configs', validationConfigSchema));

module.exports.findByCode = (code) => {
    return ValidationConfig.find({code: code});
}

module.exports.findByCodes = async(codes) => {

  const promise = ValidationConfig.find(
    {code: {
            $in: codes
        }
    },
    {
      $project:{
          _id: 0,
          code: 1,
          details: 1,
          validation_id: 1
      }
    }
)
  return promise;
}
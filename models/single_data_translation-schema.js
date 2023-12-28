const { ObjectId } = require('mongodb');
var mongoose = require('mongoose');

const SingleDataTranslationSchema = mongoose.Schema({
  id: {
    type: ObjectId,
    primaryKey: true,
    allowNull: false,
  },
  type: {
    type: String,
    allowNull: true,
  },
  key: {
    type: String,
    allowNull: true,
  },
  value: {
    type: String,
    allowNull: true,
  },
  value_obj: {
    type: Object,
    allowNull: true,
  },
});

var SingleDataTranslation = (module.exports = mongoose.model(
  'single_data_translation',
  SingleDataTranslationSchema,
  'single_data_translation',
));

module.exports.SingleDataTranslation = SingleDataTranslation

module.exports.getValueByTypeAndKey = (type, key) => {
  return SingleDataTranslation.findOne({
    type: type,
    key: key,
  });
};

module.exports.getAllDataByType = (type) => {
  return SingleDataTranslation.find({ type: type },{ key: 1, value: 1, type: 1, _id: 0, value_obj:1 });
};

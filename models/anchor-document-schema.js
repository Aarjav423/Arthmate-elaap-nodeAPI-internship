var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const anchorDocumentSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    anchor_id: {
      type: String,
      allowNull: true,
    },
    code: {
      type: String,
      allowNull: false,
    },
    file_type: {
      type: String,
      allowNull: true,
    },
    file_url: {
      type: String,
      allowNull: true,
    },
    doc_key: {
      type: String,
      allowNull: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
anchorDocumentSchema.plugin(autoIncrement.plugin, 'id');
var anchorDocument = (module.exports = mongoose.model(
  'anchordocument',
  anchorDocumentSchema,
));

//bulk insert
module.exports.addInBulk = (anchordocumentData) => {
  return anchorDocument.insertMany(anchordocumentData);
};

module.exports.addNew = (anchordocumentData) => {
  return anchorDocument.create(anchordocumentData);
};

module.exports.updateExisting = (anchor_id, code, data) => {
  var query = {
    anchor_id,
    code,
  };
  return anchorDocument.findOneAndUpdate(query, data, {});
};

module.exports.findIfExists = (file_type, code, anchor_id) => {
  return anchorDocument.findOne({
    file_type,
    code,
    anchor_id,
  });
};

module.exports.findAllRecord = (condition) => {
  return new Promise((resolve, reject) => {
    anchorDocument
      .find(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

module.exports.findByCondition = (condition) => {
  return anchorDocument.findOne(condition);
};

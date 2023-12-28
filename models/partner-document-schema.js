var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const partnerDocumentSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    company_id: {
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
partnerDocumentSchema.plugin(autoIncrement.plugin, 'id');
var partnerDocument = (module.exports = mongoose.model(
  'partnerdocument',
  partnerDocumentSchema,
));

//bulk insert
module.exports.addInBulk = (partnerdocumentData) => {
  return partnerDocument.insertMany(partnerdocumentData);
};

module.exports.addNew = (partnerdocumentData) => {
  return partnerDocument.create(partnerdocumentData);
};

module.exports.updateExisting = (company_id, code, data) => {
  var query = {
    company_id,
    code,
  };
  return partnerDocument.findOneAndUpdate(query, data, {});
};

module.exports.findIfExists = (file_type, code, company_id) => {
  return partnerDocument.findOne({
    file_type,
    code,
    company_id,
  });
};

module.exports.findAllRecord = (condition) => {
  return new Promise((resolve, reject) => {
    partnerDocument
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
  return partnerDocument.findOne(condition);
};

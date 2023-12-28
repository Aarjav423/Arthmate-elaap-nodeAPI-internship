var mongoose = require('mongoose');
const DocumentMappingSchema = mongoose.Schema(
  {
    doc_code: {
      type: String,
      allowNull: true,
    },
    doc_type: {
      type: String,
      allowNull: true,
    },
    doc_ext: {
      type: Array,
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

var DocumentMappings = (module.exports = mongoose.model(
  'document_mappings',
  DocumentMappingSchema,
));

module.exports.addNew = (docMappingData) => {
  return DocumentMappings.create(docMappingData);
};

module.exports.getByDocCode = (doc_code) => {
  return DocumentMappings.find({ doc_code: doc_code });
};

module.exports.getAll = () => {
  return DocumentMappings.find();
};

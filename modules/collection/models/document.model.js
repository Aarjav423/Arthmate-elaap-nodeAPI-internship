const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { documnetType } = require('../config/document');

const documentSchema = new mongoose.Schema(
  {
    originalname: String,
    mimetype: String,
    size: Number,
    etag: String,
    bucket: String,
    contentType: String,
    key: String,
    acl: String,
    location: String,
    caseId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'coll_details',
      required: false,
    },
    type: {
      type: String,
      enum: [documnetType.PROOFOFCOLLECTION, documnetType.PROOFOFVISIT],
      require: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'coll_users',
      required: true,
    },
  },
  { strict: false, timestamps: true },
);

documentSchema.plugin(toJSON);

/**
 * @typedef Document
 */
const Document = mongoose.model('coll_documents', documentSchema);

module.exports = Document;

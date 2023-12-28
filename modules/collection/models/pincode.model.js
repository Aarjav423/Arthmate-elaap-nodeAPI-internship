const mongoose = require('mongoose');

const { toJSON, paginate } = require('./plugins');

const pincodeSchema = mongoose.Schema({}, { strict: false });

pincodeSchema.methods.findSimilarTypes = function (cb) {
  return this.model('global_pincodes').find({ type: this.type }, cb);
};

// add plugin that converts mongoose to json

pincodeSchema.plugin(toJSON);
pincodeSchema.plugin(paginate);

/**

* @typedef Pincode

*/

const Pincode = mongoose.model('global_pincodes', pincodeSchema);

module.exports = Pincode;

const mongoose = require('mongoose');

const { toJSON, paginate } = require('./plugins');

const agencySchema = mongoose.Schema({}, { strict: false });

// add plugin that converts mongoose to json

agencySchema.plugin(toJSON);
agencySchema.plugin(paginate);

/**

* @typedef Pincode

*/

const Agency = mongoose.model('coll_agencies', agencySchema);

module.exports = Agency;

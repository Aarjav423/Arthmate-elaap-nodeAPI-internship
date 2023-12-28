var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var leadSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  borrower_no_hash: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
leadSchema.plugin(autoIncrement.plugin, 'id');
var LeadMappings = (module.exports = mongoose.model(
  'lead_mapping_details',
  leadSchema,
));

module.exports.findById = (id) => {
  return LeadMappings.findOne({
    _id: id,
  });
};

module.exports.addNew = (data) => {
  return LeadMappings.create(data);
};

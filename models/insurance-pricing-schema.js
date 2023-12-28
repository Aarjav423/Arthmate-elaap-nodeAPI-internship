var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const InsurancePricingSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: false,
      required: true,
    },
    company_name: {
      type: String,
      allowNull: true,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    product_name: {
      type: String,
      allowNull: false,
    },
    master_policy_number: {
      type: String,
      allowNull: true,
    },
    partner_ratio: {
      type: String,
      allowNull: true,
    },
    processor_ratio: {
      type: String,
      allowNull: true,
    },
    premium_multiplier: {
      type: Number,
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
InsurancePricingSchema.plugin(autoIncrement.plugin, 'id');
var InsurancePricing = (module.exports = mongoose.model(
  'insurance_pricing',
  InsurancePricingSchema,
  'insurance_pricing',
));

module.exports.addNew = (data) => {
  const insertdata = new InsurancePricing(data);
  return insertdata.save();
};

module.exports.findByCIDPID = (company_id, product_id) => {
  return InsurancePricing.findOne({ company_id, product_id });
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const PartnerBureauSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  webhook_type: {
    type: String,
    allowNull: false,
  },
  webhook_url: {
    type: String,
    allowNull: false,
  },
  token: {
    type: String,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
PartnerBureauSchema.plugin(autoIncrement.plugin, 'id');
var PartnerBureau = (module.exports = mongoose.model(
  'partner_webhook_details',
  PartnerBureauSchema,
));

module.exports.findByCompanyID = async (company_id) => {
  return await PartnerBureau.findOne({ company_id: company_id });
};

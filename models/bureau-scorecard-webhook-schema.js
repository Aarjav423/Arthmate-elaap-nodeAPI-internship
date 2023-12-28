var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const BureauScorecardWebhookSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  request_id: {
    type: String,
    allowNull: false,
  },
  status: {
    type: String,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
BureauScorecardWebhookSchema.plugin(autoIncrement.plugin, 'id');
var BureauScoreCardWebhook = (module.exports = mongoose.model(
  'bureau_scorecard_webhook',
  BureauScorecardWebhookSchema,
));

module.exports.add = async (data) => {
  try {
    return await BureauScoreCardWebhook.create(data);
  } catch (error) {
    return null;
  }
};

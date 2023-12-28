var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const InsuranceMasterDataSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: true,
  },
  json: {
    type: Number,
    allowNull: false,
  },
  contract_coverage: {
    type: String,
    allowNull: false,
  },

  description: {
    type: String,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
InsuranceMasterDataSchema.plugin(autoIncrement.plugin, 'id');
var InsuranceMasterData = (module.exports = mongoose.model(
  'insurance_master_data',
  InsuranceMasterDataSchema,
  'insurance_master_data',
));

module.exports.addNew = async (data) => {
  const insertdata = new InsuranceMasterData(data);
  return insertdata.save();
};

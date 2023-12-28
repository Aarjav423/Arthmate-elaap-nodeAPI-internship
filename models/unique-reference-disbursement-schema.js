var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const UniqueReferenceDisburesementSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  req_id: {
    type: String,
    allowNull: false,
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
UniqueReferenceDisburesementSchema.plugin(autoIncrement.plugin, 'id');
var UniqueReferenceDisburesement = (module.exports = mongoose.model(
  'unique_reference_disbursement',
  UniqueReferenceDisburesementSchema,
));

module.exports.addNew = async (data) => {
  const insertdata = new UniqueReferenceDisburesement(data);
  return insertdata.save();
};

module.exports.countByLoanId = async (loan_id) => {
  return UniqueReferenceDisburesement.count({
    loan_id: loan_id,
  });
};

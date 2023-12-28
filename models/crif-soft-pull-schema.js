var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var CrifDataSchema = mongoose.Schema({
  company_id: {
    type: Number,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  report_id: {
    type: String,
    allowNull: true,
  },
  request_id: {
    type: String,
    allowNull: true,
  },
  consent: {
    type: String,
    enum: ['Y', 'N'],
  },
  consent_timestamp: {
    type: Date,
  },
  pan: {
    type: String,
  },
  status: {
    type: String,
  },
  created_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  created_by: {
    type: String,
  },
});
var CrifData = (module.exports = mongoose.model(
  'crif_soft_pull_detail',
  CrifDataSchema,
));

module.exports.findIfExists = (loan_app_id, pan, status, bureau_type) => {
  return CrifData.find({
    loan_app_id: loan_app_id,
    pan: pan,
    status: status,
    bureau_type: bureau_type,
  })
    .sort({ _id: -1 })
    .limit(1);
};

module.exports.updateBureauRequest = async (loan_app_id, question) => {
  return await BureauScorecard.findOneAndUpdate(
    { loan_app_id: loan_app_id },
    {
      $set: {
        question: question,
      },
    },
  );
};

module.exports.findLoanIdData = (loan_app_id) => {
  return CrifData.find({
    loan_app_id: loan_app_id,
  })
    .sort({ _id: -1 })
    .limit(1);
};

//insert single
module.exports.addNew = async (bureauData) => {
  return CrifData.create(bureauData);
};

module.exports.findOneWithLoanAppID = (id) => {
  return CrifData.findOne({ loan_app_id: id });
};

module.exports.findOneWithLAIDAndPLID = (loan_app_id, partner_loan_app_id) => {
  return CrifData.findOne({
    loan_app_id: { $in: [loan_app_id, partner_loan_app_id] },
  });
};

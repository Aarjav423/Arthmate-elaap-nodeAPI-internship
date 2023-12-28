const { Int32 } = require('mongodb');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const AScoreSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },
  request_id: {
    type: String,
    allowNull: true,
  },
  score: {
    type: Number,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  bureau_score: {
    type: Number,
    allowNull: true,
  },
});

var AScore = (module.exports = mongoose.model(
  'a_score',
  AScoreSchema,
  'a_score',
));

module.exports.getAll = () => {
  return AScore.find({});
};

module.exports.getByLoanIds = (loanIds) => {
  return AScore.find({ loan_id: { $in: loanIds } });
};

module.exports.findByReqId = (request_id) => {
  return AScore.findOne(request_id);
};

module.exports.findByReqId = (request_id) => {
  return AScore.findOne({ request_id });
};

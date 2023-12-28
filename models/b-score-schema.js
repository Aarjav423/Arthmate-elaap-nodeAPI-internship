var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const BScoreSchema = mongoose.Schema({
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
  offered_amount: {
    type: Number,
    allowNull: true,
  },
  offered_int_rate: {
    type: Number,
    allowNull: true,
  },
  monthly_average_balance: {
    type: Number,
    allowNull: true,
  },
  monthly_imputed_income: {
    type: Number,
    allowNull: true,
  },
  foir: {
    type: Number,
    allowNull: true,
  },
});

var BScore = (module.exports = mongoose.model(
  'b_score',
  BScoreSchema,
  'b_score',
));

module.exports.getAll = () => {
  return BScore.find({});
};

module.exports.getByLoanIds = (loanIds) => {
  return BScore.find({ loan_id: { $in: loanIds } });
};

module.exports.findByReqId = (request_id) => {
  return BScore.findOne({ request_id });
};

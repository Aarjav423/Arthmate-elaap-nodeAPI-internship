var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const amendOffer = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      allowNull: false,
    },
    tenure: {
      type: Number,
      allowNull: false,
    },
    offered_amount: {
      type: Number,
      allowNull: true,
    },
    offered_int_rate: {
      type: Number,
      allowNull: true,
    }
  },
  {
    timestamps: true,
  },
);

const OfferDetailsSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
  },

  offered_amount: {
    type: Number,
    allowNull: true,
  },
  risk_cat: {
    type: String,
    allowNull: true,
  },
  deviation_cat: {
    type: String,
    allowNull: true,
  },
  offered_int_rate: {
    type: Number,
    allowNull: true,
  },
  tenure: {
    type: Number,
    allowNull: true,
  },
  responsibility: {
    type: String,
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
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  rejection_reasons: {
    type: Array,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  program_type: {
    type: String,
    allowNull: true
  },
  offer_detail_history: {
    type: [amendOffer],
  },
});

var OfferDetails = (module.exports = mongoose.model('offer_details', OfferDetailsSchema, 'offer_details'));

module.exports.OfferDetails = OfferDetails;

module.exports.getAll = () => {
  return OfferDetails.find({});
};

module.exports.getByLoanAppId = (loan_app_id) => {
  return OfferDetails.findOne({ loan_app_id: loan_app_id });
};

module.exports.findByReqId = (request_id) => {
  return OfferDetails.findOne({ request_id });
};

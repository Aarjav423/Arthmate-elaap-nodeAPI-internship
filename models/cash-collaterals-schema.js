const { ObjectId } = require('mongodb');
var mongoose = require('mongoose');

const CashCollateralSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: false,
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    primary_disbursement_amount: {
      type: Number,
      allowNull: true,
    },
    primary_net_disbursment_amount: {
      type: Number,
      allowNull: true,
    },
    primary_disbursement_date: {
      type: Date,
      allowNull: true,
    },
    withheld_amount: {
      type: Number,
      allowNull: false,
    },
    loan_closure_date: {
      type: Date,
      allowNull: false,
    },
    witheld_amount_disbursed_date: {
      type: Date,
      allowNull: true,
    },
    disbursment_channel: {
      type: String,
      allowNull: true,
    },
    is_processed: {
      type: String,
      allowNull: true,
    },
    disbursement_status: {
      type: String,
      allowNull: true,
    },
    disbursement_status_code: {
      type: String,
      allowNull: true,
    },
    is_withheld_amount_disbursed: {
      type: Number,
      allowNull: true,
    },
    loc_drawdown_request_id: {
      type: Number,
      allowNull: true,
    },
    loc_drawdown_usage_id: {
      type: Number,
      allowNull: true,
    },
    is_cash_collateral_entry_done: {
      type: Number,
      allowNull: true,
    },
    triggered_by: {
      type: String,
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

const CashCollaterals = (module.exports = mongoose.model(
  'cash_collaterals',
  CashCollateralSchema,
));

module.exports.findCashCollaterals = (criteria, search) => {
  if (search) {
  }
  return CashCollaterals.find(criteria).sort({
    created_at: -1,
  });
};
module.exports.updateCashCollateral = (query, data) => {
  return CashCollaterals.findOneAndUpdate(query, data);
};

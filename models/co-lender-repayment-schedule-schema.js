var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var CoLenderRepaymentScheduleSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      allowNull: false,
    },
    co_lend_loan_id: {
      type: String,
      allowNull: false,
    },
    co_lender_id: {
      type: Number,
      allowNull: false,
    },
    co_lender_shortcode: {
      type: String,
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
    emi_no: {
      type: Number,
      allowNull: false,
    },
    emi_amount: {
      type: String,
      allowNull: false,
    },
    prin: {
      type: String,
      allowNull: false,
    },
    int_amount: {
      type: Number,
      allowNull: false,
    },
    due_date: {
      type: Date,
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
var CoLenderRepaymentSchedule = (module.exports = mongoose.model(
  'co_lend_repayment_schedule',
  CoLenderRepaymentScheduleSchema,
));

module.exports.findAllByLoanId = (loan_id) => {
  return CoLenderRepaymentSchedule.find({
    loan_id,
  }).sort({ due_date: -1 });
};

module.exports.findColenderRepaymentSchedule = (
  co_lend_loan_id,
  co_lender_id,
) => {
  return CoLenderRepaymentSchedule.find({
    co_lend_loan_id: co_lend_loan_id,
    co_lender_id: co_lender_id,
  });
};
module.exports.updateAllCoLendRepaymentSchedule = async (
  repaymentInstallments,
) => {
  return await repaymentInstallments.map(async (intstallments) => {
    let query = {
      $and: [
        { loan_id: intstallments.loan_id },
        { emi_no: intstallments.emi_no },
        { due_date: null },
      ],
    };
    let update = {
      $set: { due_date: intstallments.due_date },
    };
    CoLenderRepaymentSchedule.updateMany(query, update, (error, ack) => {
      if (error) {
        throw {
          success: false,
          message: 'Failed to update due date in co-lender-repayment-schedule',
        };
      }
    });
  });
};

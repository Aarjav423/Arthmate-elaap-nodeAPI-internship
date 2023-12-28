var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');

const LOCRepaymentInstallmentSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  repay_schedule_id: {
    type: Number,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  sub_loan_id: {
    type: String,
    allowNull: false,
  },
  usage_id: {
    type: Number,
    allowNull: false,
  },
  emi_no: {
    type: Number,
    allowNull: false,
  },
  due_date: {
    type: Date,
    allowNull: false,
  },
  emi_amount: {
    type: Decimal128,
    allowNull: false,
  },
  prin: {
    type: Decimal128,
    allowNull: false,
  },
  int_amount: {
    type: Decimal128,
    allowNull: false,
  },
  principal_bal: {
    type: Decimal128,
    allowNull: false,
  },
  principal_outstanding: {
    type: Decimal128,
    allowNull: true,
  },
  created_by: {
    type: String,
    allowNull: true,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    allowNull: false,
  },
  updated_at: {
    type: Date,
    default: Date.now,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
LOCRepaymentInstallmentSchema.plugin(autoIncrement.plugin, 'id');
var LOCRepaymentInstallment = (module.exports = mongoose.model(
  'loc_repayment_installments',
  LOCRepaymentInstallmentSchema,
  'loc_repayment_installments',
));

module.exports.getAll = () => {
  return LOCRepaymentInstallment.find({});
};

module.exports.findByCondition = (condition) => {
  return LOCRepaymentInstallment.findOne(condition);
};

module.exports.getByLoanIds = (loanIds) => {
  return LOCRepaymentInstallment.find({ loan_id: { $in: loanIds } });
};

module.exports.findByLoanId = (loan_id) => {
  return LOCRepaymentInstallment.find({ loan_id }).sort({ due_date: -1 });
};

module.exports.addInBulk = (emiData) => {
  try {
    let counter = 0;
    const myPromise = new Promise((resolve, reject) => {
      emiData.forEach((record) => {
        LOCRepaymentInstallment.create(record)
          .then((response) => {
            counter++;
            if (counter >= emiData.length);
            resolve(response);
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
    return myPromise;
  } catch (error) {
    return error;
  }
};

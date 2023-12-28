var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const ShortORExcessSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      allowNull: false,
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    company_id: {
      type: Number,
      allowNull: true,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    amount: {
      type: String,
      allowNull: false,
    },
    closed_date: {
      type: Date,
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
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

var ShortORExcess = (module.exports = mongoose.model(
  'short_or_excess',
  ShortORExcessSchema,
  'short_or_excess',
));

module.exports.addNew = (data) => {
  return ShortORExcess.create(data);
};

module.exports.findByLoanId = async (loanId) => {
  return await ShortORExcess.findOne({ loan_id: loanId });
}

module.exports.updateAmount = async (loanId, data) => {
  return await ShortORExcess.findOneAndUpdate(
    {
      loan_id: loanId,
    },
    {
      $set: {
        amount: data.amount,
        updated_by: data.updated_by,
      },
    },
  );
}
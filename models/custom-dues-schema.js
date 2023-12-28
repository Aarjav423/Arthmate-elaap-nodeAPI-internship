var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const CustomDueSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  usage_id: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  txn_id: {
    type: String,
    allowNull: true,
  },
  principal_amount: {
    type: String,
    allowNull: false,
    default: 0,
  },
  fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  processing_fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  usage_fee: {
    type: String,
    allowNull: false,
    default: 0,
  },
  subvention_fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  int_value: {
    type: String,
    allowNull: false,
    default: 0,
  },
  exclude_interest_till_grace_period: {
    type: String,
    allowNull: false,
    default: 0,
  },
  upfront_interest: {
    type: String,
    allowNull: false,
    default: 0,
  },
  tenure_in_days: {
    type: String,
    allowNull: false,
    default: 0,
  },
  grace_period: {
    type: String,
    allowNull: false,
    default: 0,
  },
  interest_free_days: {
    type: String,
    allowNull: false,
    default: 0,
  },
  due_date: {
    type: Date,
    allowNull: false,
  },
  txn_date: {
    type: Date,
    allowNull: false,
  },
  overdue_charges_per_day: {
    type: String,
    allowNull: false,
  },
  overdue_days: {
    type: String,
    allowNull: false,
  },
  penal_interest: {
    type: String,
    allowNull: false,
  },
  penal_interest_days: {
    type: String,
    allowNull: false,
  },
  status: {
    type: String,
    allowNull: false,
  },
  created_at: {
    type: Date,
    allowNull: false,
    defaultValue: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
CustomDueSchema.plugin(autoIncrement.plugin, 'id');
var CustomDue = (module.exports = mongoose.model(
  'custom_due',
  CustomDueSchema,
));

module.exports.addNew = (due) => {
  return CustomDue.create(due);
};

//bulk insert
module.exports.addInBulk = (dues) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    dues.forEach((record) => {
      CustomDue.create(record)
        .then((response) => {
          counter++;
          if (counter >= dues.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.getAll = () => {
  return CustomDue.find();
};

module.exports.findByUsageId = (usage_id) => {
  return CustomDue.find({
    usage_id: usage_id,
  });
};

module.exports.updateOne = (id, data) => {
  return CustomDue.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.getCustomDuesData = (TxnIds) => {
  return CustomDue.find({
    txn_id: {
      $in: TxnIds,
    },
  });
};

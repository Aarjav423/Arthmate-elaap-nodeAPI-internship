var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const loanschema = mongoose.Schema({
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
  loan_type_id: {
    type: Number,
    allowNullL: false,
  },
  amount: {
    type: Number,
    allowNullL: false,
  },
  intrest_rate: {
    type: Number,
    allowNullL: false,
  },
  int_rate_type: {
    type: String,
    allowNullL: false,
  },
  intrest_per_day: {
    type: Number,
    allowNullL: true,
  },
  tenure_in_days: {
    type: Number,
    allowNullL: false,
  },
  dpd_rate: {
    type: String,
    allowNullL: false,
  },
  dpd_amount_per_day: {
    type: Number,
    allowNullL: true,
  },
  writeoff_after_days: {
    type: Number,
    allowNullL: true,
  },
  coupon_amount: {
    type: String,
    allowNullL: true,
  },
  conve_fee_amnt: {
    type: String,
    allowNullL: true,
  },
  status: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  name: {
    type: String,
    allowNullL: false,
  },
  loan_custom_templates_id: {
    type: Number,
    allowNullL: false,
  },
  company_proc_fees: {
    type: String,
    allowNullL: false,
  },
  proc_fees: {
    type: String,
    allowNullL: false,
  },
  int_rate: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  flexible_int_rate: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  company_code: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  interest_on_usage: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  is_subvention_based_loans: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  default_loan_status: {
    type: String,
    allowNullL: false,
    default: 'open',
  },
  dpd_on_outstanding: {
    type: Number,
    allowNullL: false,
    default: 0,
  },
  calculate_accrual_interest: {
    type: Number,
    allowNullL: false,
    default: 1,
  },
  insurance_substitute_email: {
    type: String,
    allowNull: true,
  },
  cycle_days: {
    type: Number,
    allowNull: true,
  },
  updated_by: {
    type: Array,
    allowNull: false,
    default: [],
  },
  created_by: {
    type: Array,
    allowNull: false,
    default: [],
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
loanschema.plugin(autoIncrement.plugin, 'id');
var LoanSchema = (module.exports = mongoose.model('loan_schema', loanschema));

module.exports.addNew = (schema) => {
  return LoanSchema.create(schema);
};

module.exports.findAllActive = () => {
  return LoanSchema.find({
    status: 1,
  });
};

module.exports.findAll = () => {
  return LoanSchema.find({});
};

module.exports.findById = (id) => {
  return LoanSchema.findOne({
    _id: id,
  });
};

module.exports.findAllByCompanyCode = (company_code) => {
  return LoanSchema.find({
    company_code: company_code,
  });
};

module.exports.findAllByCompanyId = (company_id) => {
  try {
    return LoanSchema.aggregate([
      {
        $match: {
          company_id: company_id,
        },
      },
      {
        $lookup: {
          from: 'loan_default_types',
          localField: 'loan_type_id',
          foreignField: '_id',
          as: 'loanDefaultTypes',
        },
      },
      {
        $unwind: '$loanDefaultTypes',
      },
    ]);
  } catch (error) {
    return error;
  }
};

module.exports.findIfExists = (name) => {
  return LoanSchema.findOne({
    name: name,
  });
};

module.exports.findByIds = (ids) => {
  LoanSchema.find({
    _id: {
      $in: ids,
    },
  }).select('id', 'dpd_rate');
};

module.exports.updateStatus = (id, status) => {
  const query = {
    _id: id,
  };
  return LoanSchema.findOneAndUpdate(
    query,
    {
      status,
    },
    {},
  );
};

//get count of schemas for a company
module.exports.getSchemaCount = (loan_type_id, company_code) => {
  return LoanSchema.find({
    loan_type_id: loan_type_id,
    company_code: company_code,
  }).count();
};

module.exports.findOneWithId = (loanSchemaId) => {
  return LoanSchema.findOne({
    _id: loanSchemaId,
  });
};

module.exports.findAllWithId = (loanSchemaIds) => {
  return LoanSchema.find({
    _id: {
      $in: loanSchemaIds,
    },
  });
};

module.exports.findCycleSchemaId = (data) => {
  const findCycleSchema = LoanSchema.findOne(data);
  return findCycleSchema.cycle_days;
};

module.exports.findRecord = (condition) => {
  return new Promise((resolve, reject) => {
    LoanSchema.findOne(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

module.exports.findOneWithCondition = (condition) => {
  return LoanSchema.findOne(condition);
};

module.exports.logUpdatedBy = (_id, updated_by) => {
  return LoanSchema.findOneAndUpdate(
    { _id },
    {
      updated_by,
    },
    { new: true },
  );
};

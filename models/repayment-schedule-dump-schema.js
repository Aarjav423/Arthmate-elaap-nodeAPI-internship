var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const repaymentScheduleDumpSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  url: {
    type: String,
    allowNull: false,
  },
  source: {
    type: String,
    enum: ['partner', 'custom', 'loc'],
    allowNull: true,
  },
  created_at: {
    type: Date,
    default: Date.NOW,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
repaymentScheduleDumpSchema.plugin(autoIncrement.plugin, 'id');
var RepaymentScheduleDump = (module.exports = mongoose.model(
  'repayment_schedule_dump',
  repaymentScheduleDumpSchema,
));

module.exports.addNew = (data) => {
  return RepaymentScheduleDump.create(data);
};

module.exports.listAll = () => {
  return RepaymentScheduleDump.find();
};

module.exports.findById = (id) => {
  return RepaymentScheduleDump.findOne({
    _id: id,
  });
};

module.exports.findByLoanId = (loan_id) => {
  return RepaymentScheduleDump.find({
    loan_id,
  });
};

module.exports.findOneByLoanId = (loan_id) => {
  return RepaymentScheduleDump.findOne({
    loan_id,
  });
};

module.exports.getRepaymentScheduleList = async (loan_id) => {
  try {
    const response = await RepaymentScheduleDump.find({
      loan_id,
    }).sort({
      _id: -1,
    });
    return response;
  } catch (error) {
    return error;
  }
};

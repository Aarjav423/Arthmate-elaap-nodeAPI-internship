var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { Decimal128 } = require('mongodb');
const moment = require('moment');
const { filter } = require('mathjs');
mongoose.Promise = global.Promise;

const RepaymentInstallmentSchema = mongoose.Schema(
  {
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
    created_at: {
      type: Date,
      default: Date.NOW,
      allowNull: false,
    },
    nach_presentment_status: {
      type: String,
      allowNull: true,
    },
    original_due_date: {
      type: Date,
      allowNull: true,
    },
    updated_by: {
      type: String,
      allowNull: true,
    },
    updated_at: {
      type: Date,
      default: Date.NOW,
      allowNull: true,
    },
    processed: {
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

autoIncrement.initialize(mongoose.connection);
RepaymentInstallmentSchema.plugin(autoIncrement.plugin, 'id');

var RepaymentInstallment = (module.exports = mongoose.model(
  'repayment_installment',
  RepaymentInstallmentSchema,
));

module.exports.findAllByLoanId = (loan_id) => {
  return RepaymentInstallment.find({
    loan_id,
  }).sort({ due_date: -1 });
};

module.exports.findProcessedByLoanId = (loan_id) => {
  return RepaymentInstallment.findOne(
    {
      loan_id,
      processed: 'Y',
    },
    {
      loan_id: 1,
      processed: 1,
    },
  ).sort({ due_date: 1 });
};

module.exports.addNew = (data) => {
  return RepaymentInstallment.create(data);
};

module.exports.findIfEmiAmountExists = (loan_id, txn_data) => {
  return RepaymentInstallment.find({
    loan_id,
  }).sort({ due_date: -1 });
};

module.exports.addInBulk = (repaymentData) => {
  try {
    let counter = 0;
    const myPromise = new Promise((resolve, reject) => {
      repaymentData.forEach((record) => {
        RepaymentInstallment.create(record)
          .then((response) => {
            counter++;
            if (counter >= repaymentData.length);
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

module.exports.getFilteredRepaymentDueRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date } = filter;
  query['$and'] = [];
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id) {
    query['$and'].push({
      product_id,
    });
  }
  if (
    from_date !== 'null' &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== ''
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      due_date: {
        $gte: date,
      },
    });
  }
  if (
    to_date !== 'null' &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== ''
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      due_date: {
        $lte: date,
      },
    });
  }

  return RepaymentInstallment.find(query);
};

module.exports.getByCompanyIdAndProductId = async (params, lids) => {
  let {
    company_id,
    product_id,
    page,
    limit,
    status,
    fromRange,
    toRange,
    searchBy,
  } = params;
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  let query = {};
  if (company_id) {
    query['$and'] = [];
    query['$and'].push({
      company_id,
    });
  }
  if (product_id)
    query['$and'].push({
      product_id,
    });
  if (fromRange) {
    query['$and'].push({
      due_date: {
        $gte: fromRange,
      },
    });
  }
  if (fromRange) {
    query['$and'].push({
      due_date: {
        $gte: fromRange,
      },
    });
  }
  if (toRange) {
    query['$and'].push({
      due_date: {
        $lte: toRange,
      },
    });
  }
  if (lids.length) {
    query['$and'].push({
      loan_id:
        lids.length > 1
          ? {
              $in: lids,
            }
          : lids[0],
    });
  }
  if (
    searchBy !== '' &&
    searchBy !== null &&
    searchBy !== 'null' &&
    searchBy !== undefined
  ) {
    query['$and'].push({
      $or: [
        {
          loan_id: {
            $regex: searchBy,
            $options: 'i',
          },
        },
      ],
    });
  }
  if (Number(fromRange) >= 0 && Number(toRange) > 0) {
    let fromDate = new Date(moment().add(Number(fromRange) - 1, 'd'));
    fromDate.setHours(0, 0, 0, 0);
    let toDate = new Date(moment().add(Number(toRange) - 1, 'd'));
    toDate.setHours(23, 59, 59, 999);
    query['$and'].push({
      due_date: {
        $gte: fromDate,
      },
    });
    query['$and'].push({
      due_date: {
        $lte: toDate,
      },
    });
  }
  const returnedFields = {
    loan_id: 1,
    emi_amount: 1,
    due_date: 1,
    _id: 1,
    emi_no: 1,
    repay_schedule_id: 1,
    nach_presentment_status: 1,
  };
  const repaymentInstallments = await RepaymentInstallment.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({ due_date: 1 })
    .select(returnedFields);
  const count = await RepaymentInstallment.find(query).count();
  return { count, repaymentInstallments };
};

module.exports.findByRepayScheduleId = (repay_schedule_id) => {
  return RepaymentInstallment.find({
    repay_schedule_id,
  });
};

module.exports.deleteByRepayScheduleId = (repay_schedule_id) => {
  return RepaymentInstallment.deleteMany({
    repay_schedule_id,
  });
};

module.exports.updateNachPresentmentstatus = (condition, data) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      condition.forEach((row) => {
        return RepaymentInstallment.findOneAndUpdate(row, data)
          .then((result) => {
            counter++;
            if (counter == condition.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return myPromise;
};

module.exports.findIfExistBulk = (conditionData) => {
  let counter = 0;
  let responseData = [];
  const myPromise = new Promise((resolve, reject) => {
    conditionData.forEach((query) => {
      RepaymentInstallment.findOne(query)
        .then((response) => {
          if (response !== null) {
            responseData.push(response);
          }
          counter++;
          if (counter >= conditionData.length) {
            resolve(responseData);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.findByLidAndRepayScheduleId = (loan_id, repay_schedule_id) => {
  return RepaymentInstallment.find({
    loan_id,
    repay_schedule_id,
  });
};

module.exports.findOneAndUpdateByData = (data) => {
  const filter = {
    loan_id: data.loan_id,
    repay_schedule_id: data.repay_schedule_id,
    emi_no: data.emi_no,
  };
  return RepaymentInstallment.findOneAndUpdate(filter, data);
};

module.exports.getFilteredRepaymentScheduleRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date } = filter;
  query['$and'] = [];
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id) {
    query['$and'].push({
      product_id,
    });
  }
  if (
    from_date !== 'null' &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== ''
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      due_date: {
        $gte: date,
      },
    });
  }
  if (
    to_date !== 'null' &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== ''
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      due_date: {
        $lte: date,
      },
    });
  }
  return RepaymentInstallment.find(query);
};

module.exports.getRecordsByLidCidAndPid = (filter) => {
  const query = {
    loan_id: { $in: filter.loanIds },
    company_id: filter.company_id,
    product_id: filter.product_id,
  };

  return RepaymentInstallment.find(query).sort({ loan_id: 1, emi_no: 1 });
};

module.exports.getRecordsLoanIds = (loanIds) => {
  const query = {
    loan_id: { $in: loanIds },
  };

  return RepaymentInstallment.find(query).sort({ loan_id: 1, emi_no: 1 });
};

module.exports.getFilteredRepaymentsOnLoanId = (filter) => {
  const { loan_id, from_date } = filter;

  const query = {
    loan_id: loan_id,
    due_date: {
      $gte: from_date,
    },
  };

  return RepaymentInstallment.find(query).limit(1).sort({ due_date: 1 });
};

module.exports.getPreviousRepaymentsOnLoanId = (filter) => {
  const { loan_id, to_date } = filter;
  const query = {
    loan_id: loan_id,
    due_date: {
      $lte: to_date,
    },
  };
  return RepaymentInstallment.find(query).limit(1).sort({ due_date: -1 });
};

module.exports.updateDueDate = (query, update) => {
  return RepaymentInstallment.findOneAndUpdate(query, update, {
    returnOriginal: false,
  });
};

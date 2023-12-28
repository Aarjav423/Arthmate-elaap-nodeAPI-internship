var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const DisbursementAndTopupSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: String,
      allowNull: false,
    },
    product_id: {
      type: String,
      allowNull: false,
    },
    disbursement_channel: {
      type: String,
      allowNull: false,
    },
    utrn_number: {
      type: String,
      allowNull: false,
    },
    amount: {
      type: Number,
    },
    txn_entry: {
      type: String,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    borrower_id: {
      type: String,
      allowNull: true,
    },
    partner_loan_id: {
      type: String,
      allowNull: true,
    },
    txn_date: {
      type: Date,
      allowNull: false,
    },
    transfer_type: {
      type: String,
      allowNull: false,
    },
    bank_name: {
      type: String,
      allowNull: true,
    },
    bank_account_no: {
      type: String,
      allowNull: true,
    },
    bank_ifsc_code: {
      type: String,
      allowNull: true,
    },
    borrower_mobile: {
      type: String,
      allowNull: true,
    },
    sender_name: {
      type: String,
      allowNull: true,
    },
    txn_id: {
      type: String,
      allowNull: true,
    },
    status: {
      type: String,
      allowNull: true,
    },
    webhook_status_code: {
      type: String,
      allowNull: true,
    },
    webhook_status: {
      type: String,
      allowNull: true,
    },
    partner_borrower_id: {
      type: String,
      allowNull: true,
    },
    txn_stage: {
      type: String,
      allowNull: true,
    },
    bank_remark: {
      type: String,
      allowNull: true,
    },
    //newly added fields
    upfront_interest: {
      type: Number,
      allowNull: true,
    },
    rearended_interest: {
      type: Number,
      allowNull: true,
    },
    processing_fees: {
      type: Number,
      allowNull: true,
    },
    disbursement_date_time: {
      type: String,
      allowNull: true,
    },
    label: {
      type: String,
      allowNull: true,
    },
    created_at: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    refund_req_id: {
      type: String,
    },
    request_id: {
      type: String,
      allowNull: true,
    },
    label_type: {
      type: String,
      allowNull: true,
    },
    disburse_for_loc_request_id: {
      type: Number,
      allowNull: true,
    },
    disburse_for_loc_usage_id: {
      type: Number,
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
DisbursementAndTopupSchema.plugin(autoIncrement.plugin, 'id');
var DisbursementLedger = (module.exports = mongoose.model(
  'disbursement_and_topup',
  DisbursementAndTopupSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new DisbursementLedger(data);
  return insertdata.save();
};

module.exports.findByName = (disbursement_channel) => {
  return DisbursementLedger.find({
    disbursement_channel: disbursement_channel,
  });
};
module.exports.findByLoanId = (loan_id) => {
  return DisbursementLedger.findOne({ loan_id });
};

module.exports.findIfExistAndUpdate = (disbursement_channel) => {
  return DisbursementLedger.find({
    disbursement_channel: disbursement_channel,
  });
};

module.exports.findByCondition = (condition) => {
  return DisbursementLedger.find(condition);
};

module.exports.findNonFailedRequest = (loan_id) => {
  return DisbursementLedger.findOne({
    loan_id,
    txn_stage: '1',
    txn_entry: 'dr',
  });
};

module.exports.findEntryForDebit = (loan_id) => {
  return DisbursementLedger.find({
    loan_id,
    txn_stage: '1',
    txn_entry: 'dr',
  }).sort({
    _id: -1,
  });
};

module.exports.findEntry = (data) => {
  return DisbursementLedger.find(data).sort({
    _id: -1,
  });
};

module.exports.findByTxnId = (txn_id) => {
  return DisbursementLedger.findOne({ txn_id });
};

module.exports.updateData = (txn_id, data) => {
  return DisbursementLedger.findOneAndUpdate({ txn_id }, data, { new: true });
};

module.exports.getFilteredRefundRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;

  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return DisbursementLedger.find({}).sort({
      _id: -1,
    });
  }
  query['$and'] = [];
  if (company_id && company_id != '00') {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id && product_id != '00') {
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
      created_at: {
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
      created_at: {
        $lte: date,
      },
    });
  }
  if (status === 'success') {
    query['$and'].push({
      txn_stage: '1',
      txn_entry: 'dr',
      label: 'Refund',
    });
  }
  if (status === 'fail') {
    query['$and'].push({
      txn_stage: '31',
      txn_entry: 'dr',
      label: 'Refund',
    });
  }
  if (!status) {
    query['$and'].push({
      txn_entry: 'dr',
      label: 'Refund',
    });
  }
  return DisbursementLedger.find(query);
};

module.exports.getByLoanIds = (loanIds) => {
  return DisbursementLedger.find({
    loan_id: { $in: loanIds },
  }).select({ loan_id: 1, utrn_number: 1 });
};

module.exports.getFilteredDisbursementInprogressRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;

  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return DisbursementLedger.find({}).sort({
      _id: -1,
    });
  }
  query['$and'] = [];
  if (company_id && company_id != '00') {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id && product_id != '00') {
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
      created_at: {
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
      created_at: {
        $lte: date,
      },
    });
  }
  if (status === 'inprogress') {
    query['$and'].push({
      txn_stage: '',
      txn_entry: 'dr',
      label: {
        $ne: 'Refund',
      },
    });
  }
  if (status === 'success') {
    query['$and'].push({
      txn_entry: 'dr',
      stage: '1',
      label: {
        $ne: 'Refund',
      },
    });
  }
  if (status === 'fail') {
    query['$and'].push({
      txn_entry: 'dr',
      stage: '2',
      label: 'disbursement',
    });
  }
  if (!status) {
    query['$and'].push({
      txn_entry: 'dr',
      label: 'disbursement',
    });
  }
  return DisbursementLedger.find(query);
};

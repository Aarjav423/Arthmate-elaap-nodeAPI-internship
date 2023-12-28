//const underscoreLib = require('underscore');
const moment = require('moment');
var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const LoanTransactionLedgerSchema = mongoose.Schema(
  {
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
    company_id: {
      type: Number,
      allowNull: false,
    },
    created_by: {
      type: String,
      allowNull: true,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    company_name: {
      type: String,
      allowNull: true,
    },
    product_name: {
      type: String,
      allowNull: true,
    },
    borrower_name: {
      type: String,
      allowNull: true,
      default: '',
    },
    company_name: {
      type: String,
      allowNull: true,
      default: '',
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    loan_app_id: {
      type: String,
      allowNull: false,
    },
    borrower_id: {
      type: String,
      allowNull: false,
    },
    partner_borrower_id: {
      type: String,
      allowNull: false,
    },
    partner_loan_id: {
      type: String,
      allowNull: false,
    },
    partner_loan_app_id: {
      type: String,
      allowNull: false,
    },
    vpa_id: {
      type: String,
      allowNull: true,
    },
    utr_number: {
      type: String,
      allowNull: true,
    },
    txn_amount: {
      type: String,
      allowNull: true,
    },
    txn_date: {
      type: String,
      allowNull: true,
    },
    txn_reference: {
      type: String,
      allowNull: true,
    },
    txn_reference_datetime: {
      type: Date,
      allowNull: true,
    },
    txn_id: {
      type: String,
      allowNull: true,
    },
    loan_usage_id: {
      type: String,
      allowNull: true,
    },
    type: {
      type: String,
      allowNull: true,
    },
    txn_entry: {
      type: String,
      allowNull: true,
    },
    is_sanctioned: {
      type: Boolean,
      allowNull: true,
    },
    invoice_status: {
      type: String,
      allowNull: true,
    },
    invoice_number: {
      type: String,
      allowNull: true,
    },
    label: {
      type: String,
      enum: [
        'repayment',
        'foreclosure',
        'fldg',
        'partpayment',
        'disbursement',
        'Refund',
        'Advance EMI',
        'waiver',
        'pf',
      ],
      allowNull: false,
    },
    waiver_type: {
      type: Number,
      allowNull: true,
    },
    gst_reversal: {
      type: String,
      default: 0,
    },
    tenure: {
      type: String,
      allowNull: true,
      default: 0,
    },
    total_principal: {
      type: String,
      allowNull: true,
      default: 0,
    },
    final_disburse_amt: {
      type: String,
      allowNull: true,
      default: 0,
    },
    upfront_deducted_charges: {
      type: String,
      allowNull: true,
      default: 0,
    },
    charges_payable: {
      type: String,
      allowNull: true,
      default: 0,
    },
    expected_repayment_dates: {
      type: String,
      allowNull: true,
      default: '',
    },
    total_outstanding: {
      type: String,
      allowNull: true,
      default: 0,
    },
    interest_payable: {
      type: String,
      allowNull: true,
      default: 0,
    },
    disbursement_channel: {
      type: String,
      allowNull: true,
    },
    ac_holder_name: {
      type: String,
      allowNull: true,
    },
    account_number: {
      type: String,
      allowNull: true,
    },
    bank_name: {
      type: String,
      allowNull: true,
    },
    upfront_interest: {
      type: String,
      allowNull: true,
      default: 0,
    },
    int_value: {
      type: String,
      allowNull: true,
      default: '',
    },
    due_date: {
      type: String,
      allowNull: true,
      default: '',
    },
    grace_period: {
      type: String,
      allowNull: true,
      default: '',
    },
    tenure_in_days: {
      type: String,
      allowNull: true,
      default: '',
    },
    upfront_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    upfront_processing_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    upfront_usage_fee: {
      type: String,
      allowNull: true,
      default: 0,
    },
    usage_fees_including_gst: {
      type: Number,
      allowNull: true,
      default: 0,
    },
    payable_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    payable_processing_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    payable_usage_fee: {
      type: String,
      allowNull: true,
      default: 0,
    },
    subvention_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    upfront_subvention_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    payable_subvention_fees: {
      type: String,
      allowNull: true,
      default: 0,
    },
    interest_free_days: {
      type: String,
      allowNull: true,
      default: 0,
    },
    exclude_interest_till_grace_period: {
      type: String,
      allowNull: true,
      default: 0,
    },
    penal_interest: {
      type: String,
      allowNull: true,
      default: 0,
    },
    overdue_charges: {
      type: String,
      allowNull: true,
      default: 0,
    },
    migration: {
      type: String,
      allowNull: true,
    },
    processor: {
      type: String,
      allowNull: true,
      default: '',
    },
    txn_stage: {
      type: String,
      allowNull: true,
      default: '01',
    },
    initiated_date: {
      type: String,
      allowNull: true,
    },
    custom_due: {
      type: String,
      allowNull: true,
      default: '0',
    },
    // Newly added columns for LOC
    repay_status: {
      type: String,
      allowNull: true,
      default: 'pending',
    },
    paid_amount: {
      type: Number,
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
    disbursement_status: {
      type: String,
      allowNull: true,
    },
    utr_date_time_stamp: {
      type: Date,
      allowNull: true,
      default: Date.now,
    },
    record_method: {
      type: String,
      allowNull: true,
    },
    note: {
      type: String,
      allowNull: true,
    },
    interest_paid_amount: {
      type: Number,
      allowNull: true,
    },
    principal_paid_amount: {
      type: Number,
      allowNull: true,
    },
    principal_amount: {
      type: Number,
      allowNull: true,
    },
    payment_mode: {
      type: String,
      allowNull: true,
    },
    repayment_tag: {
      type: String,
      allowNull: true,
    },
    repayment_due_date: {
      type: String,
      allowNull: true,
    },
    cgst_on_usage_fee: {
      type: Number,
      allowNull: true,
    },
    sgst_on_usage_fee: {
      type: Number,
      allowNull: true,
    },
    igst_on_usage_fee: {
      type: Number,
      allowNull: true,
    },
    gst_on_usage_fee: {
      type: Number,
      allowNull: true,
    },
    is_received: {
      type: String,
      allowNull: true,
    },
    webhook_status_code: {
      type: String,
      allowNull: true,
    },
    bank_remark: {
      type: String,
      allowNull: true,
    },
    disbursement_date_time: {
      type: String,
      allowNull: true,
    },
    disb_stage: {
      type: String,
      allowNull: true,
      default: null,
    },
    converted_to_emi: {
      type: String,
      allowNull: true,
    },
    no_of_emi: {
      type: Number,
      allowNull: true,
    },
    prin_os: {
      type: Number,
      allowNull: true,
    },
    int_os: {
      type: Number,
      allowNull: true,
    },
    refund_amount: {
      type: Number,
      allowNull: true,
    },
    refund_request_date_time: {
      type: Date,
      allowNull: true,
    },
    int_refund_date_time: {
      type: String,
      allowNull: true,
    },
    int_refund_status: {
      type: String,
      allowNull: true,
    },
    utr_number_refund: {
      type: String,
      allowNull: true,
    },
    borro_bank_name: {
      type: String,
      allowNull: true,
    },
    borro_bank_acc_number: {
      type: String,
      allowNull: true,
    },
    borro_bank_ifsc: {
      type: String,
      allowNull: true,
    },
    repayment_days: {
      type: Number,
      allowNull: true,
    },
    request_id: {
      type: Number,
      allowNull: true,
    },
    usage_id: {
      type: Number,
      allowNull: true,
    },
    amount_net_of_tds: {
      type: Number,
      allowNull: true,
    },
    tds_amount: {
      type: Number,
      allowNull: true,
    },
    processed: {
      type: String,
      allowNull: true,
    },
    label_type: {
      type: String,
      allowNull: true,
    },
    initiated_at: {
      type: String,
      allowNull: true,
    },
    action_by: {
      type: String,
      allowNull: true,
    },
    action_date: {
      type: String,
      allowNull: true,
    },
    beneficiary_bank_details_id: {
      type: Number,
      allowNull: true,
    },
    invoice_number: {
      type: String,
      allowNull: true,
    },
    product_scheme_id: {
      type: Number,
      allowNull: true,
    },
    coll_bank_name: {
      type: String,
      allowNull: true,
    },
    coll_bank_acc_number: {
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
LoanTransactionLedgerSchema.plugin(autoIncrement.plugin, 'id');
var LoanTransactionLedger = (module.exports = mongoose.model(
  'loan_transaction_ledger',
  LoanTransactionLedgerSchema,
));

module.exports.addNew = (disbursementData) => {
  return LoanTransactionLedger.create(disbursementData);
};

module.exports.findByTransactionidCompany = (ids) => {
  return LoanTransactionLedger.find({
    txn_id: {
      $in: ids,
    },
  });
};

//find records by multiple transaction ids
module.exports.findByTransactionids = (ids) => {
  return LoanTransactionLedger.find({
    type: 'usage',
    txn_id: {
      $in: ids,
    },
  });
};

//find cl_balance exist by loan_id and borrower_id
module.exports.isExistByBookkingLoanBorrowerId = (borrower_id, loan_id) => {
  return LoanTransactionLedger.findOne({
    loan_id,
    borrower_id,
  });
};

module.exports.getTotalUsage = (borrower_id, loan_id) => {
  return LoanTransactionLedger.aggregate([
    {
      $project: {
        borrower_id,
        loan_id,
      },
    },
    {
      $group: {
        _id: '$loan_id',
        totalUsage: {
          $sum: '$txn_amount',
        },
      },
    },
  ]);
};

module.exports.getTotalUsageRepaymentsByKLIORPID = (
  product_id,
  loan_id,
  type,
  txn_stage,
) => {
  if (!product_id && !loan_id)
    return {
      message: 'please provide product_id or loan_id',
    };
  let whereData = [];
  if (product_id) {
    whereData.push({
      product_id: product_id,
    });
  } else if (loan_id) {
    whereData.push({
      loan_id: loan_id,
    });
  }
  whereData.push({
    type: type || 'usage',
    txn_stage: txn_stage,
  });
  return LoanTransactionLedger.find(whereData);
};

//bulk insert
module.exports.addInBulk = (usageData) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    usageData.forEach((record) => {
      LoanTransactionLedger.create(record)
        .then((response) => {
          counter++;
          if (counter >= usageData.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.getAllByLoanBorrowerId = (borrower_id, loan_id) => {
  return LoanTransactionLedger.find({
    loan_id,
    borrower_id,
  });
};

//get all by last month-year data
module.exports.getPreviousMonthData = (prevMonthStart, prevMonthEnd, type) => {
  return LoanTransactionLedger.find({
    created_at: {
      $gte: new Date(prevMonthStart),
      $lt: new Date(prevMonthEnd),
    },
    type: type,
  });
};

module.exports.getMonthData = (
  loan_ids,
  prevMonthStart,
  prevMonthEnd,
  type,
) => {
  return LoanTransactionLedger.find({
    invoice_status: type,
    type: 'usage',
    loan_id: {
      $in: loan_ids,
    },
    txn_date: {
      $gte: new Date(prevMonthStart),
      $lt: new Date(prevMonthEnd),
    },
  });
};

module.exports.getMonthDataUsageAndRepay = (data) => {
  return LoanTransactionLedger.find({
    loan_id: data.loan_id,
    txn_date: {
      $gte: new Date(data.prevMonthStart),
      $lt: new Date(data.prevMonthEnd),
    },
  });
};

module.exports.getClHistory = (data, fromDate, toDate, callback) => {
  LoanTransactionLedger.find({
    txn_date: {
      $gte: new Date(fromDate),
      $lt: new Date(toDate),
    },
  })
    .select(
      'loan_id ac_holder_name txn_reference txn_id type txn_amount txn_balance txn_date transaction_code',
    )
    .then((response) => {
      LoanTransactionLedger.find({
        txn_date: {
          $gte: new Date(fromDate),
          $lt: new Date(toDate),
        },
      })
        .count()
        .then((get) => {
          callback(null, {
            count: get,
            rows: response,
          });
        })
        .catch((err) => {
          callback(err, null);
        });
    })
    .catch((error) => {
      callback(error, null);
    });
};

module.exports.getClHistoryForNewCl = (data, fromDate, toDate, callback) => {
  LoanTransactionLedger.find({
    txn_date: {
      $gte: new Date(fromDate),
      $lt: new Date(toDate),
    },
  })
    .select(
      'loan_id',
      'ac_holder_name',
      'txn_reference',
      'txn_id',
      'type',
      'txn_amount',
      'txn_date',
      'txn_entry',
    )
    .then((response) => {
      LoanTransactionLedger.find({
        txn_date: {
          $gte: new Date(fromDate),
          $lt: new Date(toDate),
        },
      })
        .count()
        .then((get) => {
          callback(null, {
            count: get,
            rows: response,
          });
        })
        .catch((err) => {
          callback(err, null);
        });
    })
    .catch((error) => {
      callback(error, null);
    });

  // data.txn_date = {
  //     [Op.between]: [fromDate, toDate]
  // }
  // LoanTransactionLedger.findAndCountAll({
  //     attributes: ['loan_id', 'ac_holder_name', 'txn_reference', 'txn_id', 'type', 'txn_amount', 'txn_date', 'txn_entry'],
  //     where: data
  // }).then((response) => {
  //     callback(null, response)
  // }).catch((err) => {
  //     if (err) {
  //         callback(err, null)
  //     }
  // });
};

module.exports.getLatestCreditTransDetails = (loan_ids, callback) => {
  LoanTransactionLedger.findAll({
    attributes: [
      'id',
      'loan_id',
      'borrower_id',
      'partner_loan_id',
      'partner_borrower_id',
      'company_id',
      'txn_amount',
      'txn_balance',
      'txn_usedtotal',
      'txn_date',
      'txn_id',
    ],
    where: {
      id: {
        [Op.in]: [
          sequelize.literal(
            "SELECT MAX(id) FROM cl_transactions_ledger WHERE type='cr' GROUP BY loan_id ",
          ),
        ],
      },
      loan_id: {
        [Op.in]: loan_ids,
      },
    },
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.updateCurrentCrAmtBulkByTxnId = (data, callback) => {
  let counter = 0;
  data.forEach((row) => {
    LoanTransactionLedger.bulkWrite[
      {
        updateOne: {
          filter: {
            txn_id: row['txn_id'],
          },
          update: {
            txn_usedtotal: row['txn_usedtotal'],
          },
        },
      }
    ].then((res) => {
      counter++;
      if (counter == data.length) return callback(null, data);
    });
  });
  // let counter = 0;
  // data.forEach((row) => {
  //     LoanTransactionLedger.update(
  //         {
  //             txn_usedtotal: row['txn_usedtotal']
  //         },
  //         {
  //             where: { txn_id: row['txn_id'] }
  //         }).then((result) => {
  //             counter++;
  //             if (counter === data.length) return callback(null, data);
  //         }).catch((error) => { return callback(error, null) });
  // });
};

module.exports.deleteRecord = (id, callback) => {
  return LoanTransactionLedger.deleteOne({
    _id: id,
  });
};

module.exports.updateRecord = (record, callback) => {
  return LoanTransactionLedger.findOneAndUpdate(
    {
      _id: record.id,
    },
    record,
    {},
  );
};

module.exports.findKLIByIdsWithTxnId = (txn_id) => {
  return LoanTransactionLedger.find({
    txn_id,
  });
};

module.exports.findAllTxnWithKlid = (loan_id, type) => {
  return LoanTransactionLedger.find({
    loan_id: loan_id,
    txn_entry: type,
  });
};

module.exports.updateInvoiceStatus = (
  ids,
  invoice_status,
  invoice_number,
  callback,
) => {
  if (!ids.length) callback(null, ids);
  let counter = 0;
  ids.forEach((row) => {
    LoanTransactionLedger.bulkWrite[
      {
        updateOne: {
          filter: {
            _id: id,
          },
          update: {
            invoice_status,
            invoice_number,
          },
        },
      }
    ].then((res) => {
      counter++;
      if (counter == ids.length) return callback(null, ids);
    });
  });
};

module.exports.getClTransactionCount = (loan_id) => {
  return LoanTransactionLedger.countDocuments({
    loan_id,
  });
};

module.exports.getClTransactionCountOnTxnEntry = (loan_id, txn_entry) => {
  return LoanTransactionLedger.countDocuments({
    loan_id,
    txn_entry,
  });
};

module.exports.getClTransactionData = async (data, page, limit) => {
  if (page == 0 && limit == 0) {
    return LoanTransactionLedger.find(data);
  } else {
    const response = await LoanTransactionLedger.find(data)
      .skip((page - 1) * limit)
      .limit(limit);
    let count = response.length;
    return {
      count: count,
      rows: response,
    };
  }
};

module.exports.findAllWithTxnDate = (loan_ids, type, status) => {
  return LoanTransactionLedger.find({
    loan_id: {
      $in: loan_ids,
    },
    type: type,
    invoice_status: status,
  });
};

module.exports.findAllWithCondition = (condition) => {
  return LoanTransactionLedger.find(condition);
};

module.exports.updateStatus = (invoice_id, invoice_status) => {
  return LoanTransactionLedger.findOneAndUpdate(
    {
      invoice_number: invoice_id,
    },
    {
      invoice_status: invoice_status,
      updated_at: Date.now,
    },
    {},
  );
};

module.exports.multipledeleteRecord = (id) => {
  return LoanTransactionLedger.deleteMany({
    _id: id,
  });
};

module.exports.updateInvoiceAndStatus = (data) => {
  return LoanTransactionLedger.findOneAndUpdate(
    {
      loan_id: data.loan_id,
    },
    {
      invoice_status: data.invoice_status,
      invoice_number: data.invoice_number,
    },
    {},
  );
};

module.exports.addTransactionFees = (loanSchema, txs) => {
  return new Promise((resolve, reject) => {
    var loans = underscoreLib.groupBy(txs, 'loan_id');
    var dues = 0;
    var rows = [];
    for (var k in loans) {
      var customerTxs = underscoreLib.sortBy(loans[k], 'created_at');
      if (loanSchema.conve_fee_amnt) {
        var row = customerTxs[0];
        var fee = {};
        var label = 'convfee';
        fee.txn_amount = parseFloat(loanSchema.conve_fee_amnt, 10);
        fee.label = 'Signup Fee';
        fee.txn_entry = 'fee';
        fee.txn_date = row.txn_date;
        fee.updated_at = row.updated_at;
        fee.loan_id = row.loan_id;
        fee.partner_loan_id = row.partner_loan_id;
        fee.ac_holder_name = row.ac_holder_name;
        fee.type = 'conv_fee';
        fee.invoice_status = 'pending';
        fee.txn_id = row.loan_id + label;
        fee.txn_id = fee.txn_id;
        rows.push(fee);
        dues += fee.txn_amount;
      }
      for (var i = 0; i < customerTxs.length; i++) {
        var row = customerTxs[i];
        row.txn_amount = parseFloat(row.txn_amount, 10);
        rows.push(row);
        switch (row.type) {
          case 'usage':
            if (row.txn_amount > 0 && loanSchema.interest_on_usage) {
              var fee = {};
              var label = 'usagefee';
              fee.txn_amount = loanSchema.interest_on_usage;
              fee.label = 'Usage Fee';
              fee.txn_entry = 'fee';
              fee.txn_date = row.txn_date;
              fee.updated_at = row.updated_at;
              fee.loan_id = row.loan_id;
              fee.partner_loan_id = row.partner_loan_id;
              fee.ac_holder_name = row.ac_holder_name;
              fee.type = 'usage_fee';
              fee.invoice_status = 'pending';
              fee.txn_id = row.txn_id + label;
              fee.txn_id = row.txn_id + label;
              rows.push(fee);
              dues += fee.txn_amount;
            }
            dues += row.txn_amount;
            break;
          case 'repayment':
            dues -= row.txn_amount;
            break;
          default: {
            dues += row.txn_amount;
          }
        }
      }
    }
    rows.push({
      txn_id: 'Outstanding',
      txn_amount: dues,
    });
    resolve(rows);
  });
};

module.exports.findOneTxnId = (txn_id) => {
  return LoanTransactionLedger.findOne({
    txn_id,
  });
};

module.exports.findUsageIdIfExists = (condition, callback) => {
  return LoanTransactionLedger.findOne(condition).sort({
    _id: -1,
  });
};

module.exports.updateStageByTxnId = (data, txn_stage) => {
  let counter = 0;
  data.forEach((row) => {
    LoanTransactionLedger.bulkWrite[
      {
        updateOne: {
          filter: {
            txn_id: row,
          },
          update: {
            txn_stage,
          },
        },
      }
    ].then((res) => {
      counter++;
      if (counter == data.length) return data;
    });
  });
};

module.exports.updateStageByTxnIdAndUtr = (
  data,
  txn_stage,
  utr,
  disburse_date,
  move_txn_date,
) => {
  let counter = 0;
  let txn_date =
    txn_stage === '06' ? moment(disburse_date).format('YYYY-MM-DD') : '';
  let dataObject =
    txn_stage === '06' && !move_txn_date
      ? {
          txn_stage: txn_stage,
          utr_number: utr,
          txn_date: txn_date,
        }
      : {
          txn_stage: txn_stage,
          utr_number: utr,
        };
  data.forEach((row) => {
    LoanTransactionLedger.bulkWrite[
      {
        updateOne: {
          filter: {
            txn_id: row,
          },
          update: dataObject,
        },
      }
    ].then((res) => {
      counter++;
      if (counter == data.length) return data;
    });
  });
};

module.exports.updateBulk = (data) => {
  let counter = 0;
  data.forEach((row) => {
    LoanTransactionLedger.bulkWrite[
      {
        updateOne: {
          filter: {
            loan_id: row.loan_id,
            txn_id: row.txn_id,
            txn_amount: row.txn_amount,
            txn_date: row.txn_date,
          },
          update: row,
        },
      }
    ].then((res) => {
      counter++;
      if (counter == data.length) return data;
    });
  });
};

module.exports.bulkUpdate = (condition, updateRecord) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      condition.forEach((row) => {
        return LoanTransactionLedger.findOneAndUpdate(row, updateRecord)
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

module.exports.getTotalUsageAndRepayment = (data) => {
  LoanTransactionLedger.findAll({
    attributes: [
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'dr') THEN txn_amount ELSE 0 END)`,
        ),
        'total_usage_amount',
      ],
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'cr') THEN txn_amount ELSE 0 END)`,
        ),
        'total_repayment_amount',
      ],
    ],
    where: data,
  })
    .then((response) => {
      return response;
    })
    .catch((err) => {
      return;
    });
};

module.exports.getrecordProductWise = (product_id, callback) => {
  LoanTransactionLedger.findAll({
    attributes: [
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'dr') THEN txn_amount ELSE 0 END)`,
        ),
        'total_usage_amount',
      ],
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'cr') THEN txn_amount ELSE 0 END)`,
        ),
        'total_repayment_amount',
      ],
    ],
    where: {
      product_id: product_id,
    },
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.getrecordProductAndMonthwise = (product_id, callback) => {
  LoanTransactionLedger.findAll({
    attributes: [
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'dr') THEN 1 ELSE 0 END)`,
        ),
        'total_usage_count',
      ],
      [
        Sequelize.literal(
          `SUM(CASE WHEN (txn_entry = 'dr') THEN txn_amount ELSE 0 END)`,
        ),
        'total_usage_amount',
      ],
    ],
    where: [
      sequelize.where(
        sequelize.fn('month', sequelize.col('txn_date')),
        '=',
        moment().subtract(1, 'days').format('MM'),
      ),
      sequelize.where(
        sequelize.fn('year', sequelize.col('txn_date')),
        '=',
        moment().subtract(1, 'days').format('YYYY'),
      ),
      sequelize.where(sequelize.col('product_id'), '=', product_id),
    ],
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.getByAllTxnIds = (txn_ids) => {
  return LoanTransactionLedger.find({
    txn_id: {
      $in: txn_ids,
    },
  }).select('loan_id initiated_date txn_date txn_id txn_amount');
};

module.exports.findKLIByIdsWithUtrNumber = (utr_number) => {
  return LoanTransactionLedger.find({
    utr_number,
    is_received: { $ne: 'rejected' },
  });
};

module.exports.findLIByIdsWithIsReccieved = (loan_id) => {
  return LoanTransactionLedger.find({
    loan_id,
    is_received: 'Y',
    processed: { $ne: 'Y' },
  });
};

module.exports.findAllByCompanyAndProduct = (
  company_id,
  product_id,
  record_method,
  txn_entry,
) => {
  return LoanTransactionLedger.find({
    company_id: company_id,
    product_id: product_id,
    record_method: record_method,
    txn_entry: txn_entry,
  });
};

module.exports.getFilteredRepaymentRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;
  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return LoanTransactionLedger.find({}).sort({
      _id: -1,
    });
  }
  query['$and'] = [];
  if (company_id && company_id !== '00') {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id && product_id !== 0) {
    query['$and'].push({
      product_id,
    });
  }
  if (
    from_date !== 'null' &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== '' &&
    from_date !== null
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    if (filter.isCreation)
      query['$and'].push({
        created_at: {
          $gte: date,
        },
      });
    else
      query['$and'].push({
        utr_date_time_stamp: {
          $gte: date,
        },
      });
  }
  if (
    to_date !== 'null' &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== '' &&
    to_date !== null
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    if (filter.isCreation)
      query['$and'].push({
        created_at: {
          $lte: date,
        },
      });
    else
      query['$and'].push({
        utr_date_time_stamp: {
          $lte: date,
        },
      });
  }

  query['$and'].push({
    txn_entry: 'cr',
  });

  return LoanTransactionLedger.find(query);
};

module.exports.findByLID = (loan_id) => {
  return LoanTransactionLedger.find({
    loan_id,
  });
};

module.exports.findByUtrNumber = (utr_number) => {
  return LoanTransactionLedger.findOne({ utr_number });
};

module.exports.fetchPendingTransactions = (loan_id) => {
  let query = {
    loan_id,
    txn_entry: 'dr',
    $or: [{ repay_status: 'pending' }, { repay_status: 'partially_paid' }],
  };
  return LoanTransactionLedger.find(query).sort({
    txn_date: 1,
  });
};

module.exports.updatePaidAmount = (loan_id, data) => {
  return LoanTransactionLedger.findOneAndUpdate({ loan_id }, data, {});
};

module.exports.getReceivedRepayments = (loan_id, txn_date) => {
  return LoanTransactionLedger.find({
    loan_id,
    txn_date,
    txn_entry: 'cr',
  });
};

module.exports.getRepaymentDueUsages = (loan_id, txn_date) => {
  return LoanTransactionLedger.find({
    loan_id,
    repayment_due_date: {
      $lt: txn_date,
    },
    txn_entry: 'dr',
    repay_status: { $ne: 'paid' },
  });
};

module.exports.getRepaymentRecords = (loan_id, txn_date) => {
  return LoanTransactionLedger.find({
    loan_id,
    txn_date: {
      $lt: txn_date,
    },
    txn_entry: 'cr',
  });
};

module.exports.findByLIDAndUsageId = (filter) => {
  const { loan_id, usage_id, txn_entry } = filter;
  return LoanTransactionLedger.findOne({
    loan_id,
    txn_entry,
    _id: usage_id,
  });
};

module.exports.getFilteredPendingRepayments = async (filter) => {
  var query = {};
  query['$and'] = [];
  var txn_amount_without_decimal = '';
  let txn_amount_one_zero = '';
  let txn_amount_two_zero = '';
  let txn_amount_three_zero = '';
  let txn_amount_four_zero = '';
  let txn_amount_five_zero = '';
  var {
    company_id,
    product_id,
    txn_entry,
    page,
    limit,
    txn_amount,
    txn_reference,
    utr_number,
  } = filter;
  if (txn_amount.includes('.')) {
    let txn_amount_parts = txn_amount.split('.');
    let after_decimal = txn_amount_parts[1].split('');
    for (let ele of after_decimal) {
      if (ele === '0') {
        txn_amount_without_decimal = txn_amount_parts[0];
        txn_amount_one_zero = txn_amount_without_decimal.concat('.0');
        txn_amount_two_zero = txn_amount_without_decimal.concat('.00');
        txn_amount_three_zero = txn_amount_without_decimal.concat('.000');
        txn_amount_four_zero = txn_amount_without_decimal.concat('.0000');
        txn_amount_five_zero = txn_amount_without_decimal.concat('.00000');
      } else {
        txn_amount_without_decimal = txn_amount;
        txn_amount_one_zero = '';
        txn_amount_two_zero = '';
        txn_amount_three_zero = '';
        txn_amount_four_zero = '';
        txn_amount_five_zero = '';
        break;
      }
    }
  } else {
    txn_amount_without_decimal = txn_amount;
    txn_amount_one_zero = txn_amount_without_decimal.concat('.0');
    txn_amount_two_zero = txn_amount_without_decimal.concat('.00');
    txn_amount_three_zero = txn_amount_without_decimal.concat('.000');
    txn_amount_four_zero = txn_amount_without_decimal.concat('.0000');
    txn_amount_five_zero = txn_amount_without_decimal.concat('.00000');
  }
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
  if (txn_entry) {
    query['$and'].push({
      txn_entry,
    });
  }
  if (txn_amount) {
    query['$and'].push({
      $or: [
        { txn_amount: txn_amount_without_decimal },
        { txn_amount: txn_amount_one_zero },
        { txn_amount: txn_amount_two_zero },
        { txn_amount: txn_amount_three_zero },
        { txn_amount: txn_amount_four_zero },
        { txn_amount: txn_amount_five_zero },
      ],
    });
  }
  if (txn_reference) {
    query['$and'].push({
      txn_reference,
    });
  }
  if (utr_number) {
    query['$and'].push({
      utr_number,
    });
  }
  if (filter.status === 'pending') {
    query['$and'].push({
      $or: [{ is_received: 'N' }, { is_received: '' }, { is_received: null }],
    });
  } else {
    query['$and'].push({
      is_received: filter.status,
    });
  }
  const count = await LoanTransactionLedger.find(query).count();
  const rows = await LoanTransactionLedger.find(query)
    .sort({ created_at: -1 })
    .skip(page * limit)
    .limit(limit);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.markRepaymentReceived = async (filter, data) => {
  let errors = [];
  let successRecords = [];
  for (const row of filter) {
    const obj = await LoanTransactionLedger.findOneAndUpdate(row, data);
    if (obj) {
      successRecords.push(obj);
    }
    if (!obj) {
      errors.push({
        _id: row._id,
        loan_id: row.loan_id,
      });
    }
  }
  return { errors, successRecords };
};

module.exports.makeRepaymentProcessed = async (filter, data) => {
  return await LoanTransactionLedger.findOneAndUpdate(filter, data);
};

module.exports.updateByTxnId = (txn_id, data) => {
  return LoanTransactionLedger.findOneAndUpdate(
    {
      txn_id,
    },
    data,
    { new: true },
  );
};

module.exports.findByUsageId = (usage_id) => {
  return LoanTransactionLedger.findOne({ _id: usage_id });
};

module.exports.findOpenWaiverRequest = (loan_id) => {
  return LoanTransactionLedger.find({
    loan_id,
    label: 'waiver',
    $or: [{ processed: null }],
  });
};
module.exports.getFilteredDisbursementRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;

  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return LoanTransactionLedger.find({}).sort({
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
      label: 'disbursement',
    });
  }
  if (status === 'fail') {
    query['$and'].push({
      txn_stage: '2',
      txn_entry: 'dr',
      label: 'disbursement',
    });
  }
  if (status === 'inprogress') {
    query['$and'].push({
      txn_stage: { $ne: '1' },
      txn_entry: 'dr',
      label: 'disbursement',
    });
  }
  if (!status) {
    query['$and'].push({
      txn_entry: 'dr',
      label: 'disbursement',
    });
  }
  return LoanTransactionLedger.find(query);
};
//
module.exports.getFilteredRefundRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;

  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return LoanTransactionLedger.find({}).sort({
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
      txn_stage: '2',
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
  return LoanTransactionLedger.find(query);
};
//
module.exports.findRecordExistsByLoanIdLabel = (loan_id, label) => {
  return LoanTransactionLedger.find({
    loan_id,
    label,
  });
};
module.exports.findByLoanIDLabel = (loan_id, label) => {
  return LoanTransactionLedger.findOne({
    loan_id,
    label,
  });
};

module.exports.findRepaymentByLoanIdAndUtr = (loan_id, utr_number) => {
  return LoanTransactionLedger.findOne(
    { loan_id, utr_number, label: 'repayment' },
    { _id: -1, utr_number: 1 },
  );
};
module.exports.findRefundByLoanIDLabel = (loan_id, label, is_received) => {
  return LoanTransactionLedger.findOne({
    loan_id,
    label,
    is_received,
  });
};

const { Int32 } = require('mongodb');
var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const PayoutDetailSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
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
    loan_app_id: {
      type: String,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    type: {
      type: String,
      allowNull: true,
      enum: ['tds_refund', 'interest_refund', 'excess_refund'],
    },
    amount: {
      type: String,
      allowNull: true,
    },
    reference_no: {
      type: String,
      allowNull: true,
    },
    certificate_number: {
      type: String,
      allowNull: true,
    },
    comment: {
      type: String,
      allowNull: true,
    },
    reference_year: {
      type: String,
      allowNull: false,
    },
    file_url: {
      type: String,
      allowNull: true,
    },
    status: {
      type: String,
      allowNull: true,
      enum: ['Open', 'Rejected', 'Processed', 'Failed', 'In_Progress'],
    },
    requestor_comment: {
      type: String,
      allowNull: true,
    },
    approver_comment: {
      type: String,
      allowNull: true,
    },
    txn_id: {
      type: String,
      allowNull: true,
    },
    webhook_data: {
      type: String,
      allowNull: true,
    },

    webhook_status: {
      type: String,
      allowNull: true,
    },
    webhook_status_code: {
      type: String,
      allowNull: true,
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
    bank_remark: {
      type: String,
      allowNull: true,
    },
    disbursement_date_time: {
      type: Date,
      allowNull: true,
    },
    loan_app_date: {
      type: Date,
      allowNull: true,
    },
    first_inst_date: {
      type: Date,
      allowNull: true,
    },
    final_approve_date: {
      type: Date,
      allowNull: true,
    },
    refund_days: {
      type: Number,
      allowNull: true,
    },
    disbursement_channel: {
      type: String,
      allowNull: true,
    },
    utrn_number: {
      type: String,
      allowNull: true,
    },
    txn_stage: {
      type: String,
      allowNull: true,
    },
    utr_date: {
      type: Date,
      allowNull: true,
    },
    requested_by: {
      type: String,
      allowNull: true,
    },
    refund_req_id: {
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
    partner_borrower_id: {
      type: String,
      allowNull: true,
    },
    txn_date: {
      type: Date,
      allowNull: false,
    },
    updated_by: {
      type: String,
      allowNull: true,
    },
    is_broken_interest : {
      type: Boolean,
      allowNull: true,
      default: false,
    },
    payment_details:{
      type:Array,
      allowNull:true
    }
  },
  {
    timestamps: true,
  },
);
autoIncrement.initialize(mongoose.connection);
PayoutDetailSchema.plugin(autoIncrement.plugin, 'id');
var payoutDetail = (module.exports = mongoose.model('payout_detail', PayoutDetailSchema, 'payout_detail'));
 
module.exports.getAll = () => {
  return payoutDetail.find({});
};
module.exports.findByConditionWithLimit = async (condition, page, limit) => {
  try {
    const skip = (page - 1) * limit;

    const rows = await payoutDetail.find(condition)
      .skip(skip)
      .limit(limit)
      .sort({createdAt: -1});

    const count = await payoutDetail.countDocuments(condition);

    return {
      rows,
      count,
    };
  } catch (error) {
    throw error; // Propagate the error for handling at a higher level
  }
};

module.exports.findByLoadIdAndUpdate = async (loan_id, data = {}) => {
  return await payoutDetail.updateOne({ loan_id }, { $set: data });
};

module.exports.findOneAndUpdate = async (filter, data = {}) => {
  return await payoutDetail.updateOne(
    filter,
    { $set: data }
  );
};

module.exports.findByCondition = async (condition) => {
  return await payoutDetail.findOne(condition);
};

module.exports.findOneByQuery = async(filter) => {
  return await payoutDetail.findOne(filter);
}
module.exports.updateData = async(txn_id, data) => {
  return await payoutDetail.findOneAndUpdate({ txn_id }, data,{ new: true });
};
module.exports.updateDataOnCondition = async(condition, data) => {
  return await payoutDetail.findOneAndUpdate(condition, data,{ new: true });
};
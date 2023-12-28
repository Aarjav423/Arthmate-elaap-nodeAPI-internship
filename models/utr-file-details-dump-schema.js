var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
mongoose.Promise = global.Promise;
var utrDetails = mongoose.Schema(
  {
    debit_account_no: {
      type: String,
      allowNull: true,
    },
    beneficiary_account_no: {
      type: String,
      allowNull: true,
    },
    beneficiary_name: {
      type: String,
      allowNull: true,
    },
    amount: {
      type: String,
      allowNull: true,
    },
    payment_mode: {
      type: String,
      allowNull: true,
    },
    date: {
      type: String,
      allowNull: true,
    },
    ifsc_code: {
      type: String,
      allowNull: true,
    },
    payable_location: {
      type: String,
      allowNull: true,
    },
    add_details_5: {
      type: String,
      allowNull: true,
    },
    payment_ref_no: {
      type: String,
      allowNull: true,
    },
    status: {
      type: String,
      allowNull: true,
    },
    liquidation_date: {
      type: String,
      allowNull: true,
    },
    customer_ref_no: {
      type: String,
      allowNull: true,
    },
    instrument_ref_no: {
      type: String,
      allowNull: true,
    },
    utr_no: {
      type: String,
      allowNull: true,
    },
    remarks: {
      type: String,
      allowNull: true,
    },
  },
  {
    _id: true,
  },
);
var cbiLoanDetails = mongoose.Schema(
  {
    loan_id: {
      type: String,
      allowNull: true,
    },
    status: {
      type: String,
      allowNull: true,
    },
  },
  {
    _id: true,
  },
);
var bankFileDetailsDump = mongoose.Schema({
  id: {
    type: ObjectId,
    allowNull: true,
    autoIncrement: true,
    primaryKey: true,
  },
  file_type: {
    type: Number,
    allowNull: true,
  },
  file_name: {
    type: String,
    allowNull: true,
  },
  co_lender_shortcode: {
    type: String,
    allowNull: true,
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  product: {
    type: String,
    allowNull: true,
  },
  total_records: {
    type: Number,
    allowNull: true,
  },
  total_success_records: {
    type: Number,
    allowNull: true,
  },
  total_failure_records: {
    type: Number,
    allowNull: true,
  },
  utr_details: {
    type: [utrDetails],
    allowNull: true,
  },
  cbi_loan_details: {
    type: [cbiLoanDetails],
    allowNull: true,
  },
  validation_status: {
    type: Number,
    allowNull: true,
  },
  rejection_remarks: {
    type: String,
    allowNull: true,
  },
  s3_url: {
    type: String,
    allowNull: true,
  },
  is_approved: {
    type: Boolean,
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
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
});
var UtrFileDetailsDump = (module.exports = mongoose.model(
  'bank_file_details_dump',
  bankFileDetailsDump,
));

module.exports.findByColenderData = (data) => {
  return UtrFileDetailsDump.find(data);
};

module.exports.getPaginatedData = async (page, limit) => {
  const reports = await UtrFileDetailsDump.find().sort({
    created_at: -1,
  });
  const count = await UtrFileDetailsDump.count();
  const reportResp = {
    rows: reports,
    count,
  };
  return reportResp;
};

module.exports.findAll = (data) => {
  return UtrFileDetailsDump.find(data).sort({ created_at: -1 });
};

module.exports.updateByLID = (id, data) => {
  return UtrFileDetailsDump.findOneAndUpdate({ _id: id }, data);
};

module.exports.findIfExistById = (id) => {
  return UtrFileDetailsDump.findOne({ _id: id });
};

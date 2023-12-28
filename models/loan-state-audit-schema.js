var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LoanStateAuditSchema = mongoose.Schema({
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
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  due_date: {
    type: Date,
    allowNull: true,
  },
  intsalment_num: {
    type: Number,
    allowNull: true,
  },
  amount_due: {
    type: String,
    allowNull: true,
  },
  prin_due: {
    type: String,
    allowNull: true,
  },
  int_due: {
    type: String,
    allowNull: true,
  },
  prin_overdue: {
    type: String,
    allowNull: true,
  },
  int_overdue: {
    type: String,
    allowNull: true,
  },
  dpd: {
    type: Number,
    allowNull: true,
  },
  lpi_due: {
    type: String,
    allowNull: true,
  },
  charges_due: {
    type: String,
    allowNull: true,
  },
  gst_due: {
    type: String,
    allowNull: true,
  },
  amount_paid: {
    type: String,
    allowNull: true,
  },
  prin_paid: {
    type: String,
    allowNull: true,
  },
  int_paid: {
    type: String,
    allowNull: true,
  },
  lpi_paid: {
    type: String,
    allowNull: true,
  },
  charges_paid: {
    type: String,
    allowNull: true,
  },
  gst_paid: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  paid_date: {
    type: Date,
    allowNull: true,
  },
  payments: {
    type: Array,
    allowNull: true,
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
  created_by: {
    type: String,
    allowNull: true,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
  waiver: [
    {
      sr_req_id: {
        type: String,
        allowNull: true,
      },
      lpi_waived: {
        type: Number,
        allowNull: true,
      },
      interest_waived: {
        type: Number,
        allowNull: true,
      },
      prin_waived: {
        type: Number,
        allowNull: true,
      },
      waiver_date: {
        type: Date,
        allowNull: true,
      },
    },
  ],
});

var LoanStateAudit = (module.exports = mongoose.model(
  'loan_state_audit',
  LoanStateAuditSchema,
  'loan_state_audit',
));

module.exports.getAll = () => {
  return LoanStateAudit.find({});
};

module.exports.findByCondition = (condition) => {
  return LoanStateAudit.findOne(condition);
};

module.exports.getByLoanIds = (loanIds) => {
  return loanIds.length > 1
    ? LoanStateAudit.find({ loan_id: { $in: loanIds } })
    : LoanStateAudit.find({ loan_id: loanIds[0] });
};
module.exports.findByLIDAndUsageId = (filter) => {
  const { loan_id, usage_id } = filter;
  return LoanStateAudit.findOne({
    loan_id,
    usage_id,
  });
};

module.exports.findByLID = (loan_id) => {
  return LoanStateAudit.find({ loan_id }).sort({
    intsalment_num: -1,
  });
};

module.exports.getFilteredLoanStateAuditResp = (filter) => {
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
  return LoanStateAudit.find(query);
};

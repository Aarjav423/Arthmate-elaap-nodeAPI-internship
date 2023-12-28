var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const InsuranceMisSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    master_policy_number: {
      type: String,
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
    company_id: {
      type: Number,
      allowNull: false,
    },
    company_name: {
      type: String,
      allowNull: false,
    },
    product_name: {
      type: String,
      allowNull: false,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    external_reference_number: {
      type: String,
      allowNull: true,
    },
    product_key: {
      type: String,
      allowNull: true,
    },
    policy_number: {
      type: String,
      allowNull: true,
    },
    policy_status: {
      type: String,
      allowNull: true,
    },
    insurance_provider: {
      type: String,
      allowNull: true,
    },
    policy_start_date: {
      type: Date,
      allowNull: true,
    },
    policy_end_date: {
      type: Date,
      allowNull: true,
    },
    policy_premium: {
      type: Number,
      allowNull: true,
    },
    net_premium: {
      type: Number,
      allowNull: true,
    },
    cgst: {
      type: Number,
      allowNull: true,
    },
    sgst: {
      type: Number,
      allowNull: true,
    },
    igst: {
      type: Number,
      allowNull: true,
    },
    schedule_path: {
      type: String,
      allowNull: true,
    },
    policy_issuance_date: {
      type: Date,
      allowNull: true,
    },
    gst_on_premium: {
      type: Number,
      allowNull: true,
    },
    total_policy_premium_at_base_pricing: {
      type: Number,
      allowNull: true,
    },
    gst_on_premium_at_base_pricing: {
      type: Number,
      allowNull: true,
    },
    net_policy_premium_at_base_pricing: {
      type: Number,
      allowNull: true,
    },
    issue_policy_s3_url: {
      type: String,
      allowNull: true,
    },
    policy_details_s3_url: {
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
InsuranceMisSchema.plugin(autoIncrement.plugin, 'id');
var InsuranceMis = (module.exports = mongoose.model(
  'insurance_mis_data',
  InsuranceMisSchema,
  'insurance_mis_data',
));

module.exports.addNew = (data) => {
  const insertdata = new InsuranceMis(data);
  return insertdata.save();
};

module.exports.getAll = () => {
  return InsuranceMis.find({});
};

module.exports.findByLIDAndPolicyNumber = (loan_id, policy_number) => {
  return InsuranceMis.findOne({
    loan_id,
    policy_number,
  });
};

module.exports.findByLoanId = (loan_id) => {
  return InsuranceMis.findOne({ loan_id });
};

module.exports.updateByLID = (loan_id, data) => {
  return InsuranceMis.findOneAndUpdate({ loan_id }, data, {});
};

module.exports.getFilteredInsuranceMisResp = (filter) => {
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
      policy_issuance_date: {
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
      policy_issuance_date: {
        $lte: date,
      },
    });
  }
  return InsuranceMis.find(query);
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const CoLenders = mongoose.Schema(
  {
    co_lender_id: {
      type: Number,
      allowNull: false,
    },
    co_lender_shortcode: {
      type: String,
      allowNull: false,
    },
  },
  { _id: false },
);

const ValidationChecks = mongoose.Schema(
  {
    code: {
      type: String,
      allowNull: true,
    },
    details: {
      type: String,
      allowNull: true,
    },
    validation_id: {
      type: Number,
      allowNull: true,
    },
  },
  { _id: false },
);

const ProductSchema = mongoose.Schema({
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
  loan_key: {
    type: String,
    allowNull: true,
    uppercase: true,
  },
  schema_code: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: Number,
    allowNull: true,
  },
  lender_id: {
    type: Number,
    allowNull: true,
  },
  lender_name: {
    type: String,
    allowNull: true,
  },
  bureau_partner_id: {
    type: Number,
    allowNull: true,
  },
  bureau_partner_name: {
    type: String,
    enum: ['CRIF', 'CIBIL', 'EXPERIAN'],
    allowNull: true,
  },
  lender_code: {
    type: String,
    allowNull: true,
  },
  loan_schema_id: {
    type: String,
    allowNull: true,
  },
  credit_rule_grid_id: {
    type: Number,
    allowNull: true,
    default: null,
  },
  name: {
    type: String,
    allowNull: true,
    default: '',
  },
  paytm_wallet_id: {
    type: String,
    allowNull: true,
    default: '',
  },
  razorpay_account_number: {
    type: String,
    allowNull: true,
  },
  product_app: {
    type: Number,
    allowNull: false,
    default: 0,
  },
  product_type_name: {
    type: String,
    allowNull: true,
  },
  product_type_code: {
    type: String,
    allowNull: true,
  },
  android_links: {
    type: String,
    allowNull: false,
  },
  ios_links: {
    type: String,
    allowNull: true,
  },
  other_links: {
    type: String,
    allowNull: true,
  },
  automatic_check_credit: {
    type: Number,
    default: 0,
    allowNull: false,
  },
  disburse_first_approach: {
    type: Number,
    default: 0,
    allowNull: false,
  },
  multiple_disbursment_allowed: {
    type: Number,
    default: 0,
    allowNull: false,
  },
  multiple_record_count: {
    type: Number,
    default: 1,
    allowNull: false,
  },
  inline_cl_balance: {
    type: Number,
    default: 0,
  },
  block_historical_usage: {
    type: Number,
    default: 0,
  },
  other_disbursal_account: {
    type: Number,
    default: 0,
  },
  is_monthly_billing_date_fixed: {
    type: String,
    default: 'false',
  },
  monthly_billing_cycle_day: {
    type: Number,
    default: 0,
  },
  status: {
    type: Number,
    allowNull: false,
    default: 0,
  },
  allowMiscDocAfterDisbursal: {
    type: Number,
    default: 0,
  },
  partner_disbursement_interest: {
    type: String,
    allowNull: true,
  },
  upfront_interest_days: {
    type: String,
    allowNull: true,
  },
  partner_dpd_interest: {
    type: String,
    allowNull: true,
  },
  partner_dpd_days: {
    type: String,
    allowNull: true,
  },
  partner_repayment_tenure: {
    type: String,
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
  paytm_payment_link_sub_wallet_id: {
    type: String,
    allowNull: true,
  },
  other_bank_details_allow_flag: {
    type: Number,
    default: 0,
  },
  va_num: {
    type: String,
    allowNull: true,
  },
  fees: {
    type: String,
    allowNull: true,
  },
  subvention_fees: {
    type: String,
    allowNull: true,
  },
  processing_fees: {
    type: String,
    allowNull: true,
  },
  line_pf: {
    type: String,
    default: null,
  },
  usage_fee: {
    type: String,
    allowNull: true,
  },
  upfront_interest: {
    type: String,
    allowNull: true,
  },
  int_value: {
    type: String,
    allowNull: true,
  },
  interest_free_days: {
    type: String,
    allowNull: true,
  },
  co_lenders: {
    type: [CoLenders],
    allowNull: true,
  },
  validations: {
    type: [ValidationChecks],
    allowNull: true,
  },
  days_in_year: {
    type: Number,
    allowNull: true,
  },
  exclude_interest_till_grace_period: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  tenure_in_days: {
    type: String,
    allowNull: true,
  },
  grace_period: {
    type: String,
    allowNull: true,
  },
  overdue_charges_per_day: {
    type: String,
    allowNull: true,
  },
  penal_interest: {
    type: String,
    allowNull: true,
    default: 0,
  },
  overdue_days: {
    type: String,
    allowNull: true,
  },
  penal_interest_days: {
    type: String,
    allowNull: true,
  },
  data_recallibration_status: {
    type: String,
    allowNull: true,
    default: 'inactive',
  },
  check_mandatory_docs: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  move_txn_date: {
    type: Number,
    allowNull: true,
    default: 1,
  },
  check_nach_registration: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  //newly added fields
  gst_on_pf_perc: {
    type: String,
    allowNull: true,
  },
  cgst_on_pf_perc: {
    type: String,
    allowNull: true,
  },
  sgst_on_pf_perc: {
    type: String,
    allowNull: true,
  },
  igst_on_pf_perc: {
    type: String,
    allowNull: true,
  },
  max_loan_amount: {
    type: String,
    allowNull: true,
  },
  loan_tenure_type: {
    type: String,
    allowNull: true,
  },
  aadhaar_type: {
    type: String,
    allowNull: true,
  },
  pan_type: {
    type: String,
    allowNull: true,
  },

  loan_tenure: {
    type: String,
    allowNull: true,
  },
  interest_rate_type: {
    type: String,
    allowNull: true,
  },
  workday_weeek: {
    type: String,
    allowNull: true,
  },
  repayment_schedule: {
    type: String,
    allowNull: true,
  },
  broken_interest_rate: {
    type: String,
    allowNull: true,
  },
  default_loan_status: {
    type: String,
    allowNull: true,
    default: '',
  },
  cancellation_period: {
    type: Number,
    allowNull: true,
  },
  //flags in product
  calculate_broken_interest: {
    type: Number,
    default: 0,
  },
  convenience_fees: {
    type: Number,
    default: 0,
  },
  insurance_charges: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  stamp_charges: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  application_fee: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  min_loan_amount: {
    type: Number,
    allowNull: true,
  },
  subvention_based: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  advance_emi: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  exclude_holiday_from_due_date: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  calculateGstForProduct: {
    type: Number,
    default: 0,
  },
  enhanced_review_required: {
    type: Number,
    default: 0,
  },
  ckyc_search: {
    type: Number,
    default: 0,
  },
  bureau_check: {
    type: Number,
    default: 0,
  },
  bureau_parser: {
    type: Number,
    default: 0,
  },
  allow_sub_loans: {
    type: Number,
    default: 0,
  },
  allow_loc: {
    type: Number,
    default: 0,
  },
  interest_type: {
    type: String,
    enum: ['upfront', 'rearended'],
    allowNull: true,
  },
  repayment_days: {
    type: Number,
    allowNull: true,
  },
  is_lender_selector_flag: {
    type: String,
    allowNull: true,
  },
  bounce_charges: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  lock_in_period: {
    type: Number,
    allowNull: true,
  },
  foreclosure_charge: {
    type: String,
    allowNull: true,
  },
  foreclosure: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  a_score: {
    type: Number,
    allowNull: true,
  },
  b_score: {
    type: Number,
    allowNull: true,
  },
  force_usage_convert_to_emi: {
    type: Number,
    allowNull: true,
  },
  maximum_number_of_emi: {
    type: Number,
    allowNull: true,
  },
  repayment_type: {
    type: String,
    allowNull: true,
    enum: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Yearly', 'Bullet'],
  },
  allow_aadhaar: {
    type: String,
    allowNull: true,
  },
  party_type: {
    type: String,
    allowNull: true,
    enum: ['Individual', 'Legal Entity', 'Non Individual'],
  },
  fc_offer_days: {
    type: Number,
    allowNull: true,
    enum: [1, 2, 3, 4],
  },
  downpayment: {
    type: Number,
    allowNull: true,
  },
  aadhaar_type: {
    type: String,
    allowNull: true,
  },
  pan_type: {
    type: String,
    allowNull: true,
  },
  recon_type: {
    type: String,
    allowNull: true,
  },
  beneficiary_bank_source: {
    type: String,
    allowNull: true,
  },
  cash_collateral: {
    type: Boolean,
    default: 0,
  },
  withhold_amount: {
    type: String,
    allowNull: true,
  },
  penny_drop: {
    type: Number,
    allowNull: true,
  },
  e_nach: {
    type: Boolean,
    default: false,
    allowNull: true,
  },
  bureau_co_applicant: {
    type: Number,
    default: 0,
    allowNull: true,
  },
  first_installment_date: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  vintage: {
    type: Number,
    allowNull: true,
    default: 1,
  },
  is_msme_automation_flag: {
    type: String,
    allowNull: true,
  },
  asset_classification_policy: {
    type: String,
    enum: ['Non-CL', 'CL'],
    default: 'CL',
  },
});
autoIncrement.initialize(mongoose.connection);
ProductSchema.plugin(autoIncrement.plugin, 'id');
var Product = (module.exports = mongoose.model('product', ProductSchema));
module.exports.getAll = () => {
  return Product.find({ status: 1 });
};

module.exports.getAllExisting = () => {
  return Product.find({});
};
module.exports.addNew = (productData) => {
  return Product.create(productData);
};
module.exports.findAllActive = () => {
  return Product.find({
    status: 1,
  });
};
module.exports.findByCompanyId = (company_id) => {
  return Product.find({
    company_id: company_id,
  });
};
module.exports.findIfExists = (name, loan_schema_id) => {
  return Product.findOne({
    $or: [
      {
        name: name,
      },
      {
        loan_schema_id: loan_schema_id,
      },
    ],
  });
};

module.exports.findIfExistsByName = (name) => {
  return Product.findOne({
    $or: {
      name: name,
    },
  });
};
module.exports.findById = (id) => {
  return Product.findOne({
    _id: id,
  });
};
module.exports.findByName = (name) => {
  return Product.findOne({
    name: name,
  });
};
module.exports.findProductId = (id) => {
  return Product.findOne({
    _id: id,
  });
};
module.exports.findProductById = (data) => {
  return Product.findOne({
    _id: data._id,
    company_id: data.company_id,
  });
};
module.exports.findProductByVaNum = (va_num) => {
  return Product.findOne({
    va_num: va_num,
  });
};
module.exports.findProductSchemaId = (product_id) => {
  return Product.findOne({
    _id: product_id,
  });
};
module.exports.updateStatus = (id, status) => {
  const query = {
    _id: id,
  };
  return Product.findOneAndUpdate(
    query,
    {
      status: status,
    },
    {},
  );
};
module.exports.updatePaytmWalletId = (id, paytm_wallet_id) => {
  const query = {
    _id: id,
  };
  return Product.findOneAndUpdate(
    query,
    {
      paytm_wallet_id: paytm_wallet_id,
    },
    {},
  );
};
module.exports.updateRPaccountno = (id, razorpay_account_number) => {
  const query = {
    _id: id,
  };
  return Product.findOneAndUpdate(
    query,
    {
      razorpay_account_number: razorpay_account_number,
    },
    {},
  );
};
module.exports.updateData = (updateData, whereCondition) => {
  return Product.findOneAndUpdate(whereCondition, updateData, {});
};
module.exports.getProductCount = () => {
  return Product.find({}).count();
};
module.exports.bulkProductUpdate = (data, callback) => {
  let counter = 0;
  data.forEach((row) => {
    Product.findOneAndUpdate(
      {
        _id: row.id,
      },
      row,
      {},
    )
      .then((result) => {
        counter++;
        if (counter == data.length) return callback(null, data);
      })
      .catch((error) => {
        return callback(error, null);
      });
  });
};
module.exports.findByVaNumber = (company_id) => {
  return Product.find({
    company_id: {
      $in: company_id,
    },
  }).select('va_num');
};
module.exports.findByPIds = (product_array) => {
  return Product.find({
    _id: {
      $in: product_array,
    },
  });
};
module.exports.findByProductIds = (product_id) => {
  return Product.find({
    _id: {
      $in: product_id,
    },
  }).select('id', 'name', 'multiple_disbursment_allowed');
};
module.exports.findOneWithCompanyAndProductId = (data) => {
  return Product.findOne({
    $and: [
      {
        company_id: data.company_id,
      },
      {
        _id: data.product_id,
      },
      {
        loan_schema_id: data.loan_schema_id,
      },
    ],
  });
};
module.exports.findByCondition = (condition) => {
  return Product.findOne(condition);
};
module.exports.findAllByLoanSchemaIds = (ids) => {
  return Product.find({
    loan_schema_id: {
      $in: ids,
    },
  });
};
module.exports.findByColenders = (co_lender_id) => {
  return Product.find({
    co_lenders: {
      $elemMatch: {
        co_lender_id: Number(co_lender_id),
      },
    },
  });
};

module.exports.findKLIByIds = (ids) => {
  return Product.find({
    _id:
      ids.length == 1
        ? ids[0]
        : {
            $in: ids,
          },
  });
};

module.exports.getAllLocProduct = () => {
  return Product.find({ allow_loc: 1 }).distinct('company_id');
};
module.exports.getAllMsmeProductsGlobally = () => {
  return Product.find({ is_msme_automation_flag: 'Y', status: 1 }, '_id');
};

module.exports.getAllMsmeProduct = () => {
  return Product.find({ is_msme_automation_flag: 'Y', status: 1 }).distinct('company_id');
};

module.exports.findByLocCompanyId = (company_id) => {
  return Product.find({
    company_id: company_id,
    allow_loc: 1,
  });
};

//msme product list
module.exports.findByMsmeCompanyId = (company_id) => {
  return Product.find({
    company_id: company_id,
    is_msme_automation_flag: 'Y',
    status: 1
  });
};

module.exports.findByProductName = (name) => {
  return Product.findOne({
    name: name,
  });
};

module.exports.findByProductIds = (id) => {
  return Product.findById(id, 'name');
};

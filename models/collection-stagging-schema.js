const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const CollectionStaggingSchema = mongoose.Schema(
  {
    id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    lms_id: {
      type: String,
      allowNull: false,
    },
    partner_loan_app_id: {
      type: String,
      allowNull: false,
    },
    partner_borrower_id: {
      type: String,
      allowNull: false,
    },
    first_name: {
      type: String,
      allowNull: true,
    },
    middle_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    last_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    father_fname: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    sector: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    type_of_addr: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    resi_addr_ln1: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    resi_addr_ln2: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    city: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    state: {
      type: String,
      allowNull: false,
      default: undefined,
    },
    pincode: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    per_addr_ln1: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    per_addr_ln2: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    per_city: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    per_state: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    per_pincode: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    appl_phone: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    gender: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    loan_app_id: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    partner_loan_id: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    marital_status: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    father_or_spouse_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_address: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_mobile_no: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_pan: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_aadhaar_no: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref1_relation_with_borrower: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref2_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref2_address: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref2_mobile_no: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    ref2_relation_with_borrower: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    residence_vintage: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    employer_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    vintage_current_employer: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    downpayment_amount: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    sanction_amount: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    insurance_amount: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    advance_emi: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    tenure: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    first_inst_date: {
      type: Date,
      allowNull: true,
      default: undefined,
    },
    emi_amount: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    overdue_charges_per_day: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    business_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    business_address: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    business_city: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    business_state: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    business_pin_code: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    business_address_ownership: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_address: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_mobile_no: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_or_guar_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_or_guar_address: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_or_guar_mobile_no: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_or_guar_dob: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    co_app_or_guar_gender: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    relation_with_applicant: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    dealer_name: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    dealer_email: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    overdue_days: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    current_int_due: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    current_prin_due: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    current_lpi_due: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_outstanding: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    charge_amount: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    gst: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_amount_paid: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_amount_waived: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_gst_paid: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_gst_reveresed: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    total_charges: {
      type: Number,
      allowNull: true,
      default: undefined,
    },
    residence_status: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    record_status: {
      type: String,
      allowNull: true,
      default: undefined,
    },
    upi_handle: {
      type: String,
      allowNull: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

const CollectionStaggingDetails = (module.exports = mongoose.model(
  'coll_stagging_detail',
  CollectionStaggingSchema,
));

module.exports.save = (collectionDetails) => {
  return CollectionStaggingDetails.create(collectionDetails);
};

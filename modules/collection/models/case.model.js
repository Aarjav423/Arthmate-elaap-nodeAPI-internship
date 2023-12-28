const mongoose = require("mongoose");
const { toJSON, paginate, aggregatePaginate } = require("./plugins");
const { statusTypes, depositionStatusTypes } = require("../config/collection");

const refsSchema = new mongoose.Schema({}, { _id: false, strict: false });

const coappSchema = new mongoose.Schema({}, { _id: false, strict: false });

const caseSchema = mongoose.Schema(
  {
    lms_id: {
      type: String,
      required: true,
      trim: true,
    },
    partner_loan_app_id: {
      type: String,
      required: true,
      trim: true,
    },
    partner_borrower_id: {
      type: String,
      required: true,
      trim: true,
    },
    coll_id: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        statusTypes.OPEN,
        statusTypes.CLOSED,
        statusTypes.PARTIALLY_PAID,
        statusTypes.ONGOING,
      ],
      required: true,
    },
    deposition_status: {
      type: String,
      enum: [
        depositionStatusTypes.ADDRESS_NOT_FOUND,
        depositionStatusTypes.BROKEN_PTP,
        depositionStatusTypes.DISPUTE,
        depositionStatusTypes.PTP,
        depositionStatusTypes.SETTLEMENT,
        depositionStatusTypes.SHIFTED,
        depositionStatusTypes.RTP,
        depositionStatusTypes.VISIT_PENDING,
        depositionStatusTypes.VISIT_SCHEDULED,
      ],
      trim: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    middle_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      required: true,
    },
    type_of_addr: {
      type: String,
      required: true,
      trim: true,
    },
    resi_addr_ln1: {
      type: String,
      required: true,
    },
    resi_addr_ln2: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    per_addr_ln1: {
      type: String,
      required: true,
    },
    per_addr_ln2: {
      type: String,
      required: true,
    },
    per_city: {
      type: String,
      required: true,
    },
    per_state: {
      type: String,
      required: true,
    },
    per_pincode: {
      type: String,
      required: true,
      trim: true,
    },
    appl_phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["M", "F", "O"],
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    loan_app_id: {
      type: String,
      required: true,
      trim: true,
    },
    partner_loan_id: {
      type: String,
      required: true,
      trim: true,
    },
    marital_status: {
      type: String,
      required: true,
      trim: true,
    },
    father_or_spouse_name: {
      type: String,
      required: true,
    },
    refs: {
      type: [refsSchema],
      required: true,
    },
    residence_vintage: {
      type: String,
      required: true,
    },
    employer_name: {
      type: String,
      required: true,
    },
    vintage_current_employer: {
      type: String,
      required: true,
    },
    downpayment_amount: {
      type: String,
      required: true,
      trim: true,
    },
    sanction_amount: {
      type: String,
      required: true,
      trim: true,
    },
    insurance_amount: {
      type: String,
      required: true,
      trim: true,
    },
    advance_emi: {
      type: String,
      required: true,
      trim: true,
    },
    tenure: {
      type: Number,
      required: true,
    },
    first_inst_date: {
      type: Date,
      required: true,
    },
    emi_amount: {
      type: String,
      required: true,
      trim: true,
    },
    overdue_charges_per_day: {
      type: String,
      required: true,
      trim: true,
    },
    business_name: {
      type: String,
      required: true,
    },
    business_address: {
      type: String,
      required: true,
    },
    business_city: {
      type: String,
      required: true,
    },
    business_state: {
      type: String,
      required: true,
    },
    business_pin_code: {
      type: String,
      required: true,
      trim: true,
    },
    business_address_ownership: {
      type: String,
      required: true,
    },
    coapp: {
      type: coappSchema,
      required: true,
    },
    dealer_name: {
      type: String,
      required: true,
    },
    dealer_email: {
      type: String,
      required: true,
    },
    overdue_days: {
      type: Number,
      required: true,
    },
    current_int_due: {
      type: String,
      required: true,
      trim: true,
    },
    current_prin_due: {
      type: String,
      required: true,
      trim: true,
    },
    current_lpi_due: {
      type: String,
      required: true,
      trim: true,
    },
    total_outstanding: {
      type: String,
      required: true,
      trim: true,
    },
    charge_amount: {
      type: String,
      required: true,
      trim: true,
    },
    gst: {
      type: String,
      required: true,
      trim: true,
    },
    total_amount_paid: {
      type: String,
      required: true,
      trim: true,
    },
    total_amount_waived: {
      type: String,
      required: true,
      trim: true,
    },
    total_gst_paid: {
      type: String,
      required: true,
      trim: true,
    },
    total_gst_reveresed: {
      type: String,
      required: true,
      trim: true,
    },
    total_charges: {
      type: String,
      required: true,
      trim: true,
    },
    assigned_to: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "coll_users",
      required: false,
    },
    assigned_at: {
      type: Date,
      required: false,
    },
    company_code: {
      type: String,
      trim: true,
    },
    company_id: {
      type: Number,
      trim: true,
    },
    company_name: {
      type: String,
      trim: true,
    },
    scheduled_at: {
      type: Date,
      required: false,
    },
    slot_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "coll_time_slots",
      required: false,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

caseSchema.plugin(toJSON);
caseSchema.plugin(paginate);
caseSchema.plugin(aggregatePaginate);

/**
 * @typedef Case
 *  */
const Case = mongoose.model("coll_details", caseSchema);

module.exports = Case;

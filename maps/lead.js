const mongoose = require('mongoose');
const { PurposeOfLoan } = require('../modules/msme/constants/lead.constant');

const EntitySchema = mongoose.Schema({
  entity_type: {
    type: String,
    allowNull: true,
  },
  entity_name: {
    type: String,
    allowNull: true,
  },
  date_of_incorporation: {
    type: String,
    allowNull: true,
  },
  com_addr_ln1: {
    type: String,
    allowNull: true,
  },
  com_addr_ln2: {
    type: String,
    allowNull: true,
  },
  com_city: {
    type: String,
    allowNull: true,
  },
  com_state: {
    type: String,
    allowNull: true,
  },
  com_pincode: {
    type: String,
    allowNull: true,
  },
  address_same: {
    type: Number,
    default: 0,
  },
  res_addr_ln1: {
    type: String,
    allowNull: true,
  },
  res_addr_ln2: {
    type: String,
    allowNull: true,
  },
  res_city: {
    type: String,
    allowNull: true,
  },
  res_state: {
    type: String,
    allowNull: true,
  },
  res_pincode: {
    type: String,
    allowNull: true,
  },
  pan_no: {
    type: String,
    allowNull: true,
  },
  urc_no: {
    type: String,
    allowNull: true,
  },
  cin_no: {
    type: String,
    allowNull: true,
  },
  gst_no: {
    type: String,
    allowNull: true,
  },
  udyam_vintage_flag: {
    type: String,
    allowNull: true,
  },
  udyam_vintage: {
    type: String,
    allowNull: true,
  },
  udyam_hit_count: {
    type: Number,
    allowNull: true,
  },
  gst_vintage_flag: {
    type: String,
    allowNull: true,
  },
  gst_vintage: {
    type: String,
    allowNull: true,
  },
});
const CoBorrowerSchema = mongoose.Schema({
  sequence_no: {
    type: Number,
    allowNull: true,
  },
  borrower_id: {
    type: String,
    allowNull: true,
  },
  cb_fname: {
    type: String,
    allowNull: true,
  },
  cb_mname: {
    type: String,
    allowNull: true,
  },
  cb_lname: {
    type: String,
    allowNull: true,
  },
  cb_dob: {
    type: String,
    allowNull: false,
  },
  cb_gender: {
    type: String,
    allowNull: true,
    enum: ['Male', 'Female', 'Others'],
  },
  cb_mobile: {
    type: String,
    allowNull: true,
  },
  cb_email: {
    type: String,
    allowNull: true,
  },
  cb_father_name: {
    type: String,
    allowNull: true,
  },
  cb_resi_addr_ln1: {
    type: String,
    allowNull: true,
  },
  cb_resi_addr_ln2: {
    type: String,
    allowNull: true,
  },
  cb_phone: {
    type: String,
    allowNull: true,
  },
  cb_city: {
    type: String,
    allowNull: true,
  },
  cb_state: {
    type: String,
    allowNull: true,
  },
  cb_pincode: {
    type: Number,
    allowNull: true,
  },
  address_same: {
    type: Number,
    default: 0,
  },
  cb_per_addr_ln1: {
    type: String,
    allowNull: true,
  },
  cb_per_addr_ln2: {
    type: String,
    allowNull: true,
  },
  cb_per_city: {
    type: String,
    allowNull: true,
  },
  cb_per_state: {
    type: String,
    allowNull: true,
  },
  cb_per_pincode: {
    type: Number,
    allowNull: true,
  },
  cb_monthly_income: {
    type: Number,
    allowNull: true,
  },
  cb_pan: {
    type: String,
    allowNull: true,
  },
  cb_aadhaar: {
    type: String,
    allowNull: true,
  },
  cb_aadhaar_hash: {
    type: String,
    allowNull: true,
  },
});
const GuarantorSchema = mongoose.Schema({
  sequence_no: {
    type: Number,
    allowNull: true,
  },
  borrower_id: {
    type: String,
    allowNull: true,
  },
  gua_fname: {
    type: String,
    allowNull: true,
  },
  gua_mname: {
    type: String,
    allowNull: true,
  },
  gua_lname: {
    type: String,
    allowNull: true,
  },
  gua_dob: {
    type: String,
    allowNull: true,
  },
  gua_gender: {
    type: String,
    allowNull: true,
    enum: ['Male', 'Female', 'Others'],
  },
  gua_mobile: {
    type: String,
    allowNull: true,
  },
  gua_email: {
    type: String,
    allowNull: true,
  },
  gua_father_name: {
    type: String,
    allowNull: true,
  },
  gua_resi_addr_ln1: {
    type: String,
    allowNull: true,
  },
  gua_resi_addr_ln2: {
    type: String,
    allowNull: true,
  },
  gua_city: {
    type: String,
    allowNull: true,
  },
  gua_state: {
    type: String,
    allowNull: true,
  },
  gua_pincode: {
    type: String,
    allowNull: true,
  },
  address_same: {
    type: Number,
    default: 0,
  },
  gua_per_addr_ln1: {
    type: String,
    allowNull: true,
  },
  gua_per_addr_ln2: {
    type: String,
    allowNull: true,
  },
  gua_per_city: {
    type: String,
    allowNull: true,
  },
  gua_per_state: {
    type: String,
    allowNull: true,
  },
  gua_per_pincode: {
    type: String,
    allowNull: true,
  },
  gua_pan: {
    type: String,
    allowNull: true,
  },
  gua_aadhaar: {
    type: String,
    allowNull: true,
  },
  gua_aadhaar_hash: {
    type: String,
    allowNull: true,
  },
});
const ShareHoldersSchema = mongoose.Schema(
  {
    borrower_id: {
      type: String,
      allowNull: true,
    },
    share_holder_name: {
      type: String,
      allowNull: true,
    },
    share_holder_perc: {
      type: Number,
      allowNull: true,
    },
  },
  { _id: false },
);

const SignedDocsSchema = mongoose.Schema(
  {
    doc_code: {
      type: String,
      allowNull: true,
    },
    doc_stage: {
      type: Number,
      allowNull: true,
    },
    request_id: {
      type: String,
      allowNull: true,
    }
  },
  { _id: false },
);

const data = {
  id: {
    type: Number,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  loan_schema_id: {
    type: Number,
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
  partner_loan_app_id: {
    type: String,
    allowNull: false,
    unique: true,
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
  },
  last_name: {
    type: String,
    allowNull: true,
  },
  sector: {
    type: String,
    allowNull: true,
  },
  type_of_addr: {
    type: String,
    allowNull: true,
    enum: ['Current', 'Permanent'],
  },
  resi_addr_ln1: {
    type: String,
    allowNull: true,
  },
  resi_addr_ln2: {
    type: String,
    allowNull: true,
  },
  city: {
    type: String,
    allowNull: true,
  },
  state: {
    type: String,
    allowNull: true,
  },
  pincode: {
    type: Number,
    allowNull: true,
  },
  address_same: {
    type: Number,
    default: 0,
  },
  per_addr_ln1: {
    type: String,
    allowNull: true,
  },
  per_addr_ln2: {
    type: String,
    allowNull: true,
  },
  per_city: {
    type: String,
    allowNull: true,
  },
  per_state: {
    type: String,
    allowNull: true,
  },
  per_pincode: {
    type: Number,
    allowNull: true,
  },
  appl_phone: {
    type: String,
    allowNull: true,
  },
  appl_pan: {
    type: String,
    allowNull: true,
  },
  email_id: {
    type: String,
    allowNull: true,
  },
  aadhar_card_num: {
    type: String,
    allowNull: true,
  },
  aadhar_card_hash: {
    type: String,
    allowNull: true,
  },
  dob: {
    type: String,
    allowNull: true,
  },
  ebill_num: {
    type: String,
    allowNull: true,
  },
  gender: {
    type: String,
    allowNull: true,
    enum: ['Male', 'Female', 'Others'],
  },
  photo_id_type: {
    type: String,
    allowNull: true,
  },
  photo_id_num: {
    type: String,
    allowNull: true,
  },
  addr_id_type: {
    type: String,
    allowNull: true,
    enum: ['Aadhar', 'Driving License', 'Voter ID Card', 'Passport', 'Ration Card', 'Bank Passbook'],
  },
  addr_id_num: {
    type: String,
    allowNull: true,
  },
  no_year_current_addr: {
    type: String,
    allowNull: true,
  },
  age: {
    type: String,
    allowNull: true,
  },
  religion: {
    type: String,
    allowNull: true,
    enum: ['Hindu', 'Muslim', 'Christian', 'Jain', 'Sikh', 'Others'],
  },
  qualification: {
    type: String,
    allowNull: true,
    enum: ['High School', 'Intermediate', 'Graduate', 'Post Graduate', 'Doctorate', 'Others'],
  },
  marital_status: {
    type: String,
    allowNull: true,
    enum: ['Married', 'Single', 'Others'],
  },
  employer_id: {
    type: String,
    allowNull: true,
  },
  total_experience: {
    type: String,
    allowNull: true,
  },
  cibil_score_borro: {
    type: String,
    allowNull: true,
  },
  annual_income_borro: {
    type: String,
    allowNull: true,
  },
  borro_bank_code: {
    type: String,
    allowNull: true,
  },
  borro_bank_name: {
    type: String,
    allowNull: true,
  },
  borro_bank_branch: {
    type: String,
    allowNull: true,
  },
  borro_bank_acc_num: {
    type: String,
    allowNull: true,
  },
  borro_bank_ifsc: {
    type: String,
    allowNull: true,
  },
  borro_bank_type: {
    type: String,
    allowNull: true,
  },
  passport: {
    type: String,
    allowNull: true,
  },
  itr_ack_no: {
    type: String,
    allowNull: true,
  },
  uan: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  lead_status: {
    type: String,
    allowNull: false,
    default: 'new',
  },
  business_name: {
    type: String,
    allowNull: true,
  },
  co_app_name: {
    type: String,
    allowNull: true,
  },
  co_app_address: {
    type: String,
    allowNull: true,
  },
  co_app_mobile_no: {
    type: Number,
    allowNull: true,
  },
  co_app_pan: {
    type: String,
    allowNull: true,
  },
  co_app_bureau_score: {
    type: Number,
    allowNull: true,
  },
  avg_3_mnts_txn_amt: {
    type: Number,
    allowNull: true,
  },
  vintage_months_partner_platform: {
    type: Number,
    allowNull: true,
  },
  business_establishment_proof_type: {
    type: String,
    allowNull: true,
    enum: ['Shop and Establishment Act Proof', 'Corroborative Evidence', 'Udhyog Adhaar', 'FSSAI', 'Post Office Saving Passbook', 'IEC Code issued by DGFT', 'ITR', 'GST'],
  },
  co_app_address_proof_type: {
    type: String,
    allowNull: true,
    enum: ['Aadhar', 'Driving License', 'Voter ID Card', 'Passport', 'Ration Card', 'Bank Passbook'],
  },
  relation_with_applicant: {
    type: String,
    allowNull: true,
    enum: ['Husband', 'Wife', 'Brother', 'Father', 'Mother', 'Sister', 'Son', 'Daughter', 'Friend', 'Retailer', 'Supplier', 'Others'],
  },
  co_app_poi: {
    type: String,
    allowNull: true,
    enum: ['PAN', 'Aadhaar', 'Voter Id', "Driver's License", 'Passport', 'Ration Card', 'Others'],
  },
  residence_status: {
    type: String,
    allowNull: true,
    enum: ['Owned', 'Rental', 'Parental', 'Lease', 'Others'],
  },
  sherlock_match: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  cust_id: {
    type: String,
    allowNull: false,
  },
  //Education fields
  applicant_type: {
    type: String,
    allowNull: true,
    enum: ['Parent', 'Student', 'Others'],
  },
  student_name_1: {
    type: String,
    allowNull: true,
  },
  student_1_id_num: {
    type: String,
    allowNull: true,
  },
  student_name_2: {
    type: String,
    allowNull: true,
  },
  student_2_id_num: {
    type: String,
    allowNull: true,
  },
  student_name_3: {
    type: String,
    allowNull: true,
  },
  student_3_id_num: {
    type: String,
    allowNull: true,
  },
  loan_status: {
    type: String,
    allowNull: true,
    default: '',
  },
  status: {
    type: String,
    default: 'new',
    allowNull: true,
  },
  prev_loan_status: {
    type: String,
    allowNull: true,
  },
  prev_lead_status: {
    type: String,
    allowNull: true,
  },
  prev_status: {
    type: String,
    allowNull: true,
  },
  others_ld1: {
    type: String,
    allowNull: true,
  },
  others_ld2: {
    type: String,
    allowNull: true,
  },
  landmark: {
    type: String,
    allowNull: true,
  },
  is_deleted: {
    type: Number,
    default: 0,
    allowNull: true,
  },
  delete_date_timestamp: {
    type: Date,
    allowNull: true,
  },
  deleted_by: {
    type: Number,
    allowNull: true,
  },
  reason: {
    type: String,
    allowNull: true,
    enum: ['I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08', 'I09'],
  },
  remarks: {
    type: String,
    allowNull: true,
  },
  bureau_pull_consent: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  legacy_lead_id: {
    type: String,
    allowNull: true,
  },
  aadhaar_fname: {
    type: String,
    allowNull: false,
    default: '',
  },
  aadhaar_lname: {
    type: String,
    allowNull: false,
    default: '',
  },
  aadhaar_dob: {
    type: String,
    allowNull: false,
    default: '',
  },
  aadhaar_pincode: {
    type: String,
    allowNull: false,
    default: '',
  },
  parsed_aadhaar_number: {
    type: String,
    allowNull: false,
    default: '',
  },
  pan_fname: {
    type: String,
    allowNull: false,
    default: '',
  },
  pan_lname: {
    type: String,
    allowNull: false,
    default: '',
  },
  pan_dob: {
    type: String,
    allowNull: false,
    default: '',
  },
  pan_father_fname: {
    type: String,
    allowNull: false,
    default: '',
  },
  pan_father_lname: {
    type: String,
    allowNull: false,
    default: '',
  },
  parsed_pan_number: {
    type: String,
    allowNull: false,
    default: '',
  },
  father_fname: {
    type: String,
    allowNull: true,
  },
  father_mname: {
    type: String,
    allowNull: true,
  },
  father_lname: {
    type: String,
    allowNull: true,
  },
  pan_mname: {
    type: String,
    allowNull: true,
  },
  aadhaar_mname: {
    type: String,
    allowNull: true,
  },
  //coborrower fields
  coborrower_id: {
    type: String,
    allowNull: true,
    unique: true,
  },
  coborr_first_name: {
    type: String,
    allowNull: true,
  },
  coborr_last_name: {
    type: String,
    allowNull: true,
  },
  coborr_middle_name: {
    type: String,
    allowNull: true,
  },
  coborr_addr_line_1: {
    type: String,
    allowNull: true,
  },
  coborr_addr_line_2: {
    type: String,
    allowNull: true,
  },
  coborr_city: {
    type: String,
    allowNull: true,
  },
  coborr_state: {
    type: String,
    allowNull: true,
  },
  coborr_pincode: {
    type: Number,
    allowNull: true,
  },
  coborr_country: {
    type: String,
    allowNull: true,
  },
  coborr_landmark: {
    type: String,
    allowNull: true,
  },
  coborr_pan: {
    type: String,
    allowNull: true,
  },
  coborr_aadhaar: {
    type: String,
    allowNull: true,
  },
  coborr_phone: {
    type: Number,
    allowNull: true,
  },
  coborr_gender: {
    type: String,
    allowNull: true,
  },
  coborr_dob: {
    type: String,
    allowNull: true,
  },
  coborr_email: {
    type: String,
    allowNull: true,
  },
  coborr_relationship_with_borrower: {
    type: String,
    allowNull: true,
    enum: ['SELF', 'BROTHER', 'SISTER', 'FATHER', 'MOTHER', 'SON', 'SPOUSE'],
  },
  title: {
    type: String,
    allowNull: true,
    enum: ['Mr', 'Ms', 'Mrs', 'Others'],
  },
  scr_match_result: {
    type: String,
    allowNull: true,
  },
  scr_match_count: {
    type: String,
    allowNull: true,
  },
  school_id: {
    type: String,
    allowNull: true,
  },
  urc_parsing_data: {
    type: String,
    allowNull: true,
    default: null,
  },
  urc_parsing_status: {
    type: String,
    allowNull: true,
    default: null,
  },
  same_as_corr: {
    type: String,
    allowNull: true,
  },
  same_as_res: {
    type: String,
    allowNull: true,
  },
  same_as_bus: {
    type: String,
    allowNull: true,
  },
  bus_add_corr_line1: {
    type: String,
    allowNull: true,
  },

  bus_add_corr_line2: {
    type: String,
    allowNull: true,
  },
  bus_add_corr_city: {
    type: String,
    allowNull: true,
  },
  bus_add_corr_state: {
    type: String,
    allowNull: true,
  },
  bus_add_corr_pincode: {
    type: String,
    allowNull: true,
  },
  bus_add_per_line1: {
    type: String,
    allowNull: true,
  },
  bus_add_per_line2: {
    type: String,
    allowNull: true,
  },
  bus_add_per_city: {
    type: String,
    allowNull: true,
  },

  bus_pan: {
    type: String,
    allowNull: true,
  },

  bus_add_per_state: {
    type: String,
    allowNull: true,
  },
  bus_add_per_pincode: {
    type: String,
    allowNull: true,
  },
  bus_name: {
    type: String,
    allowNull: true,
  },
  aadhar_verified: {
    type: String,
    allowNull: true,
  },
  doi: {
    type: Date,
    allowNull: true,
  },
  bus_entity_type: {
    type: String,
    allowNull: true,
  },
  loan_amount: {
    type: String,
    allowNull: true,
  },
  loan_tenure: {
    type: String,
    allowNull: true,
  },
  loan_interest_rate: {
    type: String,
    allowNull: true,
  },
  coborrower: {
    type: [CoBorrowerSchema],
    allowNull: true,
  },
  guarantor: {
    type: [GuarantorSchema],
    allowNull: true,
  },
  entity_details: {
    type: EntitySchema,
    allowNull: true,
  },
  share_holders: {
    type: [ShareHoldersSchema],
    allowNull: true,
  },
  fina_docs_gstin: {
    type: String,
    allowNull: true,
  },
  addi_docs_comment: {
    type: String,
    allowNull: true,
  },
  signed_docs: {
    type: [SignedDocsSchema],
    allowNull: true,
    default: undefined
  },
  purpose_of_loan:{
    type: String,
    enum: Object.values(PurposeOfLoan),
    allowNull:true,
  },
};

//copy variables you want to exclude from schema verification while uplaoding template
const excludes = ['id', 'loan_id', 'loan_app_id', 'borrower_id', 'book_entity_id', 'product_id', 'company_id', 'loan_schema_id', 'urc_parsing_data', 'urc_parsing_status', 'created_at'];

module.exports = {
  data,
  excludes,
};

const data = {
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  subscription_umrn: {
    type: String,
    allowNull: true,
  },
  subscription_id: {
    type: String,
    allowNull: true,
  },
  subscription_account_no: {
    type: String,
    allowNull: true,
  },
  subscription_amount: {
    type: Number,
    allowNull: true,
  },
  subscription_start_date: {
    type: Date,
    allowNull: true,
  },
  subscription_end_date: {
    type: Date,
    allowNull: true,
  },
  subscription_status: {
    type: String,
    allowNull: true,
  },
  subscription_customer_name: {
    type: String,
    allowNull: true,
  },
  subscription_remarks: {
    type: String,
    allowNull: true,
  },
  subscription_created_at: {
    type: Date,
    allowNull: true,
  },
  subscription_corporate_name:{
    type: String,
    allowNull: true,
  },
  subscription_purpose_of_mandate:{
    type: String,
    allowNull: true,
  },
  subscription_customer_mobile_no:{
    type: String,
    allowNull: true,
  },
  subscription_sponsor_bank_mandate_id:{
    type: String,
    allowNull: true,
  },
  co_lender_assignment_id: {
    type: Number,
    allowNull: true,
  },
  approve_for_da: {
    type: Number,
    allowNull: true,
  },
  approve_for_da_date: {
    type: Date,
    allowNull: true,
  },
  approved_da: {
    type: String,
    allowNull: true,
  },
  approved_by: {
    type: String,
    allowNull: true,
  },
  kyc_app_or_rejected_by: {
    type: String,
    allowNull: true,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  loan_id: {
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
  aadhar_card_hash: {
    type: String,
    allowNull: true,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  partner_borrower_id: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  co_lender_id: {
    type: Number,
    allowNull: true,
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  co_lend_flag: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  loan_schema_id: {
    type: Number,
    allowNull: false,
  },
  service_provider: {
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
  loan_app_date: {
    type: String,
    allowNull: true,
  },
  religion: {
    type: String,
    allowNull: true,
    enum: ['Hindu', 'Muslim', 'Christian', 'Jain', 'Sikh', 'Others'],
  },
  penal_interest: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  bounce_charges: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  qualification: {
    type: String,
    allowNull: true,
    enum: [
      'High School',
      'Intermediate',
      'Graduate',
      'Post Graduate',
      'Doctorate',
      'Others',
    ],
  },
  marital_status: {
    type: String,
    allowNull: true,
    enum: ['Married', 'Single', 'Others'],
  },
  sanction_amount: {
    type: String,
    allowNull: true,
  },
  gst_on_pf_amt: {
    type: String,
    allowNull: true,
  },
  gst_on_pf_perc: {
    type: String,
    allowNull: true,
  },
  repayment_type: {
    type: String,
    allowNull: true,
    enum: ['Bullet', 'Installment', 'Weekly', 'Monthly', 'Daily'],
  },
  app_charges: {
    type: String,
    allowNull: true,
  },
  stamp_charges: {
    type: String,
    allowNull: true,
  },
  first_inst_date: {
    type: Date,
    allowNull: true,
  },
  advance_emi: {
    type: String,
    allowNull: true,
  },
  fldg_perc: {
    type: String,
    allowNull: true,
  },
  fldg_amt: {
    type: String,
    allowNull: true,
  },
  total_charges: {
    type: String,
    allowNull: true,
  },
  net_disbur_amt: {
    type: String,
    allowNull: true,
  },
  final_approve_date: {
    type: Date,
    allowNull: true,
  },
  final_remarks: {
    type: String,
    allowNull: true,
  },
  employer_name: {
    type: String,
    allowNull: true,
  },
  employer_id: {
    type: String,
    allowNull: true,
  },
  foir: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: false,
    default: 'open',
  },
  stage: {
    type: Number,
    allowNull: false,
    default: 0,
  },
  prev_stage: {
    type: Number,
    allowNull: false,
  },
  prev_status: {
    type: String,
    allowNull: false,
  },
  aadhar_verified: {
    type: String,
    allowNull: false,
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
    type: Number,
    allowNull: true,
  },
  exclude_interest_till_grace_period: {
    type: String,
    allowNull: true,
    default: 0,
  },
  tenure_in_days: {
    type: Number,
    allowNull: true,
  },
  grace_period: {
    type: Number,
    allowNull: true,
  },
  overdue_charges_per_day: {
    type: String,
    allowNull: true,
  },
  overdue_days: {
    type: Number,
    allowNull: true,
  },
  addr_id_num: {
    type: String,
    allowNull: true,
  },
  addr_id_type: {
    type: String,
    allowNull: true,
    enum: [
      'Aadhar',
      'Driving License',
      'Voter ID Card',
      'Passport',
      'Ration Card',
      'Bank Passbook',
    ],
  },
  photo_id_num: {
    type: String,
    allowNull: true,
  },
  photo_id_type: {
    type: String,
    allowNull: true,
  },
  partner_customer_category: {
    type: String,
    allowNull: true,
  },
  customer_type_ntc: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  customer_risk_segment: {
    type: String,
    allowNull: true,
  },
  vintage_current_employer: {
    type: String,
    allowNull: true,
  },
  professional_category: {
    type: String,
    allowNull: true,
  },
  professional_subcategory: {
    type: String,
    allowNull: true,
  },
  employment_status: {
    type: String,
    allowNull: true,
    enum: ['Salaried', 'Self Employed', 'Others'],
  },
  education_status: {
    type: String,
    allowNull: true,
  },
  customer_type: {
    type: String,
    allowNull: true,
    enum: ['New', 'Repeat'],
  },
  invoice_amount: {
    type: String,
    allowNull: true,
  },
  borro_bank_account_type: {
    type: String,
    allowNull: true,
    enum: ['Current', 'Savings',"Others"],
  },
  borro_bank_account_holder_name: {
    type: String,
    allowNull: true,
  },
  business_vintage_overall: {
    type: String,
    allowNull: true,
  },
  gst_verification_response: {
    type: String,
    allowNull: true,
  },
  gst_number: {
    type: String,
    allowNull: true,
  },
  abb: {
    type: String,
    allowNull: true,
  },
  partner_system_score: {
    type: String,
    allowNull: true,
  },
  loan_int_amt: {
    type: String,
    allowNull: true,
  },
  loan_int_rate: {
    type: String,
    allowNull: true,
  },
  conv_fees: {
    type: String,
    allowNull: true,
  },
  vpa_address: {
    type: String,
    allowNull: true,
  },
  processing_fees_amt: {
    type: String,
    allowNull: true,
  },
  processing_fees_perc: {
    type: String,
    allowNull: true,
  },
  tenure: {
    type: String,
    allowNull: true,
  },
  tenure_type: {
    type: String,
    allowNull: true,
    enum: ['Month', 'Fortnight', 'Week', 'Day'],
  },
  int_type: {
    type: String,
    allowNull: true,
    enum: ['Flat', 'Reducing'],
  },
  borro_bank_ifsc: {
    type: String,
    allowNull: true,
  },
  borro_bank_acc_num: {
    type: String,
    allowNull: true,
  },
  borro_bank_name: {
    type: String,
    allowNull: true,
  },
  annual_income_borro: {
    type: String,
    allowNull: true,
  },
  umrn: {
    type: String,
    allowNull: true,
  },
  father_or_spouse_name: {
    type: String,
    allowNull: true,
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
  ckyc_num: {
    type: String,
    allowNull: true,
  },
  disc_factor_merchant_risk_cat: {
    type: Number,
    allowNull: true,
  },
  disc_factor_bureau_score: {
    type: Number,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months: {
    type: String,
    allowNull: true,
  },
  current_overdue_value: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_9_months: {
    type: String,
    allowNull: true,
  },
  dpd_in_last_3_months: {
    type: String,
    allowNull: true,
  },
  dpd_in_last_6_months: {
    type: String,
    allowNull: true,
  },
  bureau_score: {
    type: String,
    allowNull: true,
  },
  bureau_type: {
    type: String,
    allowNull: true,
    enum: ['CIBIL', 'Experian', 'Equifax', 'CRIF'],
  },
  monthly_income: {
    type: String,
    allowNull: true,
  },
  bounces_in_one_month: {
    type: String,
    allowNull: true,
  },
  bounces_in_three_month: {
    type: String,
    allowNull: true,
  },
  bounces_in_six_month: {
    type: String,
    allowNull: true,
  },
  bounces_in_nine_month: {
    type: String,
    allowNull: true,
  },
  number_of_deposit_txn: {
    type: String,
    allowNull: true,
  },
  number_of_withdrawal_txn: {
    type: String,
    allowNull: true,
  },
  regular_salary_credit: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  loan_amount_requested: {
    type: String,
    allowNull: true,
  },
  active_secured_loan_or_credit_card: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  insurance_company: {
    type: String,
    allowNull: true,
  },
  insurance_type: {
    type: String,
    allowNull: true,
  },
  writtenoff_or_default: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  credit_card_settlement: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  credit_card_settlement_amount: {
    type: String,
    allowNull: true,
  },
  downpayment_amount: {
    type: String,
    allowNull: true,
  },
  emi_amount: {
    type: String,
    allowNull: true,
  },
  emi_allowed: {
    type: String,
    allowNull: true,
  },
  bene_bank_name: {
    type: String,
    allowNull: true,
  },
  bene_bank_acc_num: {
    type: String,
    allowNull: true,
  },
  bene_bank_ifsc: {
    type: String,
    allowNull: true,
  },
  bene_bank_account_holder_name: {
    type: String,
    allowNull: true,
  },
  bene_bank_account_type: {
    type: String,
    allowNull: true,
    enum: ['Current', 'Savings',"Others"],
  },
  insurance_charges: {
    type: String,
    allowNull: true,
  },
  igst_amount: {
    type: String,
    allowNull: true,
  },
  cgst_amount: {
    type: String,
    allowNull: true,
  },
  sgst_amount: {
    type: String,
    allowNull: true,
  },
  emi_count: {
    type: Number,
    allowNull: true,
  },
  broken_interest: {
    type: String,
    allowNull: true,
  },
  dpd_in_last_12_months: {
    type: Number,
    allowNull: true,
  },
  requested_loan_amt: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_3_months_secured: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured: {
    type: Number,
    allowNull: true,
  },
  total_monthly_sales: {
    type: Number,
    allowNull: true,
  },
  profit_margin_percent: {
    type: Number,
    allowNull: true,
  },
  broken_period_int_amt: {
    type: Number,
    allowNull: true,
  },
  prepayment_charges_percent: {
    type: Number,
    allowNull: true,
  },
  prepayment_charges_amt: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_24_months: {
    type: Number,
    allowNull: true,
  },
  annual_turnover: {
    type: Number,
    allowNull: true,
  },
  avg_banking_turnover_6_months: {
    type: Number,
    allowNull: true,
  },
  enquiries_bureau_30_days: {
    type: Number,
    allowNull: true,
  },
  cnt_active_unsecured_loans: {
    type: Number,
    allowNull: true,
  },
  banking_outflow_6_months: {
    type: Number,
    allowNull: true,
  },
  banking_inflow_6_months: {
    type: Number,
    allowNull: true,
  },
  subscription_fee: {
    type: Number,
    allowNull: true,
  },
  total_banking_turnover_6_months: {
    type: Number,
    allowNull: true,
  },
  business_expenses_6_months: {
    type: Number,
    allowNull: true,
  },
  //Education fields
  total_overdues_in_cc: {
    type: Number,
    allowNull: true,
  },
  monthly_income_co_app: {
    type: Number,
    allowNull: true,
  },
  insurance_amount: {
    type: Number,
    allowNull: true,
  },
  minimum_cash_profit: {
    type: Number,
    allowNull: true,
  },
  institute_or_school_name: {
    type: String,
    allowNull: true,
  },
  institute_or_school_branch: {
    type: String,
    allowNull: true,
  },
  course_or_class_name: {
    type: String,
    allowNull: true,
  },
  school_fees_amount_1: {
    type: Number,
    allowNull: true,
  },
  school_fees_amount_2: {
    type: Number,
    allowNull: true,
  },
  school_fees_amount_3: {
    type: Number,
    allowNull: true,
  },
  mother_name: {
    type: String,
    allowNull: true,
  },
  spouse_name: {
    type: String,
    allowNull: true,
  },
  dealer_name: {
    type: String,
    allowNull: true,
  },
  sub_dealer_name: {
    type: String,
    allowNull: true,
  },
  net_monthly_obligations: {
    type: String,
    allowNull: true,
  },
  scheme_code: {
    type: String,
    allowNull: true,
  },
  scheme_name: {
    type: String,
    allowNull: true,
  },
  customer_category: {
    type: String,
    allowNull: true,
    enum: ['individual', 'organisation'],
  },
  dealer_subvention: {
    type: Number,
    allowNull: true,
  },
  nach_charges: {
    type: Number,
    allowNull: true,
  },
  pdd_charges: {
    type: Number,
    allowNull: true,
  },
  admin_fees: {
    type: Number,
    allowNull: true,
  },
  bureau_charges: {
    type: Number,
    allowNull: true,
  },
  dealer_charges: {
    type: Number,
    allowNull: true,
  },
  pre_emi: {
    type: Number,
    allowNull: true,
  },
  bureau_outstanding_loan_amt: {
    type: Number,
    allowNull: true,
  },
  limit_amount: {
    type: Number,
    allowNull: true,
  },
  loan_start_date: {
    type: Date,
    allowNull: true,
  },
  expiry_date: {
    type: Date,
    allowNull: true,
  },
  subvention_fees_amount: {
    type: Number,
    allowNull: true,
  },
  gst_on_subvention_fees: {
    type: Number,
    allowNull: true,
  },
  cgst_on_subvention_fees: {
    type: Number,
    allowNull: true,
  },
  sgst_on_subvention_fees: {
    type: Number,
    allowNull: true,
  },
  igst_on_subvention_fees: {
    type: Number,
    allowNull: true,
  },
  subventor_name: {
    type: String,
    allowNull: true,
  },
  subventor_gst: {
    type: String,
    allowNull: true,
  },
  subventor_addr_ln1: {
    type: String,
    allowNull: true,
  },
  subventor_addr_ln2: {
    type: String,
    allowNull: true,
  },
  subventor_addr_city: {
    type: String,
    allowNull: true,
  },
  subventor_addr_state: {
    type: String,
    allowNull: true,
  },
  subventor_addr_pincode: {
    type: String,
    allowNull: true,
  },
  disbursement_date_time: {
    type: String,
    allowNull: true,
  },
  total_experience: {
    type: Number,
    allowNull: true,
  },
  purpose_of_loan: {
    type: String,
    allowNull: true,
  },
  business_name: {
    type: String,
    allowNull: true,
  },
  business_establishment_proof_type: {
    type: String,
    allowNull: true,
    enum: [
      'Shop and Establishment Act Proof',
      'Corroborative Evidence',
      'Udhyog Adhaar',
      'FSSAI',
      'Post Office Saving Passbook',
      'IEC Code Issued by DGFT',
      'ITR',
      'GST',
    ],
  },
  co_app_or_guar_name: {
    type: String,
    allowNull: true,
  },
  co_app_or_guar_address: {
    type: String,
    allowNull: true,
  },
  co_app_or_guar_mobile_no: {
    type: Number,
    allowNull: true,
  },
  co_app_or_guar_pan: {
    type: String,
    allowNull: true,
  },
  co_app_or_guar_address_proof_type: {
    type: String,
    allowNull: true,
    enum: [
      'Aadhar',
      'Driving License',
      'Voter ID Card',
      'Passport',
      'Ration Card',
      'Bank Passbook',
    ],
  },
  relation_with_applicant: {
    type: String,
    allowNull: true,
    enum: [
      'Husband',
      'Wife',
      'Brother',
      'Father',
      'Mother',
      'Sister',
      'Son',
      'Daughter',
      'Friend',
      'Retailer',
      'Supplier',
      'Others',
      'Spouse',
      'Cousin',
      'Colleague',
    ],
  },
  co_app_or_guar_poi: {
    type: String,
    allowNull: true,
    enum: [
      'PAN',
      'Aadhaar',
      'Voter Id',
      "Driver's License",
      'Passport',
      'Ration Card',
      'Others',
    ],
  },
  co_app_or_guar_bureau_type: {
    type: String,
    allowNull: true,
    enum: ['CIBIL', 'Experian', 'Equifax', 'CRIF'],
  },
  co_app_or_guar_bureau_score: {
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
  sherlock_match: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  kyc_service_provider: {
    type: String,
    allowNull: true,
  },
  ref1_name: {
    type: String,
    allowNull: true,
  },
  ref1_address: {
    type: String,
    allowNull: true,
  },
  ref1_mob_no: {
    type: Number,
    allowNull: true,
  },
  ref1_pan: {
    type: String,
    allowNull: true,
  },
  ref1_aadhaar_no: {
    type: Number,
    allowNull: true,
  },
  ref1_relation_with_borrower: {
    type: String,
    allowNull: true,
    enum: [
      'Husband',
      'Wife',
      'Brother',
      'Father',
      'Mother',
      'Sister',
      'Son',
      'Daughter',
      'Friend',
      'Retailer',
      'Supplier',
      'Others',
      'Spouse',
      'Cousin',
      'Colleague',
    ],
  },
  ref2_name: {
    type: String,
    allowNull: true,
  },
  ref2_address: {
    type: String,
    allowNull: true,
  },
  ref2_mob_no: {
    type: Number,
    allowNull: true,
  },
  ref2_pan: {
    type: String,
    allowNull: true,
  },
  ref2_aadhaar_no: {
    type: Number,
    allowNull: true,
  },
  ref2_relation_with_borrower: {
    type: String,
    allowNull: true,
    enum: [
      'Husband',
      'Wife',
      'Brother',
      'Father',
      'Mother',
      'Sister',
      'Son',
      'Daughter',
      'Friend',
      'Retailer',
      'Supplier',
      'Others',
      'Spouse',
      'Cousin',
      'Colleague',
    ],
  },
  business_address: {
    type: String,
    allowNull: true,
  },
  business_state: {
    type: String,
    allowNull: true,
  },
  business_city: {
    type: String,
    allowNull: true,
  },
  business_pin_code: {
    type: String,
    allowNull: true,
  },
  business_address_ownership: {
    type: String,
    allowNull: true,
  },
  business_type: {
    type: String,
    allowNull: true,
  },
  nature_of_business: {
    type: String,
    allowNull: true,
  },
  business_pan: {
    type: String,
    allowNull: true,
  },
  other_business_reg_no: {
    type: String,
    allowNull: true,
  },
  other_busd1: {
    type: String,
    allowNull: true,
  },
  other_busd2: {
    type: String,
    allowNull: true,
  },
  annual_household_income: {
    type: Number,
    allowNull: true,
  },
  monthly_household_income: {
    type: Number,
    allowNull: true,
  },
  daily_household_income: {
    type: Number,
    allowNull: true,
  },
  monthly_turnover: {
    type: Number,
    allowNull: true,
  },
  monthly_turnover_with_partner: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_txn_count: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_txn_amount: {
    type: Number,
    allowNull: true,
  },
  monthly_sales_txn: {
    type: Number,
    allowNull: true,
  },
  monthly_purchase_txn: {
    type: Number,
    allowNull: true,
  },
  net_income: {
    type: Number,
    allowNull: true,
  },
  monthly_disposable_income: {
    type: Number,
    allowNull: true,
  },
  platform_commission: {
    type: Number,
    allowNull: true,
  },
  bureau_fetch_date: {
    type: Date,
    allowNull: true,
  },
  commercial_bureau_ranking: {
    type: Number,
    allowNull: true,
  },
  no_of_suit_filed_wilful_default_sub_dbt_sma_lss_acounts: {
    type: Number,
    allowNull: true,
  },
  enquiries_in_last_3_months: {
    type: Number,
    allowNull: true,
  },
  unsecured_loan_or_cc_Vintage: {
    type: Number,
    allowNull: true,
  },
  total_bureau_vintage: {
    type: Number,
    allowNull: true,
  },
  other_burd1: {
    type: Number,
    allowNull: true,
  },
  other_burd2: {
    type: String,
    allowNull: true,
  },
  abb_1: {
    type: Number,
    allowNull: true,
  },
  abb_2: {
    type: Number,
    allowNull: true,
  },
  abb_3: {
    type: Number,
    allowNull: true,
  },
  abb_3_months: {
    type: Number,
    allowNull: true,
  },
  abb_6_months: {
    type: Number,
    allowNull: true,
  },
  total_banking_deposits_amt: {
    type: Number,
    allowNull: true,
  },
  total_banking_withdrawal_amt: {
    type: Number,
    allowNull: true,
  },
  median_of_banking_txn: {
    type: Number,
    allowNull: true,
  },
  total_banking_turnover: {
    type: Number,
    allowNull: true,
  },
  other_bankd1: {
    type: Number,
    allowNull: true,
  },
  other_bankd2: {
    type: Number,
    allowNull: true,
  },
  other_ed1: {
    type: String,
    allowNull: true,
  },
  other_ed2: {
    type: String,
    allowNull: true,
  },
  other_fd1: {
    type: Number,
    allowNull: true,
  },
  other_fd2: {
    type: Number,
    allowNull: true,
  },
  other_od1: {
    type: String,
    allowNull: true,
  },
  other_od2: {
    type: String,
    allowNull: true,
  },
  current_tranche_no: {
    type: Number,
    allowNull: true,
  },
  morat_emi: {
    type: Number,
    allowNull: true,
  },
  morat_tenure: {
    type: Number,
    allowNull: true,
  },
  normal_emi: {
    type: Number,
    allowNull: true,
  },
  normal_emi_tenure: {
    type: Number,
    allowNull: true,
  },
  subvention_fee_per: {
    type: Number,
    allowNull: true,
  },
  voter_id_num: {
    type: String,
    allowNull: true,
  },
  driver_license_num: {
    type: String,
    allowNull: true,
  },
  processing_fees_1: {
    type: Number,
    allowNull: true,
  },
  gst_on_pf_amt_1: {
    type: Number,
    allowNull: true,
  },
  cgst_amount_1: {
    type: Number,
    allowNull: true,
  },
  sgst_amount_1: {
    type: Number,
    allowNull: true,
  },
  igst_amount_1: {
    type: Number,
    allowNull: true,
  },
  repayment_days: {
    type: Number,
    allowNull: true,
  },
  on_road_price: {
    type: Number,
    allowNull: true,
  },
  is_active: {
    type: String,
    allowNull: true,
    enum: ['true', 'false'],
  },
  dealer_name: {
    type: String,
    allowNull: true,
  },
  dealer_email: {
    type: String,
    allowNull: true,
  },
  mandate_ref_no: {
    type: String,
    allowNull: true,
  },
  nach_trxn_no: {
    type: String,
    allowNull: true,
  },
  nach_amount: {
    type: Number,
    allowNull: true,
  },
  nach_umn: {
    type: String,
    allowNull: true,
  },
  nach_payment_amount: {
    type: Number,
    allowNull: true,
  },
  nach_registration_status: {
    type: String,
    allowNull: true,
  },
  nach_status_desc: {
    type: String,
    allowNull: true,
  },
  nach_account_holder_name: {
    type: String,
    allowNull: true,
  },
  nach_account_num: {
    type: String,
    allowNull: true,
  },
  nach_ifsc: {
    type: String,
    allowNull: true,
  },
  nach_start: {
    type: String,
    allowNull: true,
  },
  nach_end: {
    type: String,
    allowNull: true,
  },
  gst_on_conv_fees: {
    type: Number,
    allowNull: true,
  },
  cgst_on_conv_fees: {
    type: Number,
    allowNull: true,
  },
  sgst_on_conv_fees: {
    type: Number,
    allowNull: true,
  },
  igst_on_conv_fees: {
    type: Number,
    allowNull: true,
  },
  application_fees: {
    type: Number,
    allowNull: true,
  },
  application_fee_perc:  {
    type: Number,
    allowNull: true,
  },
  gst_on_application_fees: {
    type: Number,
    allowNull: true,
  },
  cgst_on_application_fees: {
    type: Number,
    allowNull: true,
  },
  sgst_on_application_fees: {
    type: Number,
    allowNull: true,
  },
  igst_on_application_fees: {
    type: Number,
    allowNull: true,
  },
  interest_type: {
    type: String,
    allowNull: true,
  },
  conv_fees_excluding_gst: {
    type: Number,
    allowNull: true,
  },
  application_fees_excluding_gst: {
    type: Number,
    allowNull: true,
  },
  subventor_email: {
    type: String,
    allowNull: true,
  },
  multiplier: {
    type: Number,
    allowNull: true,
  },
  avg_weekly_payouts: {
    type: Number,
    allowNull: true,
  },
  emi_obligation: {
    type: Number,
    allowNull: true,
  },
  partner_score_2: {
    type: Number,
    allowNull: true,
  },
  risk_bucket: {
    type: String,
    allowNull: true,
  },
  a_score_request_id: {
    type: String,
    allowNull: true,
  },
  a_score: {
    type: Number,
    allowNull: true,
  },
  b_score_request_id: {
    type: String,
    allowNull: true,
  },
  b_score: {
    type: Number,
    allowNull: true,
  },
  int_refund_days: {
    type: Number,
    allowNull: true,
  },
  int_refund_amount: {
    type: Number,
    allowNull: true,
  },
  int_refund_status: {
    type: String,
    allowNull: true,
    enum: ['NotInitiated', 'Initiated', 'Processed', 'Failed'],
  },
  int_refund_date_time: {
    type: String,
    allowNull: true,
  },
  int_refund_request_date_time: {
    type: Date,
    allowNull: true,
  },
  int_refund_triggered_by: {
    type: String,
    allowNull: true,
  },
  offered_amount: {
    type: Number,
    allowNull: true,
  },
  offered_int_rate: {
    type: Number,
    allowNull: true,
  },
  monthly_average_balance: {
    type: Number,
    allowNull: true,
  },
  monthly_imputed_income: {
    type: Number,
    allowNull: true,
  },
  applicant_photo_link: {
    type: String,
    allowNull: true,
  },
  resi_addr_landmark: {
    type: String,
    allowNull: true,
  },
  loan_disbursement_date: {
    type: Date,
    allowNull: true,
  },
  party_type: {
    type: String,
    allowNull: true,
  },
  rejection_date_time: {
    type: Date,
    allowNull: true,
  },
  rejected_by: {
    type: String,
    allowNull: true,
  },
  scr_approved_by: {
    type: String,
    allowNull: true,
  },
  reason: {
    type: String,
    allowNull: true,
    enum: [
      'I01',
      'I02',
      'I03',
      'I04',
      'I05',
      'I06',
      'I07',
      'I08',
      'I09',
      'K01',
      'K02',
      'K03',
      'K04',
    ],
  },
  remarks: {
    type: String,
    allowNull: true,
  },
  co_app_or_guar_obligation: {
    type: String,
    allowNull: true,
  },
  co_app_or_guar_dob: {
    type: Date,
    allowNull: true,
  },
  co_app_or_guar_gender: {
    type: String,
    allowNull: true,
    enum: ['Male', 'Female', 'Others'],
  },
  co_app_or_guar_ntc: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  co_app_or_guar_occupation: {
    type: String,
    allowNull: true,
  },
  patient_name: {
    type: String,
    allowNull: true,
  },
  patient_age: {
    type: Number,
    allowNull: true,
  },
  patient_dob: {
    type: Date,
    allowNull: true,
  },
  patient_relation_with_app: {
    type: String,
    allowNull: true,
    enum: [
      'Husband',
      'Wife',
      'Brother',
      'Father',
      'Mother',
      'Sister',
      'Son',
      'Daughter',
      'Friend',
      'Retailer',
      'Supplier',
      'Others',
      'Spouse',
      'Cousin',
      'Colleague',
    ],
  },
  residence_vintage: {
    type: String,
    allowNull: true,
  },
  business_entity_type: {
    type: String,
    allowNull: true,
    enum: [
      'Proprietorship',
      'LLP',
      'Partnership',
      'PrivateLtd',
      'Trading',
      'Manufacturing',
      'Others',
    ],
  },
  household_expense: {
    type: String,
    allowNull: true,
  },
  udyam_reg_no: {
    type: String,
    allowNull: true,
  },
  current_ratio: {
    type: String,
    allowNull: true,
  },
  quick_ratio: {
    type: String,
    allowNull: true,
  },
  cash_ratio: {
    type: String,
    allowNull: true,
  },
  tol_to_tnw: {
    type: String,
    allowNull: true,
  },
  debt_service_coverage_ratio: {
    type: String,
    allowNull: true,
  },
  revenue_growth: {
    type: String,
    allowNull: true,
  },
  ebitda_growth: {
    type: String,
    allowNull: true,
  },
  z_score: {
    type: String,
    allowNull: true,
  },
  legacy_loan_id: {
    type: String,
    allowNull: true,
  },

  date_of_inc: {
    type: Date,
    allowNull: true,
  },
  date_of_commencement: {
    type: Date,
    allowNull: true,
  },
  udyam_reg_nic_code: {
    type: String,
    allowNull: true,
  },

  dpd_in_last_3_months_co_app: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_3_months_cbr: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_6_months_co_app: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_9_months_co_app: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_12_months_co_app: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_24_months_co_app: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_6_months_cbr: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_9_months_cbr: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_12_months_cbr: {
    type: Number,
    allowNull: true,
  },
  dpd_in_last_24_months_cbr: {
    type: Number,
    allowNull: true,
  },
  overdue_days_cbr: {
    type: Number,
    allowNull: true,
  },
  writtenoff_or_default_co_app: {
    type: String,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_co_app: {
    type: String,
    allowNull: true,
  },
  cnt_active_unsecured_loans_co_app: {
    type: String,
    allowNull: true,
  },
  enquiries_bureau_30_days_co_app: {
    type: String,
    allowNull: true,
  },
  enquiries_in_last_3_months_co_app: {
    type: String,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_co_app: {
    type: String,
    allowNull: true,
  },
  writtenoff_or_default_cbr: {
    type: String,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cbr: {
    type: Number,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cbr: {
    type: Number,
    allowNull: true,
  },
  enquiries_bureau_30_days_cbr: {
    type: Number,
    allowNull: true,
  },
  enquiries_in_last_3_months_cbr: {
    type: Number,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cbr: {
    type: String,
    allowNull: true,
  },
  overdue_days_co_app: {
    type: Number,
    allowNull: true,
  },
  total_bureau_vintage_co_app: {
    type: Number,
    allowNull: true,
  },
  other_burd1_co_app: {
    type: String,
    allowNull: true,
  },
  other_burd2_co_app: {
    type: String,
    allowNull: true,
  },
  other_busd1_co_app: {
    type: String,
    allowNull: true,
  },
  other_busd2_co_app: {
    type: String,
    allowNull: true,
  },
  current_overdue_value_co_app: {
    type: String,
    allowNull: true,
  },
  current_overdue_value_cbr: {
    type: String,
    allowNull: true,
  },
  total_overdues_in_cc_co_app: {
    type: String,
    allowNull: true,
  },
  total_overdues_in_cc_cbr: {
    type: String,
    allowNull: true,
  },
  total_bureau_vintage_cbr: {
    type: Number,
    allowNull: true,
  },
  other_burd1_cbr: {
    type: String,
    allowNull: true,
  },
  other_burd2_cbr: {
    type: String,
    allowNull: true,
  },
  other_busd1_cbr: {
    type: String,
    allowNull: true,
  },
  other_busd2_cbr: {
    type: String,
    allowNull: true,
  },
  outward_bounces_in_one_month: {
    type: Number,
    allowNull: true,
  },
  outward_bounces_in_three_month: {
    type: Number,
    allowNull: true,
  },
  outward_bounces_in_six_month: {
    type: Number,
    allowNull: true,
  },
  outward_bounces_in_nine_month: {
    type: Number,
    allowNull: true,
  },
  inward_return_in_last_6_months: {
    type: Number,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards: {
    type: String,
    allowNull: true,
  },
  txn_avg: {
    type: String,
    allowNull: true,
  },
  txn_1: {
    type: String,
    allowNull: true,
  },
  txn_2: {
    type: String,
    allowNull: true,
  },
  txn_3: {
    type: String,
    allowNull: true,
  },
  txn_4: {
    type: String,
    allowNull: true,
  },
  txn_5: {
    type: String,
    allowNull: true,
  },
  txn_6: {
    type: String,
    allowNull: true,
  },
  txn_other: {
    type: String,
    allowNull: true,
  },
  program_type: {
    type: String,
    allowNull: true,
    enum: ['Banking', 'Income', 'Transactions', 'ARR', 'Bureau'],
  },
  cash_runway: {
    type: String,
    allowNull: true,
  },
  business_add_vintage: {
    type: String,
    allowNull: true,
  },
  no_of_cust: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_recurring_revenue: {
    type: String,
    allowNull: true,
  },
  adjusted_monthly_revenue: {
    type: String,
    allowNull: true,
  },
  recurring_revenue_growth: {
    type: String,
    allowNull: true,
  },
  annual_recurring_revenue: {
    type: String,
    allowNull: true,
  },
  party_type: {
    type: String,
    allowNull: true,
    enum: ['Individual', 'Legal Entity','Non Individual'],
  },
  borrower_premium: {
    type: Number,
    allowNull: true,
  },
  coborrower_premium: {
    type: Number,
    allowNull: true,
  },
  total_active_loans: {
    type: Number,
    allowNull: true,
  },
  oem_name: {
    type: String,
    allowNull: true,
  },
  ex_showroom_price: {
    type: Number,
    allowNull: true,
  },
  rto_charges: {
    type: Number,
    allowNull: true,
  },
  scr_status: {
    type: String,
    allowNull: true,
    enum: ['pending', 'approved', 'rejected'],
  },
  scr_match_result: {
    type: String,
    allowNull: true,
    enum: ['Probable'],
  },
  withheld_amt: {
    type: Number,
    allowNull: true,
  },
  enterprise_type: {
    type: String,
    allowNull: true,
  },
  enterprise_activity: {
    type: String,
    allowNull: true,
  },
  udyam_nic_code: {
    type: String,
    allowNull: true,
  },
  udyam_issue_date: {
    type: Date,
    allowNull: true,
  },
  udyam_inc_date: {
    type: Date,
    allowNull: true,
  },
  udyam_comm_date: {
    type: Date,
    allowNull: true,
  },
  user_id: {
    type: String,
    allowNull: true,
  },
  //Addition of Fields

  valuation: {
    type: Number,
    allowNull: true,
  },
  current_exposure: {
    type: Number,
    allowNull: true,
  },
  total_exposure: {
    type: Number,
    allowNull: true,
  },
  property_owner_name: {
    type: String,
    allowNull: true,
  },
  type_mortgage: {
    type: String,
    allowNull: true,
    enum: ['Equitable', 'Registered', 'PTM', 'Others'],
  },
  area_param: {
    type: String,
    allowNull: true,
    enum: ['Sq meter', 'Sq yard', 'Sq ft', 'Acres', 'Others'],
  },
  built_up_area: {
    type: Number,
    allowNull: true,
  },
  property_occupancy: {
    type: String,
    allowNull: true,
    enum: ['Self owned', 'Rented', 'Vacant', 'Others'],
  },
  area_land: {
    type: Number,
    allowNull: true,
  },
  property_type: {
    type: String,
    allowNull: true,
    enum: [
      'Residential',
      'Commercial',
      'Mixed',
      'Agriculture',
      'Gram panchayat',
      'Others',
    ],
  },
  property_address: {
    type: String,
    allowNull: true,
  },
  property_current_status: {
    type: String,
    allowNull: true,
    enum: ['Under construction', 'Fully constructed', 'Others'],
  },
  valuation2: {
    type: Number,
    allowNull: true,
  },
  avg_valuation: {
    type: Number,
    allowNull: true,
  },
  manual_kyc: {
    type: String,
    allowNull: true,
  },
  fuel_type: {
    type: String,
    allowNull: true,
    enum: ['CNG', 'EV', 'Petrol'],
  },
  fi_residence_status: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  ltv: {
    type: Number,
    allowNull: true,
  },
  battery_type: {
    type: String,
    allowNull: true,
    enum: ['Lead Acid', 'Lithium-ion'],
  },
  fi_business_status: {
    type: String,
    allowNull: true,
    enum: ['Yes', 'No'],
  },
  written_off_settled: {
    type: Number,
    allowNull: true,
  },
  updated_line_start_date: {
    type: Date,
    allowNull: true,
  },
  updated_line_end_date: {
    type: Date,
    allowNull: true,
  },
  withheld_percent: {
    type: Number,
    allowNull: true,
  },
  upi_handle: {
    type: String,
    allowNull: true,
  },
  upi_reference: {
    type: String,
    allowNull: true,
  },
  fc_offer_days: {
    type: Number,
    allowNull: true,
  },
  foreclosure_charge: {
    type: String,
    allowNull: true,
  },
  eligible_loan_amount: {
    type: Number,
    allowNull: true,
  },
  //Flag to identify pf calculation
  pf_calculated: {
    type: Number,
    allowNull: true,
  },
  penny_drop_result : {
    type : String,
    allowNull : true,
    default : undefined
  },
  name_match_result : {
    type : Number,
    allowNull : true,
    default : undefined
  },
  is_repoed : {
    type: Boolean,
    allowNull : true,
    default: null
  },
  //flag to identify if SANCTION LETTER esign created
  sl_req_sent : {
    type : Boolean,
    allowNull : true,
    default : false
  },
   //flag to identify if LBA esign created
  lba_req_sent : {
    type : Boolean,
    allowNull : true,
    default : false
  },
  is_force_closed: {
    type : Boolean,
    allowNull : true,
    default : false
  },
};

//copy variables you want to exclude from schema verification while uplaoding template
const excludes = [
  'id',
  'loan_id',
  'book_entity_id',
  'company_id',
  'product_id',
  'loan_schema_id',
  'status',
  'stage',
  'created_at',
  'updated_at',
  'interest_free_days',
  'exclude_interest_till_grace_period',
  'tenure_in_days',
  'grace_period',
  'overdue_charges_per_day',
  'overdue_days',
  'broken_interest',
  'penny_drop_result',
  'name_match_result',
  'is_repoed'
];

module.exports = {
  data,
  excludes,
};

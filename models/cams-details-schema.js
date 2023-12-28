const { ObjectId, Decimal128 } = require('mongodb');
var mongoose = require('mongoose');
const { float } = require('../utils/middleware-utils');
mongoose.Promise = global.Promise;

const CamsDetailsSchema = mongoose.Schema({
  id: {
    type: ObjectId,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
    required: true,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  gross_profit: {
    type: Number,
    allowNull: true,
  },
  pbt: {
    type: Number,
    allowNull: true,
  },
  total_revenue: {
    type: Number,
    allowNull: true,
  },
  non_operating_income: {
    type: Number,
    allowNull: true,
  },
  depreciation: {
    type: Number,
    allowNull: true,
  },
  interest_expense: {
    type: Number,
    allowNull: true,
  },
  pat: {
    type: Number,
    allowNull: true,
  },
  equity: {
    type: Number,
    allowNull: true,
  },
  reserve_and_surplus: {
    type: Number,
    allowNull: true,
  },
  reserve_and_surplus: {
    type: Number,
    allowNull: true,
  },
  secured_loans: {
    type: Number,
    allowNull: true,
  },
  secured_loans: {
    type: Number,
    allowNull: true,
  },
  unsecured_loans: {
    type: Number,
    allowNull: true,
  },
  cc_od_limit: {
    type: Number,
    allowNull: true,
  },
  short_term_liabilities: {
    type: Number,
    allowNull: true,
  },
  long_term_liabilities: {
    type: Number,
    allowNull: true,
  },
  intangible_assets: {
    type: Number,
    allowNull: true,
  },
  debtors: {
    type: Number,
    allowNull: true,
  },
  creditors: {
    type: Number,
    allowNull: true,
  },
  stock: {
    type: Number,
    allowNull: true,
  },
  current_assets: {
    type: Number,
    allowNull: true,
  },
  inventory: {
    type: Number,
    allowNull: true,
  },
  prepaid_expenses: {
    type: Number,
    allowNull: true,
  },
  current_liabilities: {
    type: Number,
    allowNull: true,
  },
  total_expenses: {
    type: Number,
    allowNull: true,
  },
  opening_stock: {
    type: Number,
    allowNull: true,
  },
  purchases: {
    type: Number,
    allowNull: true,
  },
  working_capital: {
    type: Number,
    allowNull: true,
  },
  total_assets: {
    type: Number,
    allowNull: true,
  },
  retained_earnings: {
    type: Number,
    allowNull: true,
  },
  total_liabilities: {
    type: Number,
    allowNull: true,
  },
  total_debit_l6m: {
    type: Number,
    allowNull: true,
  },
  total_debit_l3m: {
    type: Number,
    allowNull: true,
  },
  total_credit_l6m: {
    type: Number,
    allowNull: true,
  },
  total_credit_l3m: {
    type: Number,
    allowNull: true,
  },
  mnthly_avg_bal_l6m: {
    type: Number,
    allowNull: true,
  },
  mnthly_avg_bal_l3m: {
    type: Number,
    allowNull: true,
  },
  latest_bal: {
    type: Number,
    allowNull: true,
  },
  outward_chq_bounce_l6m: {
    type: Number,
    allowNull: true,
  },
  outward_chq_bounce_l3m: {
    type: Number,
    allowNull: true,
  },
  inward_chq_bounce_due_to_insuff_fnds_l6m: {
    type: Number,
    allowNull: true,
  },
  inward_chq_bounce_due_to_insuff_fnds_l3m: {
    type: Number,
    allowNull: true,
  },
  total_ecs_bounce_l6m: {
    type: Number,
    allowNull: true,
  },
  total_ecs_bounce_l3m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_txn_decl_due_to_insuff_funds_l6m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_txn_decl_due_to_insuff_funds_l3m: {
    type: Number,
    allowNull: true,
  },
  time_snce_lst_bounce: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_cash_withdrawls_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_atm_txn_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_cnt_of_atm_txn_l6m: {
    type: Number,
    allowNull: true,
  },
  total_ecs_bounce_l3m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_txn_decl_due_to_insuff_funds_l6m: {
    type: Number,
    allowNull: true,
  },
  time_snce_lst_bounce: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_cash_withdrawls_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_atm_txn_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_cnt_of_atm_txn_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_pos_txn_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_amt_of_cash_dep_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_annual_oblig: {
    type: Number,
    allowNull: true,
  },
  thirty_dpd_l3m: {
    type: Number,
    allowNull: true,
  },
  sixty_dpd_l6m: {
    type: Number,
    allowNull: true,
  },
  ninety_dpd_l12m: {
    type: Number,
    allowNull: true,
  },
  writeoff_settlement_l24m: {
    type: Number,
    allowNull: true,
  },
  crrnt_cmr_score: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_turnover_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_turnover_l2m: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_turnover_l3m: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_paid_l12m: {
    type: Number,
    allowNull: true,
  },
  null_gst_filing_l12m: {
    type: Number,
    allowNull: true,
  },
  one_shot_gst_filing_l12m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_gst_filing_missed_l12m: {
    type: Number,
    allowNull: true,
  },
  lst_mnth_gst_turnover: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_paid_l6m: {
    type: Number,
    allowNull: true,
  },
  ttl_gst_paid_l3m: {
    type: Number,
    allowNull: true,
  },
  lst_mnth_gst_paid: {
    type: Number,
    allowNull: true,
  },
  null_gst_filing_l6m: {
    type: Number,
    allowNull: true,
  },
  one_shot_gst_filing_l6m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_gst_filing_missed_l6m: {
    type: Number,
    allowNull: true,
  },
  cnt_of_gst_filing_missed_l3m: {
    type: Number,
    allowNull: true,
  },
  ttl_itr_income_last_year: {
    type: Number,
    allowNull: true,
  },
  ttl_itr_income_last_year_minus_one: {
    type: Number,
    allowNull: true,
  },
  total_itr_tax_last_year: {
    type: Number,
    allowNull: true,
  },
  total_itr_tax_last_year_minus_one: {
    type: Number,
    allowNull: true,
  },
  itr_filing_missed_l2y: {
    type: Number,
    allowNull: true,
  },
  advance_tax_paid_last_year: {
    type: Number,
    allowNull: true,
  },
  ttl_itr_expense_last_year: {
    type: Number,
    allowNull: true,
  },
  ttl_itr_expense_last_year_minus_one: {
    type: Number,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
    default: 'open',
  },

  avg_banking_turnover_6_months: {
    type: Number,
    allowNull: true,
  },
  number_of_deposit_txn: {
    type: Number,
    allowNull: true,
  },
  number_of_withdrawal_txn: {
    type: Number,
    allowNull: true,
  },
  abb: {
    type: Number,
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
  business_type: {
    type: String,
    allowNull: true,
  },
  business_vintage_overall: {
    type: Number,
    allowNull: true,
  },
  no_of_customers: {
    type: Number,
    allowNull: true,
  },
  program_type: {
    type: String,
    allowNull: true,
  },
  applied_amount: {
    type: Number,
    allowNull: true,
  },
  loan_int_rate: {
    type: Number,
    allowNull: true,
  },
  vintage_months_partner_platform: {
    type: Number,
    allowNull: true,
  },
  residence_vintage: {
    type: Number,
    allowNull: true,
  },
  negative_area_check: {
    type: Number,
    allowNull: true,
  },
  funding: {
    type: Number,
    allowNull: true,
  },
  ltv: {
    type: Number,
    allowNull: true,
  },
  bureau_type: {
    type: String,
    allowNull: true,
  },
  bureau_score: {
    type: Number,
    allowNull: true,
  },
  customer_type_ntc: {
    type: String,
    allowNull: true,
  },
  bounces_in_three_month: {
    type: Number,
    allowNull: true,
  },
  bounces_in_six_month: {
    type: Number,
    allowNull: true,
  },
  max_dpd_last_6_months: {
    type: Number,
    allowNull: true,
  },
  max_dpd_last_3_months: {
    type: Number,
    allowNull: true,
  },
  max_dpd_last_12_months: {
    type: Number,
    allowNull: true,
  },
  max_overdue_amount: {
    type: Number,
    allowNull: true,
  },
  enquiries_bureau_30_days: {
    type: Number,
    allowNull: true,
  },
  count_overdue_last_90_days: {
    type: Number,
    allowNull: true,
  },
  count_emi_bounce_90_days: {
    type: Number,
    allowNull: true,
  },
  foir: {
    type: Number,
    allowNull: true,
  },
  emi_obligation: {
    type: Number,
    allowNull: true,
  },
  business_expenses_6_months: {
    type: Number,
    allowNull: true,
  },
  cash_runway: {
    type: Number,
    allowNull: true,
  },
  annual_recurring_revenue: {
    type: Number,
    allowNull: true,
  },
  recurring_revenue_growth: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_recurring_revenue: {
    type: Number,
    allowNull: true,
  },
  annual_recurring_revenue_rate: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_revenue: {
    type: Number,
    allowNull: true,
  },
  avg_monthly_gst_turnover: {
    type: Number,
    allowNull: true,
  },
  avg_gst_turnover_l3m: {
    type: Number,
    allowNull: true,
  },
  days_difference: {
    type: Number,
    allowNull: true,
  },
  latest_date_of_arn: {
    type: Date,
    allowNull: true,
  },
  gst_turnover_m0: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m1: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m2: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m3: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m4: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m5: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m6: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m7: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m8: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m9: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m10: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m11: {
    type: Number,
    allowNull: true,
  },
  gst_turnover_m12: {
    type: Number,
    allowNull: true,
  },
  gst_business_name: {
    type: String,
    allowNull: true,
  },
  latest_gst_period: {
    type: String,
    allowNull: true,
  },
  monthly_business_income: {
    type: Number,
    allowNull: true,
  },
  current_od_cc_limit: {
    type: Number,
    allowNull: true,
  },
  dbt_lss_sma_flag: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month_1: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month_2: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month_3: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month_4: {
    type: Number,
    allowNull: true,
  },
  gtv_latest_month_5: {
    type: Number,
    allowNull: true,
  },
  average_monthly_gtv: {
    type: Number,
    allowNull: true,
  },
  dependency_on_anchor: {
    type: Number,
    allowNull: true,
  },
  bill_type: {
    type: String,
    allowNull: true,
  },
  no_of_months_gtv_data: {
    type: Number,
    allowNull: true,
  },
  partner_score: {
    type: Number,
    allowNull: true,
  },
  current_overdue_amount: {
    type: Number,
    allowNull: true,
  },
  max_overdue_amount: {
    type: Number,
    allowNull: true,
  },
  entity_name: {
    type: String,
    allowNull: true,
  },
  loan_amount_requested: {
    type: Number,
    allowNull: true,
  },
  creditor_days_cycle: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month_1: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month_2: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month_3: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month_4: {
    type: Number,
    allowNull: true,
  },
  platform_income_latest_month_5: {
    type: Number,
    allowNull: true,
  },
  platform_average_monthly_income: {
    type: Number,
    allowNull: true,
  },
  margin_percentage_on_gtv: {
    type: Number,
    allowNull: true,
  },
  operating_industry: {
    type: String,
    allowNull: true,
  },
  sub_operating_industry: {
    type: String,
    allowNull: true,
  },
  urc_unit_name: {
    type: String,
    allowNull: true,
  },
  urc_flat: {
    type: String,
    allowNull: true,
  },
  urc_building: {
    type: String,
    allowNull: true,
  },
  urc_village_Town: {
    type: String,
    allowNull: true,
  },
  urc_block: {
    type: String,
    allowNull: true,
  },
  urc_road: {
    type: String,
    allowNull: true,
  },
  urc_city: {
    type: String,
    allowNull: true,
  },
  urc_pin: {
    type: String,
    allowNull: true,
  },
  urc_state: {
    type: String,
    allowNull: true,
  },
  urc_district: {
    type: String,
    allowNull: true,
  },
  urc_reg_no: {
    type: String,
    allowNull: true,
  },
  urc_name_of_ent: {
    type: String,
    allowNull: true,
  },
  urc_incorporation_dt: {
    type: String,
    allowNull: true,
  },
  urc_commencement_dt: {
    type: String,
    allowNull: true,
  },
  urc_ent_type: {
    type: String,
    allowNull: true,
  },
  urc_org_type: {
    type: String,
    allowNull: true,
  },
  urc_owner_name: {
    type: String,
    allowNull: true,
  },
  urc_gender: {
    type: String,
    allowNull: true,
  },
  urc_udym_reg_dt: {
    type: String,
    allowNull: true,
  },
  urc_addr: {
    type: String,
    allowNull: true,
  },
  urc_turnover: {
    type: String,
    allowNull: true,
  },
  urc_nic: {
    type: String,
    allowNull: true,
  },
  urc_investment: {
    type: String,
    allowNull: true,
  },
  urc_ent_activity: {
    type: String,
    allowNull: true,
  },

  //hunter
  pan_match: {
    type: String,
    allowNull: true,
  },
  dob_match: {
    type: String,
    allowNull: true,
  },
  phone_match: {
    type: String,
    allowNull: true,
  },
  name_match: {
    type: String,
    allowNull: true,
  },
  hunter_match: {
    type: String,
    allowNull: true,
  },
  score: {
    type: Number,
    allowNull: true,
  },

  //crime check
  tot_num_cases: {
    type: Number,
    allowNull: true,
  },
  num_disposed_cases: {
    type: Number,
    allowNull: true,
  },
  num_pending_cases: {
    type: Number,
    allowNull: true,
  },

  num_convicted_cases: {
    type: Number,
    allowNull: true,
  },
  num_pend_civil_cases: {
    type: Number,
    allowNull: true,
  },
  num_pend_criminal_cases: {
    type: Number,
    allowNull: true,
  },

  num_pend_tribunal_cases: {
    type: Number,
    allowNull: true,
  },
  num_pend_negotiable_instr_act_cases: {
    type: Number,
    allowNull: true,
  },
  num_pend_traffic_rule_cases: {
    type: Number,
    allowNull: true,
  },

  num_pend_arbitration_cases: {
    type: Number,
    allowNull: true,
  },
  num_disp_civil_cases: {
    type: Number,
    allowNull: true,
  },
  num_disp_criminal_cases: {
    type: Number,
    allowNull: true,
  },

  num_disp_tribunal_cases: {
    type: Number,
    allowNull: true,
  },
  num_disp_negotiable_instr_act_cases: {
    type: Number,
    allowNull: true,
  },
  num_disp_traffic_rule_cases: {
    type: Number,
    allowNull: true,
  },

  num_disp_arbitration_cases: {
    type: Number,
    allowNull: true,
  },
  num_conv_civil_cases: {
    type: Number,
    allowNull: true,
  },
  num_conv_criminal_cases: {
    type: Number,
    allowNull: true,
  },

  num_conv_tribunal_cases: {
    type: Number,
    allowNull: true,
  },
  num_conv_negotiable_instr_act_cases: {
    type: Number,
    allowNull: true,
  },
  num_conv_traffic_rule_cases: {
    type: Number,
    allowNull: true,
  },

  num_conv_arbitration_cases: {
    type: Number,
    allowNull: true,
  },
  nclt_movement_flag: {
    type: String,
    allowNull: true,
  },
  ibbi_flag: {
    type: String,
    allowNull: true,
  },
  case_description: {
    type: Object,
    allowNull: true,
  },

  //A score
  a_score_pb: {
    type: Decimal128,
    allowNull: true,
  },
  a_score_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  a_score_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  a_score_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  a_score_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  a_score_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  //ITR
  itr_turnover_fy1: {
    type: Decimal128,
    allowNull: true,
  },
  itr_turnover_fy2: {
    type: Decimal128,
    allowNull: true,
  },
  itr_turnover_fy3: {
    type: Decimal128,
    allowNull: true,
  },
  annual_expenditure_fy1: {
    type: Decimal128,
    allowNull: true,
  },
  annual_expenditure_fy2: {
    type: Decimal128,
    allowNull: true,
  },
  annual_expenditure_fy3: {
    type: Decimal128,
    allowNull: true,
  },
  pbt_fy1: {
    type: Decimal128,
    allowNull: true,
  },
  pbt_fy2: {
    type: Decimal128,
    allowNull: true,
  },
  pbt_fy3: {
    type: Decimal128,
    allowNull: true,
  },
  tax_paid_fy1: {
    type: Decimal128,
    allowNull: true,
  },

  tax_paid_fy2: {
    type: Decimal128,
    allowNull: true,
  },
  tax_paid_fy3: {
    type: Decimal128,
    allowNull: true,
  },
  filing_date_fy1: {
    type: String,
    allowNull: true,
  },
  is_original_return: {
    type: String,
    allowNull: true,
  },
  //fs variable1
  share_capital_1: {
    type: Decimal128,
    allowNull: true,
  },
  reserves_surplus_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_equity_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_1: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_borrowings_1: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_long_term_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_provisions_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_long_term_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_borrowings_1: {
    type: Decimal128,
    allowNull: true,
  },
  trade_payables_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_provisions_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_liabilities_1: {
    type: Decimal128,
    allowNull: true,
  },
  net_fixed_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  tangible_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  intangible_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  tot_net_fixed_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  capital_wip_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  non_current_investments_1: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_loans_advances_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  tot_other_non_curr_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  current_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  current_investments_1: {
    type: Decimal128,
    allowNull: true,
  },
  inventories_1: {
    type: Decimal128,
    allowNull: true,
  },
  trade_receivables_1: {
    type: Decimal128,
    allowNull: true,
  },
  cash_bank_balances_1: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_loans_advances_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_assets_1: {
    type: Decimal128,
    allowNull: true,
  },
  net_revenue_1: {
    type: Decimal128,
    allowNull: true,
  },
  operating_cost_1: {
    type: Decimal128,
    allowNull: true,
  },
  cost_materials_consumed_1: {
    type: Decimal128,
    allowNull: true,
  },
  purchases_stock_in_trade_1: {
    type: Decimal128,
    allowNull: true,
  },
  changes_inventories_finished_goods_1: {
    type: Decimal128,
    allowNull: true,
  },
  employee_benefit_expense_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_expenses_1: {
    type: Decimal128,
    allowNull: true,
  },
  total_operating_cost_1: {
    type: Decimal128,
    allowNull: true,
  },
  operating_profit_1: {
    type: Decimal128,
    allowNull: true,
  },
  other_income_1: {
    type: Decimal128,
    allowNull: true,
  },
  depreciation_amortization_expense_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_interest_tax_1: {
    type: Decimal128,
    allowNull: true,
  },
  finance_costs_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_exceptional_items_1: {
    type: Decimal128,
    allowNull: true,
  },
  exceptional_items_before_tax_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_1: {
    type: Decimal128,
    allowNull: true,
  },
  income_tax_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_period_continuing_operations_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_discontinuing_operations_tax_1: {
    type: Decimal128,
    allowNull: true,
  },
  profit_for_period_1: {
    type: Decimal128,
    allowNull: true,
  },
  //fs variable 2
  share_capital_2: {
    type: Decimal128,
    allowNull: true,
  },
  reserves_surplus_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_equity_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_2: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_borrowings_2: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_long_term_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_provisions_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_long_term_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_borrowings_2: {
    type: Decimal128,
    allowNull: true,
  },
  trade_payables_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_provisions_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_liabilities_2: {
    type: Decimal128,
    allowNull: true,
  },
  net_fixed_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  tangible_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  intangible_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  tot_net_fixed_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  capital_wip_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  non_current_investments_2: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_loans_advances_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  tot_other_non_curr_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  current_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  current_investments_2: {
    type: Decimal128,
    allowNull: true,
  },
  inventories_2: {
    type: Decimal128,
    allowNull: true,
  },
  trade_receivables_2: {
    type: Decimal128,
    allowNull: true,
  },
  cash_bank_balances_2: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_loans_advances_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_assets_2: {
    type: Decimal128,
    allowNull: true,
  },
  net_revenue_2: {
    type: Decimal128,
    allowNull: true,
  },
  operating_cost_2: {
    type: Decimal128,
    allowNull: true,
  },
  cost_materials_consumed_2: {
    type: Decimal128,
    allowNull: true,
  },
  purchases_stock_in_trade_2: {
    type: Decimal128,
    allowNull: true,
  },
  changes_inventories_finished_goods_2: {
    type: Decimal128,
    allowNull: true,
  },
  employee_benefit_expense_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_expenses_2: {
    type: Decimal128,
    allowNull: true,
  },
  total_operating_cost_2: {
    type: Decimal128,
    allowNull: true,
  },
  operating_profit_2: {
    type: Decimal128,
    allowNull: true,
  },
  other_income_2: {
    type: Decimal128,
    allowNull: true,
  },
  depreciation_amortization_expense_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_interest_tax_2: {
    type: Decimal128,
    allowNull: true,
  },
  finance_costs_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_exceptional_items_2: {
    type: Decimal128,
    allowNull: true,
  },
  exceptional_items_before_tax_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_2: {
    type: Decimal128,
    allowNull: true,
  },
  income_tax_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_period_continuing_operations_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_discontinuing_operations_tax_2: {
    type: Decimal128,
    allowNull: true,
  },
  profit_for_period_2: {
    type: Decimal128,
    allowNull: true,
  },
  //fs variable 3
  share_capital_3: {
    type: Decimal128,
    allowNull: true,
  },
  reserves_surplus_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_equity_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_3: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_borrowings_3: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_long_term_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_provisions_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_long_term_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_borrowings_3: {
    type: Decimal128,
    allowNull: true,
  },
  trade_payables_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_provisions_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_equity_liabilities_3: {
    type: Decimal128,
    allowNull: true,
  },
  net_fixed_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  tangible_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  intangible_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  tot_net_fixed_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  capital_wip_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  non_current_investments_3: {
    type: Decimal128,
    allowNull: true,
  },
  net_def_tax_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  long_term_loans_advances_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_non_current_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  tot_other_non_curr_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  current_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  current_investments_3: {
    type: Decimal128,
    allowNull: true,
  },
  inventories_3: {
    type: Decimal128,
    allowNull: true,
  },
  trade_receivables_3: {
    type: Decimal128,
    allowNull: true,
  },
  cash_bank_balances_3: {
    type: Decimal128,
    allowNull: true,
  },
  short_term_loans_advances_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_current_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_current_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_assets_3: {
    type: Decimal128,
    allowNull: true,
  },
  net_revenue_3: {
    type: Decimal128,
    allowNull: true,
  },
  operating_cost_3: {
    type: Decimal128,
    allowNull: true,
  },
  cost_materials_consumed_3: {
    type: Decimal128,
    allowNull: true,
  },
  purchases_stock_in_trade_3: {
    type: Decimal128,
    allowNull: true,
  },
  changes_inventories_finished_goods_3: {
    type: Decimal128,
    allowNull: true,
  },
  employee_benefit_expense_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_expenses_3: {
    type: Decimal128,
    allowNull: true,
  },
  total_operating_cost_3: {
    type: Decimal128,
    allowNull: true,
  },
  operating_profit_3: {
    type: Decimal128,
    allowNull: true,
  },
  other_income_3: {
    type: Decimal128,
    allowNull: true,
  },
  depreciation_amortization_expense_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_interest_tax_3: {
    type: Decimal128,
    allowNull: true,
  },
  finance_costs_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_exceptional_items_3: {
    type: Decimal128,
    allowNull: true,
  },
  exceptional_items_before_tax_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_before_tax_3: {
    type: Decimal128,
    allowNull: true,
  },
  income_tax_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_period_continuing_operations_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_discontinuing_operations_tax_3: {
    type: Decimal128,
    allowNull: true,
  },
  profit_for_period_3: {
    type: Decimal128,
    allowNull: true,
  },
  //consumer bureau applicant

  '1+dpd_oustanding_perc_br': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_br': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_br': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_br': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_br: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_br: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_br: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_br: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_br: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_br: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_br: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_br: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_br: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_br: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_br: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_br: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_br: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_br: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_br: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_br: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_br: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_br: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_br: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_br: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_br: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_br: {
    type: Number,
    allowNull: true,
  },
  //consumer bureau co applicant 1

  '1+dpd_oustanding_perc_cb1': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_cb1': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_cb1': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_cb1': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_cb1: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_cb1: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_cb1: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_cb1: {
    type: Number,
    allowNull: true,
  },
  //consumer bureau co applicant 2

  '1+dpd_oustanding_perc_cb2': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_cb2': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_cb2': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_cb2': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_cb2: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_cb2: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_cb2: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_cb2: {
    type: Number,
    allowNull: true,
  },
  //consumer bureau co applicant 3

  '1+dpd_oustanding_perc_cb3': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_cb3': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_cb3': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_cb3': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_cb3: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_cb3: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_cb3: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_cb3: {
    type: Number,
    allowNull: true,
  },
  //consumer bureau co applicant 4

  '1+dpd_oustanding_perc_cb4': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_cb4': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_cb4': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_cb4': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_cb4: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_cb4: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_cb4: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_cb4: {
    type: Number,
    allowNull: true,
  },
  //consumer bureau co applicant 5

  '1+dpd_oustanding_perc_cb5': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_cb5': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_cb5': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_cb5': {
    type: Decimal128,
    allowNull: true,
  },
  active_secured_loan_or_credit_card_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_outstanding_loan_amt_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  bureau_score_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  credit_card_settlement_amount_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_value_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_credit_card_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_credit_card_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_30_days_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_credit_card_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_9_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_bureau_30_days_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_30_days_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_unsecured_excl_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  ninety_plus_dpd_in_last_24_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  sum_of_credit_balance_in_all_credit_cards_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  total_overdues_in_cc_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_credit_card_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  curren_emi_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_24m_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  max_emi_last_12m_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  emi_drop_next_6m_cb5: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_cb5: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_cb5: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_cb5: {
    type: Number,
    allowNull: true,
  },
  //commercial bureau
  '1+dpd_oustanding_perc_com': {
    type: Decimal128,
    allowNull: true,
  },
  '30+dpd_oustanding_perc_com': {
    type: Decimal128,
    allowNull: true,
  },
  '60+dpd_oustanding_perc_com': {
    type: Decimal128,
    allowNull: true,
  },
  '90+dpd_oustanding_perc_com': {
    type: Decimal128,
    allowNull: true,
  },
  cmr_score_com: {
    type: Decimal128,
    allowNull: true,
  },
  CC_OD_limit_com: {
    type: Decimal128,
    allowNull: true,
  },
  CC_OD_overdue_com: {
    type: Decimal128,
    allowNull: true,
  },
  WC_Limit_com: {
    type: Decimal128,
    allowNull: true,
  },
  cnt_active_unsecured_loans_com: {
    type: Decimal128,
    allowNull: true,
  },
  count_total_active_loans_com: {
    type: Decimal128,
    allowNull: true,
  },
  current_overdue_amount_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_1_months_Unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_12_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_24_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_3_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_36_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_secured_com: {
    type: Decimal128,
    allowNull: true,
  },
  dpd_in_last_6_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_1_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_3_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  enquiries_in_last_6_months_unsecured_com: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_12_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_3_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  loans_opened_last_6_months_com: {
    type: Decimal128,
    allowNull: true,
  },
  outstanding_loan_amt_com: {
    type: Decimal128,
    allowNull: true,
  },
  settlement_amount_com: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_amount_com: {
    type: Decimal128,
    allowNull: true,
  },
  suitfiled_flag_com: {
    type: Decimal128,
    allowNull: true,
  },
  unsecured_outstanding_loan_amt_com: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_amount_com: {
    type: Decimal128,
    allowNull: true,
  },
  written_off_settled_flag_com: {
    type: Decimal128,
    allowNull: true,
  },
  current_emi_com: {
    type: Decimal128,
    allowNull: true,
  },
  SMA_Flag_last_12m_com: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_24m_com: {
    type: Number,
    allowNull: true,
  },
  SMA_Flag_last_36m_com: {
    type: Number,
    allowNull: true,
  },
  escore_com: {
    type: Decimal128,
    allowNull: true,
  },
  //banking
  average_balance: {
    type: Decimal128,
    allowNull: true,
  },
  average_balance_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  average_balance_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  average_balance_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  average_balance_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_credits: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_credits_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_credits_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_credits_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_credits_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_debits: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_debits_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_debits_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_debits_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  avg_monthly_debits_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  cash_credit_counts_last_1m: {
    type: Number,
    allowNull: true,
  },
  cash_credit_counts_last_3m: {
    type: Number,
    allowNull: true,
  },
  cash_credit_counts_last_6m: {
    type: Number,
    allowNull: true,
  },
  cash_credit_counts_last_12m: {
    type: Number,
    allowNull: true,
  },
  cash_credits_count: {
    type: Decimal128,
    allowNull: true,
  },
  cash_withdrawals_count: {
    type: Decimal128,
    allowNull: true,
  },
  cash_withdrawals_count_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  cash_withdrawals_count_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  cash_withdrawals_count_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  cash_withdrawals_count_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  current_balance: {
    type: Decimal128,
    allowNull: true,
  },
  deposit_count: {
    type: Number,
    allowNull: true,
  },
  deposit_count_last_1m: {
    type: Number,
    allowNull: true,
  },
  deposit_count_last_3m: {
    type: Number,
    allowNull: true,
  },
  deposit_count_last_6m: {
    type: Number,
    allowNull: true,
  },
  deposit_count_last_12m: {
    type: Number,
    allowNull: true,
  },
  end_date: {
    type: Date,
    allowNull: true,
  },
  max_balance: {
    type: Decimal128,
    allowNull: true,
  },
  max_balance_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  max_balance_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  max_balance_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  max_balance_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  min_balance: {
    type: Decimal128,
    allowNull: true,
  },
  min_balance_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  min_balance_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  min_balance_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  min_balance_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  monthly_credit_median_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  monthly_credit_median_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  monthly_credit_median_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  monthly_credit_median_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  name: {
    type: String,
    allowNull: true,
  },
  opening_balance: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounce_amount: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounce_amount_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounce_amount_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounce_amount_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounce_amount_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  inward_bounces_count: {
    type: Number,
    allowNull: true,
  },
  inward_bounces_count_last_1m: {
    type: Number,
    allowNull: true,
  },
  inward_bounces_count_last_3m: {
    type: Number,
    allowNull: true,
  },
  inward_bounces_count_last_6m: {
    type: Number,
    allowNull: true,
  },
  inward_bounces_count_last_12m: {
    type: Number,
    allowNull: true,
  },
  pos_upi: {
    type: Decimal128,
    allowNull: true,
  },
  tot_pos_upi_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  tot_pos_upi_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  tot_pos_upi_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  tot_pos_upi_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  regular_debits_count: {
    type: Number,
    allowNull: true,
  },
  regular_debits_count_last_1m: {
    type: Number,
    allowNull: true,
  },
  regular_debits_count_last_3m: {
    type: Number,
    allowNull: true,
  },
  regular_debits_count_last_6m: {
    type: Number,
    allowNull: true,
  },
  regular_debits_count_last_12m: {
    type: Number,
    allowNull: true,
  },
  salary_dates: {
    type: Date,
    allowNull: true,
  },
  salary_flag: {
    type: Number,
    allowNull: true,
  },
  stable_monthly_inflow: {
    type: Decimal128,
    allowNull: true,
  },
  start_date: {
    type: Date,
    allowNull: true,
  },
  total_cash_withdrawal: {
    type: Decimal128,
    allowNull: true,
  },
  total_cash_withdrawal_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_cash_withdrawal_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_cash_withdrawal_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_cash_withdrawal_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  total_credit_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_credit_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_credit_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_credit_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  total_credits: {
    type: Decimal128,
    allowNull: true,
  },
  total_debit_to_credit_ratio: {
    type: Decimal128,
    allowNull: true,
  },
  total_debit_to_credit_ratio_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debit_to_credit_ratio_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debit_to_credit_ratio_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debit_to_credit_ratio_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debits: {
    type: Decimal128,
    allowNull: true,
  },
  total_debits_count: {
    type: Number,
    allowNull: true,
  },
  total_debits_count_last_1m: {
    type: Number,
    allowNull: true,
  },
  total_debits_count_last_3m: {
    type: Number,
    allowNull: true,
  },
  total_debits_count_last_6m: {
    type: Number,
    allowNull: true,
  },
  total_debits_count_last_12m: {
    type: Number,
    allowNull: true,
  },
  total_debits_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debits_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debits_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_debits_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  total_deposit: {
    type: Decimal128,
    allowNull: true,
  },
  total_deposit_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_deposit_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_deposit_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_deposit_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  total_negative_incedent_count: {
    type: Number,
    allowNull: true,
  },
  total_negative_incedent_count_last_1m: {
    type: Number,
    allowNull: true,
  },
  total_negative_incedent_count_last_3m: {
    type: Number,
    allowNull: true,
  },
  total_negative_incedent_count_last_6m: {
    type: Number,
    allowNull: true,
  },
  total_negative_incedent_count_last_12m: {
    type: Number,
    allowNull: true,
  },
  latest_salary: {
    type: Decimal128,
    allowNull: true,
  },
  total_surplus: {
    type: Decimal128,
    allowNull: true,
  },
  total_surplus_last_1m: {
    type: Decimal128,
    allowNull: true,
  },
  total_surplus_last_3m: {
    type: Decimal128,
    allowNull: true,
  },
  total_surplus_last_6m: {
    type: Decimal128,
    allowNull: true,
  },
  total_surplus_last_12m: {
    type: Decimal128,
    allowNull: true,
  },
  transaction_count: {
    type: Number,
    allowNull: true,
  },
  account_number: {
    type: String,
    allowNull: true,
  },
  account_type: {
    type: String,
    allowNull: true,
  },
  bank_name: {
    type: String,
    allowNull: true,
  },
  min_avg_mthly_bal_l6m: {
    type: Decimal128,
    allowNull: true,
  },
  min_avg_mthly_bal_l12m: {
    type: Decimal128,
    allowNull: true,
  },
});

var CamsDetails = (module.exports = mongoose.model(
  'cams_details',
  CamsDetailsSchema,
  'cams_details',
));

module.exports.addNew = (data) => {
  return CamsDetails.create(data);
};

module.exports.findByLAID = (loan_app_id) => {
  return CamsDetails.findOne({ loan_app_id });
};

module.exports.updateCamsDetails = (loan_app_id, data) => {
  return CamsDetails.findOneAndUpdate({ loan_app_id }, data, { new: true });
};

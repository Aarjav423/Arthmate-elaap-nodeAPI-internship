const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const validate = require('../util/validate-req-body.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const CamsDetailsSchema = require('../models/cams-details-schema.js');
const camsDataEvent = require('../util/camsDataEvent');
let reqUtils = require('../util/req.js');

const validateCamsDetailsData = async (req, res, next) => {
  try {
    const template = [
      {
        field: 'gross_profit',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gross_profit ',
      },
      {
        field: 'pbt',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid pbt ',
      },
      {
        field: 'total_revenue',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_revenue ',
      },
      {
        field: 'non_operating_income',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid non_operating_income ',
      },
      {
        field: 'depreciation',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid depreciation ',
      },
      {
        field: 'interest_expense',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid interest_expense ',
      },
      {
        field: 'pat',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid pat ',
      },

      {
        field: 'equity',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid equity ',
      },

      {
        field: 'reserve_and_surplus',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid reserve_and_surplus ',
      },
      {
        field: 'secured_loans',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid secured_loans ',
      },
      {
        field: 'unsecured_loans',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid unsecured_loans ',
      },
      {
        field: 'cc_od_limit',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid cc_od_limit ',
      },
      {
        field: 'short_term_liabilities',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid short_term_liabilities ',
      },
      {
        field: 'long_term_liabilities',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid long_term_liabilities ',
      },
      {
        field: 'intangible_assets',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid long_term_liabilities ',
      },
      {
        field: 'debtors',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid debtors ',
      },
      {
        field: 'creditors',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid creditors ',
      },
      {
        field: 'stock',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid stock ',
      },
      {
        field: 'current_assets',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid current_assets ',
      },
      {
        field: 'inventory',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid inventory ',
      },
      {
        field: 'prepaid_expenses',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid prepaid_expenses ',
      },
      {
        field: 'current_liabilities',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid current_liabilities ',
      },
      {
        field: 'total_expenses',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_expenses ',
      },
      {
        field: 'opening_stock',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid opening_stock ',
      },
      {
        field: 'purchases',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid purchases ',
      },
      {
        field: 'working_capital',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid working_capital ',
      },
      {
        field: 'total_assets',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_assets ',
      },
      {
        field: 'retained_earnings',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid retained_earnings ',
      },
      {
        field: 'total_liabilities',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_liabilities ',
      },
      {
        field: 'total_debit_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_debit_l6m ',
      },
      {
        field: 'total_debit_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_debit_l3m ',
      },
      {
        field: 'total_credit_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_credit_l6m ',
      },
      {
        field: 'total_credit_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_credit_l3m ',
      },
      {
        field: 'mnthly_avg_bal_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid mnthly_avg_bal_l6m ',
      },
      {
        field: 'mnthly_avg_bal_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid mnthly_avg_bal_l3m ',
      },
      {
        field: 'mnthly_avg_bal_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid mnthly_avg_bal_l3m ',
      },
      {
        field: 'latest_bal',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid latest_bal ',
      },
      {
        field: 'outward_chq_bounce_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid outward_chq_bounce_l6m ',
      },
      {
        field: 'outward_chq_bounce_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid outward_chq_bounce_l3m ',
      },
      {
        field: 'inward_chq_bounce_due_to_insuff_fnds_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid inward_chq_bounce_due_to_insuff_fnds_l6m ',
      },
      {
        field: 'inward_chq_bounce_due_to_insuff_fnds_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid inward_chq_bounce_due_to_insuff_fnds_l3m ',
      },
      {
        field: 'total_ecs_bounce_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_ecs_bounce_l6m ',
      },
      {
        field: 'total_ecs_bounce_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_ecs_bounce_l3m ',
      },
      {
        field: 'cnt_of_txn_decl_due_to_insuff_funds_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid cnt_of_txn_decl_due_to_insuff_funds_l6m ',
      },
      {
        field: 'cnt_of_txn_decl_due_to_insuff_funds_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid cnt_of_txn_decl_due_to_insuff_funds_l3m ',
      },
      {
        field: 'time_snce_lst_bounce',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid time_snce_lst_bounce ',
      },
      {
        field: 'ttl_amt_of_cash_withdrawls_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_cash_withdrawls_l6m ',
      },
      {
        field: 'ttl_amt_of_atm_txn_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_atm_txn_l6m ',
      },
      {
        field: 'total_ecs_bounce_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_ecs_bounce_l3m ',
      },
      {
        field: 'cnt_of_txn_decl_due_to_insuff_funds_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid cnt_of_txn_decl_due_to_insuff_funds_l6m ',
      },
      {
        field: 'time_snce_lst_bounce',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid time_snce_lst_bounce ',
      },
      {
        field: 'ttl_amt_of_cash_withdrawls_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_cash_withdrawls_l6m ',
      },
      {
        field: 'ttl_amt_of_atm_txn_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_atm_txn_l6m ',
      },
      {
        field: 'ttl_cnt_of_atm_txn_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_cnt_of_atm_txn_l6m ',
      },
      {
        field: 'ttl_amt_of_pos_txn_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_pos_txn_l6m ',
      },
      {
        field: 'ttl_amt_of_cash_dep_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_amt_of_cash_dep_l6m ',
      },
      {
        field: 'ttl_annual_oblig',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_annual_oblig ',
      },
      {
        field: 'thirty_dpd_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid thirty_dpd_l3m ',
      },
      {
        field: 'sixty_dpd_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid sixty_dpd_l6m ',
      },
      {
        field: 'ninety_dpd_l12m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ninety_dpd_l12m ',
      },
      {
        field: 'writeoff_settlement_l24m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid writeoff_settlement_l24m ',
      },
      {
        field: 'crrnt_cmr_score',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid crrnt_cmr_score ',
      },
      {
        field: 'ttl_gst_turnover_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_gst_turnover_l6m ',
      },
      {
        field: 'ttl_gst_turnover_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_gst_turnover_l3m ',
      },
      {
        field: 'lst_mnth_gst_turnover',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid lst_mnth_gst_turnover ',
      },
      {
        field: 'ttl_gst_paid_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_gst_paid_l6m ',
      },
      {
        field: 'ttl_gst_paid_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_gst_paid_l3m ',
      },
      {
        field: 'lst_mnth_gst_paid',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid lst_mnth_gst_paid ',
      },
      {
        field: 'null_gst_filing_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid null_gst_filing_l6m ',
      },
      {
        field: 'one_shot_gst_filing_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid one_shot_gst_filing_l6m ',
      },
      {
        field: 'cnt_of_gst_filing_missed_l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid cnt_of_gst_filing_missed_l6m ',
      },
      {
        field: 'cnt_of_gst_filing_missed_l3m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid cnt_of_gst_filing_missed_l3m ',
      },
      {
        field: 'cnt_of_txn_decl_due_to_insuff_funds _l6m',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid cnt_of_gst_filing_missed_l3m ',
      },
      {
        field: 'ttl_itr_income_last_year',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_itr_income_last_year ',
      },
      {
        field: 'ttl_itr_income_last_year_minus_one',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_itr_income_last_year_minus_one ',
      },
      {
        field: 'total_itr_tax_last_year',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_itr_tax_last_year ',
      },
      {
        field: 'total_itr_tax_last_year_minus_one',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid total_itr_tax_last_year_minus_one ',
      },
      {
        field: 'itr_filing_missed_l2y',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid itr_filing_missed_l2y ',
      },
      {
        field: 'advance_tax_paid_last_year',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid advance_tax_paid_last_year ',
      },

      {
        field: 'ttl_itr_expense_last_year',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ttl_itr_expense_last_year ',
      },
      {
        field: 'ttl_itr_expense_last_year_minus_one',
        type: 'number',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid ttl_itr_expense_last_year_minus_one ',
      },
      {
        field: 'status',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'status is mandatory ',
      },
      {
        field: 'avg_banking_turnover_6_months',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid avg_banking_turnover_6_months',
      },
      {
        field: 'number_of_deposit_txn',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid number_of_deposit_txn',
      },
      {
        field: 'abb',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid abb',
      },
      {
        field: 'abb_1',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid abb_1',
      },
      {
        field: 'abb_2',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid abb_2',
      },
      {
        field: 'business_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid business_type',
      },
      {
        field: 'business_vintage_overall',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid business_vintage_overall',
      },
      {
        field: 'no_of_customers',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid no_of_customers',
      },
      {
        field: 'program_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid program_type',
      },
      {
        field: 'applied_amount',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid applied_amount',
      },
      {
        field: 'loan_int_rate',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid loan_int_rate',
      },
      {
        field: 'vintage_months_partner_platform',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid vintage_months_partner_platform',
      },
      {
        field: 'residence_vintage',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid residence_vintage',
      },
      {
        field: 'negative_area_check',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid negative_area_check',
      },
      {
        field: 'funding',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid funding',
      },
      {
        field: 'ltv',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid ltv',
      },
      {
        field: 'bureau_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bureau_type',
      },
      {
        field: 'bureau_score',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bureau_score',
      },
      {
        field: 'customer_type_ntc',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid customer_type_ntc',
      },
      {
        field: 'bounces_in_three_month',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bounces_in_three_month',
      },
      {
        field: 'bounces_in_six_month',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bounces_in_six_month',
      },
      {
        field: 'max_dpd_last_6_months',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid max_dpd_last_6_months',
      },
      {
        field: 'max_dpd_last_3_months',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid max_dpd_last_3_months',
      },
      {
        field: 'max_dpd_last_12_months',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid max_dpd_last_12_months',
      },
      {
        field: 'max_overdue_amount',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid max_overdue_amount',
      },
      {
        field: 'number_of_withdrawal_txn',
        type: 'number',
        checked: 'FALSE',
        validationmsg: 'Please enter valid number_of_withdrawal_txn',
      },
      {
        field: 'enquiries_bureau_30_days',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid enquiries_bureau_30_days',
      },
      {
        field: 'count_overdue_last_90_days',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid count_overdue_last_90_days',
      },
      {
        field: 'count_emi_bounce_90_days',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid count_emi_bounce_90_days',
      },
      {
        field: 'foir',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid foir',
      },
      {
        field: 'emi_obligation',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid emi_obligation',
      },
      {
        field: 'business_expenses_6_months',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid business_expenses_6_months',
      },
      {
        field: 'cash_runway',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid cash_runway',
      },
      {
        field: 'annual_recurring_revenue',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid annual_recurring_revenue',
      },
      {
        field: 'recurring_revenue_growth',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid recurring_revenue_growth',
      },
      {
        field: 'avg_monthly_recurring_revenue',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid avg_monthly_recurring_revenue',
      },
      {
        field: 'avg_monthly_revenue',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid avg_monthly_revenue',
      },
      {
        field: 'avg_monthly_gst_turnover',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid avg_monthly_gst_turnover',
      },
      {
        field: 'avg_gst_turnover_l3m',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid avg_gst_turnover_l3m',
      },
      {
        field: 'days_difference',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid days_difference',
      },
      {
        field: 'latest_date_of_arn',
        type: 'date',
        checked: 'FALSE',
        validationmsg: 'Please enter valid latest_date_of_arn',
      },
      {
        field: 'gst_turnover_m0',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m0',
      },
      {
        field: 'gst_turnover_m1',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m1',
      },
      {
        field: 'gst_turnover_m2',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m2',
      },
      {
        field: 'gst_turnover_m3',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m3',
      },
      {
        field: 'gst_turnover_m4',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m4',
      },
      {
        field: 'gst_turnover_m5',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m5',
      },
      {
        field: 'gst_turnover_m6',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m6',
      },
      {
        field: 'gst_turnover_m7',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m7',
      },
      {
        field: 'gst_turnover_m8',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m8',
      },
      {
        field: 'gst_turnover_m9',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m9',
      },
      {
        field: 'gst_turnover_m10',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m10',
      },
      {
        field: 'gst_turnover_m11',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m11',
      },
      {
        field: 'gst_turnover_m12',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_turnover_m12',
      },
      {
        field: 'gst_business_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gst_business_name',
      },
      {
        field: 'latest_gst_period',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid latest_gst_period',
      },
      {
        field: 'monthly_business_income',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid monthly_business_income',
      },
      {
        field: 'current_od_cc_limit',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid current_od_cc_limit',
      },
      {
        field: 'dbt_lss_sma_flag',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid dbt_lss_sma_flag',
      },
      {
        field: 'gtv_latest_month',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month',
      },
      {
        field: 'gtv_latest_month_1',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month_1',
      },
      {
        field: 'gtv_latest_month_2',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month_2',
      },
      {
        field: 'gtv_latest_month_3',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month_3',
      },
      {
        field: 'gtv_latest_month_4',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month_4',
      },
      {
        field: 'gtv_latest_month_5',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gtv_latest_month_5',
      },
      {
        field: 'average_monthly_gtv',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid average_monthly_GTV',
      },
      {
        field: 'dependency_on_anchor',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid dependency_on_anchor',
      },
      {
        field: 'bill_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bill_type',
      },
      {
        field: 'no_of_months_gtv_data',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid no_of_months_gtv_data',
      },
      {
        field: 'partner_score',
        type: 'floatr',
        checked: 'FALSE',
        validationmsg: 'Please enter valid partner_score',
      },
      {
        field: 'current_overdue_amount',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid current_overdue_amount',
      },
      {
        field: 'creditor_days_cycle',
        type: 'integer',
        checked: 'FALSE',
        validationmsg: 'Please enter valid creditor_days_cycle',
      },
      {
        field: 'entity_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid entity_name',
      },
      {
        field: 'loan_amount_requested',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid loan_amount_requested',
      },
      {
        field: 'annual_recurring_revenue_rate',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid annual_recurring_revenue_rate',
      },
      {
        field: 'platform_income_latest_month',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month',
      },
      {
        field: 'platform_income_latest_month_1',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month -1',
      },
      {
        field: 'platform_income_latest_month_2',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month -2',
      },
      {
        field: 'platform_income_latest_month_3',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month -3',
      },
      {
        field: 'platform_income_latest_month_4',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month -4',
      },
      {
        field: 'platform_income_latest_month_5',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_income_latest_month -5',
      },
      {
        field: 'platform_average_monthly_income',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid platform_average_monthly_income',
      },
      {
        field: 'margin_percentage_on_gtv',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid margin_percentage_on_gtv',
      },
      {
        field: 'operating_industry',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid operating_industry',
      },
      {
        field: 'sub_operating_industry',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid sub_operating_industry',
      },
      {
        title: 'Unit Name',
        name: 'urc_unit_name',
        field: 'urc_unit_name',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_unit_name',
        type: 'string',
        presentInLoanApi: 'No',
      },
      {
        title: 'Flat',
        name: 'urc_flat',
        presentInLoanApi: 'No',
        field: 'urc_flat',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_flat',
        type: 'string',
      },
      {
        title: 'Building',
        name: 'urc_building',
        presentInLoanApi: 'No',
        field: 'urc_building',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_building',
        type: 'string',
      },
      {
        title: 'Village/Town',
        name: 'urc_village_Town',
        presentInLoanApi: 'No',
        field: 'urc_village_Town',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_village_Town',
        type: 'string',
      },
      {
        title: 'Block',
        name: 'urc_block',
        presentInLoanApi: 'No',
        field: 'urc_block',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_block',
        type: 'string',
      },
      {
        title: 'Road',
        name: 'urc_road',
        presentInLoanApi: 'No',
        field: 'urc_road',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_road',
        type: 'string',
      },
      {
        title: 'City',
        name: 'urc_city',
        presentInLoanApi: 'No',
        field: 'urc_city',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_city',
        type: 'string',
      },
      {
        title: 'Pin',
        name: 'urc_pin',
        presentInLoanApi: 'No',
        field: 'urc_pin',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_pin',
        type: 'string',
      },
      {
        title: 'State',
        name: 'urc_state',
        presentInLoanApi: 'No',
        field: 'urc_state',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_state',
        type: 'string',
      },
      {
        title: 'District',
        name: 'urc_district',
        presentInLoanApi: 'No',
        field: 'urc_district',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_district',
        type: 'string',
      },
      {
        title: 'Reg No.',
        name: 'urc_reg_no',
        presentInLoanApi: 'No',
        field: 'urc_reg_no',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_reg_no',
        type: 'string',
      },
      {
        title: ' Name of Enterprise',
        name: 'urc_name_of_ent',
        presentInLoanApi: 'No',
        field: 'urc_name_of_ent',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_name_of_ent',
        Type: 'string',
      },
      {
        title: 'Incorporation Date',
        name: 'urc_incorporation_dt',
        presentInLoanApi: 'No',
        field: 'urc_incorporation_dt',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_incorporation_dt',
        type: 'string',
      },
      {
        title: 'Commencement Date',
        name: 'urc_commencement_dt',
        presentInLoanApi: 'No',
        field: 'urc_commencement_dt',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_commencement_dt',
        type: 'string',
      },
      {
        title: 'Enterprise Type',
        name: 'urc_ent_type',
        presentInLoanApi: 'No',
        field: 'urc_ent_type',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_ent_type',
        type: 'string',
      },
      {
        title: 'Organisation Type',
        name: 'urc_org_type',
        presentInLoanApi: 'No',
        field: 'urc_org_type',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_org_type',
        type: 'string',
      },
      {
        title: 'Owner Name',
        name: 'urc_owner_name',
        presentInLoanApi: 'No',
        field: 'urc_owner_name',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_owner_name',
        type: 'string',
      },
      {
        title: 'Gender',
        name: 'urc_gender',
        presentInLoanApi: 'No',
        field: 'urc_gender',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_gender',
        type: 'string',
      },
      {
        title: 'Udhyam Registration Date',
        name: 'urc_udym_reg_dt',
        presentInLoanApi: 'No',
        field: 'urc_udym_reg_dt',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_udym_reg_dt',
        type: 'string',
      },
      {
        title: 'Address',
        name: 'urc_addr',
        presentInLoanApi: 'No',
        field: 'urc_addr',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_addr',
        type: 'string',
      },
      {
        title: 'Turnover',
        name: 'urc_turnover',
        presentInLoanApi: 'No',
        field: 'urc_turnover',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_turnover',
        Type: 'string',
      },
      {
        title: 'NIC',
        name: 'urc_nic',
        presentInLoanApi: 'No',
        field: 'urc_nic',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_nic',
        Type: 'string',
      },
      {
        title: 'Investment',
        name: 'urc_investment',
        presentInLoanApi: 'No',
        field: 'urc_investment',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_investment',
        Type: 'string',
      },
      {
        title: 'Enterprise Activity',
        name: 'urc_ent_activity',
        presentInLoanApi: 'No',
        field: 'urc_ent_activity',
        checked: 'FALSE',
        validationmsg: 'Please enter valid urc_ent_activity',
        Type: 'string',
      },
    ];
    //validate request data with above data
    const result = await validate.validateDataWithTemplate(template, [
      req.body,
    ]);
    if (!result)
      throw {
        success: false,
        message: 'Error while validating data with template.',
      };
    if (result.unknownColumns.length)
      throw {
        success: false,
        message: 'Few columns are unknown',
        data: {
          unknownColumns: result.unknownColumns,
        },
      };
    if (result.missingColumns.length)
      throw {
        success: false,
        message: 'Few columns are missing',
        data: {
          missingColumns: result.missingColumns,
        },
      };
    if (result.errorRows.length)
      throw {
        success: false,
        message: 'Few fields have invalid data',
        data: {
          exactErrorRows: result.exactErrorColumns,
          errorRows: result.errorRows,
        },
      };

    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to record cams details data.
  app.post(
    '/api/cams-details/:loan_app_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateCamsDetailsData,
    async (req, res, next) => {
      try {
        const { loan_app_id } = req.params;
        const data = req.body;
        //Validate if lead exist by loan_app_id.
        let leadExist = await LoanRequestSchema.findIfExists(loan_app_id);
        if (!leadExist)
          throw {
            success: false,
            message: 'No lead found against loan_app_id.',
          };
        // company and product authorization.
        if (leadExist.company_id !== req.company._id)
          throw {
            success: false,
            message: 'Authorization mismatch for company_id.',
          };
        if (leadExist.product_id !== req.product._id)
          throw {
            success: false,
            message: 'Authorization mismatch for product_id.',
          };
        //Validate lead should not be soft deleted.
        if (leadExist.is_deleted == 1)
          throw {
            success: false,
            message: 'Unable to add cams details as lead is deleted.',
          };
        //Validate if data already exist against loan_app_id.
        const dataAlreadyExist =
          await CamsDetailsSchema.findByLAID(loan_app_id);
        if (dataAlreadyExist && dataAlreadyExist.status === 'confirmed')
          throw {
            success: false,
            message: 'Cams details already exist against loan_app_id.',
          };
        data.loan_app_id = loan_app_id;
        data.company_id = req.company._id;
        data.company_name = req.company.name;
        data.product_id = req.product._id;
        data.product_name = req.product.name;
        let recordCamsDetails;
        if (dataAlreadyExist && dataAlreadyExist.status === 'open') {
          recordCamsDetails = await CamsDetailsSchema.updateCamsDetails(
            loan_app_id,
            data,
          );
        } else {
          recordCamsDetails = await CamsDetailsSchema.addNew(data);
        }

        // let urcParsedData = leadExist.urc_parsing_data
        //   ? JSON.parse(leadExist.urc_parsing_data)
        //   : null;
        // if (urcParsedData) {
        //   //unit_name
        //   urcParsedData.data.unitDetails.data[0]["Unit Name"] =
        //     data.urc_unit_name;
        //   //flat
        //   urcParsedData.data.unitDetails.data[0]["Flat"] = data.urc_flat;
        //   //building
        //   urcParsedData.data.unitDetails.data[0]["Building"] =
        //     data.urc_building;
        //   //village_town
        //   urcParsedData.data.unitDetails.data[0]["Village/Town"] =
        //     data.urc_village_Town;
        //   //block
        //   urcParsedData.data.unitDetails.data[0]["Block"] = data.urc_block;
        //   //road
        //   urcParsedData.data.unitDetails.data[0]["Road"] = data.urc_road;
        //   //city
        //   urcParsedData.data.unitDetails.data[0]["City"] = data.urc_city;
        //   //pin
        //   urcParsedData.data.unitDetails.data[0]["Pin"] = data.urc_pin;
        //   //state
        //   urcParsedData.data.unitDetails.data[0]["State"] = data.urc_state;
        //   //district
        //   urcParsedData.data.unitDetails.data[0]["District"] =
        //     data.urc_district;
        //   //reg_no
        //   urcParsedData.data.regNo = data.urc_reg_no;
        //   //Name of enterprise
        //   urcParsedData.data.unitName = data.urc_name_of_ent;
        //   //incorporation_date
        //   urcParsedData.data.incorporationDt = data.urc_incorporation_dt;
        //   //commencement_date
        //   urcParsedData.data.commencementDt = data.urc_commencement_dt;
        //   //enterprise_type
        //   urcParsedData.data.entType = data.urc_ent_type;
        //   //organisation_type
        //   urcParsedData.data.orgType = data.urc_org_type;
        //   //owner_name
        //   urcParsedData.data.ownerName = data.urc_owner_name;
        //   //Gender
        //   urcParsedData.data.gender = data.urc_gender;
        //   //Udhyam_resgistration_date
        //   urcParsedData.data.udymRegDt = data.urc_udym_reg_dt;
        //   //Address
        //   urcParsedData.data.addr = data.urc_addr;
        //   //Turnover
        //   urcParsedData.data.Turnover = data.urc_turnover;
        //   //NIC
        //   urcParsedData.data.NIC = data.urc_nic;
        //   //Investment
        //   urcParsedData.data.Investment = data.urc_investment;
        //   //Enterprise Activity
        //   urcParsedData.data["Enterprise Activity"] = data.urc_ent_activity;

        //   leadExist.urc_parsing_data = JSON.stringify(urcParsedData);
        //   // if request has urcParsed data then update incoming data to LR collection
        //   await LoanRequestSchema.updateURCParsedData(loan_app_id, leadExist);
        // }

        //Record data in cams details collection.
        if (!recordCamsDetails)
          throw {
            success: false,
            message: 'Error while recording cams details.',
          };
        req.status = data.status;
        req.camsDetails = { data, recordCamsDetails };
        reqUtils.json(req, res, next, 200, {
          success: true,
          message: 'Cams details recorded successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    camsDataEvent.fireAddCamsDetailsEvent,
  );

  app.put(
    '/api/cams-details/:loan_app_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateCamsDetailsData,
    async (req, res) => {
      try {
        const data = req.body;
        const { loan_app_id } = req.params;
        //Validate if lead exist by loan_app_id.
        const leadExist = await LoanRequestSchema.findIfExists(loan_app_id);
        if (!leadExist)
          throw {
            success: false,
            message: 'No lead found against loan_app_id.',
          };
        // company and product authorization.
        if (leadExist.company_id !== req.company._id)
          throw {
            success: false,
            message: 'Authorization mismatch for company_id.',
          };
        if (leadExist.product_id !== req.product._id)
          throw {
            success: false,
            message: 'Authorization mismatch for product_id.',
          };
        //Validate lead should not be soft deleted.
        if (leadExist.is_deleted == 1)
          throw {
            success: false,
            message: 'Unable to update cams details as lead is deleted.',
          };
        //update cams details
        const updateCamsDetails = await CamsDetailsSchema.updateCamsDetails(
          loan_app_id,
          data,
        );
        if (!updateCamsDetails)
          throw {
            success: false,
            message: 'Error while updating cams details.',
          };
        return res.status(200).send({
          success: true,
          message: 'Cams details updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get('/api/cams-details/:loan_app_id', async (req, res) => {
    try {
      const { loan_app_id } = req.params;
      const loanRequestExists = await LoanRequestSchema.findByLId(loan_app_id);
      const data = {};
      if (!loanRequestExists)
        throw {
          success: false,
          message: 'No loan Request Exists for Loan App Id',
        };
      const camsDetails = await CamsDetailsSchema.findByLAID(loan_app_id);
      if (!camsDetails) {
        return res.status(200).send({
          success: true,
          data: loanRequestExists,
        });
      } else {
        return res.status(200).send({
          success: true,
          data: camsDetails,
        });
      }
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/cam-details/:loan_app_id', [jwt.verifyToken], async (req, res) => {
    try {
      const { loan_app_id } = req.params;
      const cam_details = await CamsDetailsSchema.findByLAID(loan_app_id);
      if (!cam_details) throw new Error('Cam details were not found for the provided loan app id.');
      return res.status(200).send({
        success: true,
        data: cam_details,
      });
    } catch (error) {
      return res.status(400).send({
        success: false,
        message: error?.message ?? 'Technical error, please try again.',
      });
    }
  });
};

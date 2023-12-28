const moment = require('moment');

const chargesIds = {
  'Processing Fees': 2,
  'Subvention Fees': 9,
  'Convenience Fees': 3,
  'Usage Fees': 4,
  'Insurance Amount': 5,
  'Application Fees': 6,
  'Breaking Charges ': 8,
  'Foreclosure Charges': 7,
};

createCharge = (type, loanItem, cid, pid) => {
  // Add processing fees charge
  if (type === 'Processing Fees') {
    return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Processing Fees',
      charge_id: chargesIds['Processing Fees'],
      gst: loanItem.gst_on_pf_amt,
      cgst: loanItem.cgst_amount,
      sgst: loanItem.sgst_amount,
      igst: loanItem.igst_amount,
      charge_amount: loanItem.processing_fees_amt,
      charge_application_date: moment(),
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };
  }

  // Add subvention fees charge
  if (type === 'Subvention Fees') {
    return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Subvention Fees',
      charge_id: chargesIds['Subvention Fees'],
      gst: loanItem.gst_on_subvention_fees,
      cgst: loanItem.cgst_on_subvention_fees,
      sgst: loanItem.sgst_on_subvention_fees,
      igst: loanItem.igst_on_subvention_fees,
      charge_amount: loanItem.subvention_fees_amount,
      charge_application_date: moment(),
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };
  }

  // Add Convenience fees charge
  if (type === 'Convenience Fees')
    return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Convenience Fees',
      charge_id: chargesIds['Convenience Fees'],
      gst: loanItem.gst_on_conv_fees,
      cgst: loanItem.cgst_on_conv_fees,
      sgst: loanItem.sgst_on_conv_fees,
      igst: loanItem.igst_on_conv_fees,
      charge_amount: loanItem.conv_fees_excluding_gst,
      charge_application_date: moment(),
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };

  // Add usage fees charge
  if (type === 'Usage Fees') {
   return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Usage Fees',
      charge_id: chargesIds['Usage Fees'],
      gst: loanItem.gst_amt,
      cgst: loanItem.cgst_amount,
      sgst: loanItem.sgst_amount,
      igst: loanItem.igst_amount,
      charge_amount: loanItem.usage_fees_amt,
      charge_application_date: moment(),
      usage_id:loanItem.usage_id,
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };
  }

  // Add insurance amount charge
  if (type === 'Insurance Amount')
    return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Insurance Amount',
      charge_id: chargesIds['Insurance Amount'],
      gst: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      charge_amount: loanItem.insurance_amount,
      charge_application_date: moment(),
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };

  // Add application charge
  if (type === 'Application Fees')
    return {
      company_id: cid,
      product_id: pid,
      loan_id: loanItem.loan_id,
      charge_type: 'Application Fees',
      charge_id: chargesIds['Application Fees'],
      gst: loanItem.gst_on_application_fees,
      cgst: loanItem.cgst_on_application_fees,
      sgst: loanItem.sgst_on_application_fees,
      igst: loanItem.igst_on_application_fees,
      charge_amount: loanItem.application_fees_excluding_gst,
      charge_application_date: moment(),
      created_by: loanItem.created_by,
      updated_by: loanItem.updated_by,
    };
};
module.exports = {
  createCharge,
};

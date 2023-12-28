const disbursementEventPostData = (data) => {
  const eventPostData = {
    event_key: data.event_key || 'disbursement',
    data: {
      status_code: data.disbursement_status_code,
      loan_id: data.loan_id,
      partner_loan_id: data.partner_loan_id,
      net_disbur_amt: data.txn_amount * 1,
      utr_number: data.utrn_number,
      utr_date_time: data.txn_date,
      txn_id: data.txn_id,
      scheme_id: data.scheme_id,
      usage_id: data?.usage_id,
      request_id: data?.request_id,
      due_date: data?.due_date,
      principal_amount: data?.principal_amount * 1,
      int_value: data?.int_value * 1,
      label: data?.label,
    },
  };
  if (!data.label) delete eventPostData.data.label;
  if (!data.usage_id) delete eventPostData.data.usage_id;
  if (!data.request_id) delete eventPostData.data.request_id;
  if (!data.due_date) delete eventPostData.data.due_date;
  if (!data.principal_amount) delete eventPostData.data.principal_amount;
  if (!data.int_value) delete eventPostData.data.int_value;
  if (!data.scheme_id) delete eventPostData.data.scheme_id;
  return eventPostData;
};

const coLenderDisbursementEventPostData = (data) => {
  const eventPostData = {
    event_key: 'final_utr',
    data: {
      status_code: data.disbursement_status_code,
      loan_id: data.loan_id,
      co_lender_loan_id: data.co_lender_loan_id,
      partner_loan_id: data.partner_loan_id,
      net_disbur_amt: data.txn_amount * 1,
      utr_number: data.utrn_number,
      utr_date_time: data.txn_date,
      txn_id: data.txn_id,
      usage_id: data?.usage_id,
      request_id: data?.request_id,
      due_date: data?.due_date,
      principal_amount: data?.principal_amount * 1,
      int_value: data?.int_value * 1,
      label: data?.label || '',
    },
  };
  if (!data.label) delete eventPostData.data.label;
  if (!data.usage_id) delete eventPostData.data.usage_id;
  if (!data.request_id) delete eventPostData.data.request_id;
  if (!data.due_date) delete eventPostData.data.due_date;
  if (!data.principal_amount) delete eventPostData.data.principal_amount;
  if (!data.int_value) delete eventPostData.data.int_value;
  return eventPostData;
};

module.exports = {
  disbursementEventPostData,
  coLenderDisbursementEventPostData,
};

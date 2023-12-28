const moment = require('moment');

const calculateAge = (dob) => {
  if (dob) {
    return moment().diff(moment(dob, 'YYYY-MM-DD'), 'years').toString();
  }
  return null;
};

const primaryDetailsSerializedData = (primary_data = {}) => {
  return {
    first_name: primary_data?.first_name ?? null,
    middle_name: primary_data?.middle_name ?? null,
    last_name: primary_data?.last_name ?? null,
    dob: primary_data?.dob ?? null,
    age: calculateAge(primary_data?.dob),
    gender: primary_data?.gender ?? null,
    appl_phone: primary_data?.appl_phone ?? null,
    email_id: primary_data?.email_id ?? null,
    father_name: primary_data.hasOwnProperty('father_fname') ? `${primary_data.father_fname}${primary_data.father_mname ? ` ${primary_data.mname}` : ''}${primary_data.father_lname ? ` ${primary_data.father_lname}` : ''}` : null,
    resi_addr_ln1: primary_data?.resi_addr_ln1 ?? null,
    resi_addr_ln2: primary_data?.resi_addr_ln2 ?? null,
    city: primary_data?.city ?? null,
    state: primary_data?.state ?? null,
    pincode: primary_data?.pincode ?? null,
    address_same: primary_data?.address_same ?? 0,
    per_addr_ln1: primary_data?.per_addr_ln1 ?? null,
    per_addr_ln2: primary_data?.per_addr_ln2 ?? null,
    per_city: primary_data?.per_city ?? null,
    per_state: primary_data?.per_state ?? null,
    per_pincode: primary_data?.per_pincode ?? null,
    appl_pan: primary_data?.appl_pan ?? null,
    aadhar_card_num: primary_data?.aadhar_card_num ?? null,
  };
};

const entitySerializedData = (entity_data = {}) => {
  return {
    entity_type: entity_data?.entity_type ?? null,
    entity_name: entity_data?.entity_name ?? null,
    date_of_incorporation: entity_data?.date_of_incorporation ?? null,
    res_addr_ln1: entity_data?.res_addr_ln1 ?? null,
    res_addr_ln2: entity_data?.res_addr_ln2 ?? null,
    res_city: entity_data?.res_city ?? null,
    res_state: entity_data?.res_state ?? null,
    res_pincode: entity_data?.res_pincode ?? null,
    address_same: entity_data?.address_same ?? 0,
    com_addr_ln1: entity_data?.com_addr_ln1 ?? null,
    com_addr_ln2: entity_data?.com_addr_ln2 ?? null,
    com_city: entity_data?.com_city ?? null,
    com_state: entity_data?.com_state ?? null,
    com_pincode: entity_data?.com_pincode ?? null,
    pan_no: entity_data?.pan_no ?? null,
    urc_no: entity_data?.urc_no ?? null,
    cin_no: entity_data?.cin_no ?? null,
    gst_no: entity_data?.gst_no ?? null,
    udyam_vintage_flag: entity_data?.udyam_vintage_flag ?? null,
    udyam_vintage: entity_data?.udyam_vintage ?? null,
    udyam_hit_count: entity_data?.udyam_hit_count ?? null, 
    gst_vintage_flag: entity_data?.gst_vintage_flag ?? null,
    gst_vintage: entity_data?.gst_vintage ?? null,
  };
};

const coApplicantSerializedData = (co_applicant_data = []) => {
  return co_applicant_data.map((el) => {
    return {
      _id: el?._id ?? null,
      sequence_no: el?.sequence_no ?? null,
      borrower_id: el?.borrower_id ?? null,
      cb_fname: el?.cb_fname ?? null,
      cb_mname: el?.cb_mname ?? null,
      cb_lname: el?.cb_lname ?? null,
      cb_dob: el?.cb_dob ?? null,
      cb_age: calculateAge(el?.cb_dob),
      cb_gender: el?.cb_gender ?? null,
      cb_mobile: el?.cb_mobile ?? null,
      cb_email: el?.cb_email ?? null,
      cb_father_name: el?.cb_father_name ?? null,
      cb_resi_addr_ln1: el?.cb_resi_addr_ln1 ?? null,
      cb_resi_addr_ln2: el?.cb_resi_addr_ln2 ?? null,
      cb_city: el?.cb_city ?? null,
      cb_state: el?.cb_state ?? null,
      cb_pincode: el?.cb_pincode ?? null,
      address_same: el?.address_same ?? 0,
      cb_per_addr_ln1: el?.cb_per_addr_ln1 ?? null,
      cb_per_addr_ln2: el?.cb_per_addr_ln2 ?? null,
      cb_per_city: el?.cb_per_city ?? null,
      cb_per_state: el?.cb_per_state ?? null,
      cb_per_pincode: el?.cb_per_pincode ?? null,
      cb_pan: el?.cb_pan ?? null,
      cb_aadhaar: el?.cb_aadhaar ?? null,
    };
  });
};

const guarantorSerializedData = (guarantor_data = []) => {
  return guarantor_data.map((el) => {
    return {
      _id: el?._id ?? null,
      sequence_no: el?.sequence_no ?? null,
      borrower_id: el?.borrower_id ?? null,
      gua_fname: el?.gua_fname ?? null,
      gua_mname: el?.gua_mname ?? null,
      gua_lname: el?.gua_lname ?? null,
      gua_dob: el?.gua_dob ?? null,
      gua_age: calculateAge(el?.gua_dob),
      gua_gender: el?.gua_gender ?? null,
      gua_mobile: el?.gua_mobile ?? null,
      gua_email: el?.gua_email ?? null,
      gua_father_name: el?.gua_father_name ?? null,
      gua_resi_addr_ln1: el?.gua_resi_addr_ln1 ?? null,
      gua_resi_addr_ln2: el?.gua_resi_addr_ln2 ?? null,
      gua_city: el?.gua_city ?? null,
      gua_state: el?.gua_state ?? null,
      gua_pincode: el?.gua_pincode ?? null,
      address_same: el?.address_same ?? 0,
      gua_per_addr_ln1: el?.gua_per_addr_ln1 ?? null,
      gua_per_addr_ln2: el?.gua_per_addr_ln2 ?? null,
      gua_per_city: el?.gua_per_city ?? null,
      gua_per_state: el?.gua_per_state ?? null,
      gua_per_pincode: el?.gua_per_pincode ?? null,
      gua_pan: el?.gua_pan ?? null,
      gua_aadhaar: el?.gua_aadhaar ?? null,
    };
  });
};

const getTransformedData = (lead) => {
  return {
    loan_app_id: lead?.loan_app_id ?? null,
    company_id: lead?.company_id ?? null,
    product_id: lead?.product_id ?? null,
    borrower_id: lead?.borrower_id ?? null,
    partner_loan_app_id: lead?.partner_loan_app_id ?? null,
    partner_borrower_id: lead?.partner_borrower_id ?? null,
    lead_status: lead?.lead_status ?? null,
    loan_amount: lead?.loan_amount ?? null,
    loan_tenure: lead?.loan_tenure ?? null,
    loan_interest_rate: lead?.loan_interest_rate ?? null,
    purpose_of_loan: lead?.purpose_of_loan ?? null,
    primary_applicant: primaryDetailsSerializedData(lead),
    entity_details: entitySerializedData(lead?.entity_details ?? {}),
    co_applicant_details: coApplicantSerializedData(lead?.coborrower ?? []),
    guarantor_details: guarantorSerializedData(lead?.guarantor ?? []),
    share_holding_details: lead?.share_holders ?? [],
    financial_documents: {
      fina_docs_gstin: lead?.fina_docs_gstin ?? null,
      borro_bank_code: lead?.borro_bank_code ?? null,
      borro_bank_name: lead?.borro_bank_name ?? null,
      borro_bank_branch: lead?.borro_bank_branch ?? null,
      borro_bank_acc_num: lead?.borro_bank_acc_num ?? null,
      borro_bank_ifsc: lead?.borro_bank_ifsc ?? null,
      borro_bank_type: lead?.borro_bank_type ?? null,
    },
    additional_documents: {
      addi_docs_comment: lead?.addi_docs_comment ?? null,
    },
  };
};

module.exports = (data) => {
  if (Array.isArray(data)) {
    let res = [];
    data.map((lead) => {
      let obj = getTransformedData(lead);
      res.push(obj);
    });
    return res;
  } else {
    let lead = data;
    let obj = getTransformedData(lead);
    return [obj];
  }
};

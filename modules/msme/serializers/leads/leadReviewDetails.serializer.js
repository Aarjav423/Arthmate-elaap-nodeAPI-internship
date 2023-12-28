const moment = require('moment');

const formatKeys = (applicants, func, key_name) => {
  var applicantsOb = {};

  if (Array.isArray(applicants)) {
    for (let i = 0; i < applicants.length; i++) {
      applicantsOb[`${key_name}_${i + 1}`] = func(applicants[i]);
    }
  } else {
    applicantsOb = func(applicants);
  }

  return applicantsOb;
};

const calculateAge = (dob) => {
  if (dob) {
    return moment().diff(moment(dob, 'YYYY-MM-DD'), 'years').toString();
  }
  return null;
};

const primaryDetailsSerializedData = (basicDetails) => {
  return {
    first_name: basicDetails.hasOwnProperty('first_name') ? basicDetails.first_name : null,
    middle_name: basicDetails.hasOwnProperty('middle_name') ? basicDetails.middle_name : null,
    last_name: basicDetails.hasOwnProperty('last_name') ? basicDetails.last_name : null,
    age: basicDetails.hasOwnProperty('dob') ? calculateAge(basicDetails.dob) : null,
    dob: basicDetails.hasOwnProperty('dob') ? basicDetails.dob : null,
    gender: basicDetails.hasOwnProperty('gender') ? basicDetails.gender : null,
    mobile_number: basicDetails.hasOwnProperty('appl_phone') ? basicDetails.appl_phone : null,
    email: basicDetails.hasOwnProperty('email_id') ? basicDetails.email_id : null,
    father_name: basicDetails.hasOwnProperty('father_fname') ? `${basicDetails.father_fname}${basicDetails.father_mname ? ` ${basicDetails.mname}` : ''}${basicDetails.father_lname ? ` ${basicDetails.father_lname}` : ''}` : null,
    PAN: basicDetails.hasOwnProperty('appl_pan') ? basicDetails.appl_pan : null,
    aadhaar_number: basicDetails.hasOwnProperty('aadhar_card_num') ? basicDetails.aadhar_card_num : null,
    current_address: {
      address_line_1: basicDetails.hasOwnProperty('resi_addr_ln1') ? basicDetails.resi_addr_ln1 : null,
      address_line_2: basicDetails.hasOwnProperty('resi_addr_ln1') ? basicDetails.resi_addr_ln2 : null,
      city: basicDetails.hasOwnProperty('city') ? basicDetails.city : null,
      state: basicDetails.hasOwnProperty('state') ? basicDetails.state : null,
      pincode: basicDetails.hasOwnProperty('pincode') ? basicDetails?.pincode?.toString() : null,
      residence_status: basicDetails.hasOwnProperty('residence_status') ? basicDetails.residence_status : null,
    },
    permanent_address: {
      address_line_1: basicDetails.hasOwnProperty('per_addr_ln1') ? basicDetails.per_addr_ln1 : null,
      address_line_2: basicDetails.hasOwnProperty('per_addr_ln2') ? basicDetails.per_addr_ln2 : null,
      city: basicDetails.hasOwnProperty('per_city') ? basicDetails.per_city : null,
      state: basicDetails.hasOwnProperty('per_state') ? basicDetails.per_state : null,
      pincode: basicDetails.hasOwnProperty('per_pincode') ? basicDetails?.per_pincode?.toString() : null,
      residence_status: basicDetails.hasOwnProperty('residence_status') ? basicDetails.residence_status : null,
    },
    validation_checklist: {
      nsdl_verification: basicDetails.hasOwnProperty('nsdl_verification') ? basicDetails.nsdl_verification : 'in_review',
      ckyc: basicDetails.hasOwnProperty('ckyc') ? basicDetails.ckyc : 'in_review',
      bureau_verification: basicDetails.hasOwnProperty('bureau_verification') ? basicDetails.bureau_verification : 'in_review',
      hunter_validation: basicDetails.hasOwnProperty('hunter_validation') ? basicDetails.nsdl_verification : 'in_review',
      primary_pan: basicDetails.hasOwnProperty('primary_pan') ? basicDetails.primary_pan : 'in_review',
    },
    status: basicDetails.hasOwnProperty('primary_status') ? basicDetails.primary_status : 'in_review',
  };
};

const entitySerializedData = (entity) => {
  return {
    _id: entity.hasOwnProperty('_id') ? entity._id : null,
    entity_type: entity.hasOwnProperty('entity_type') ? entity.entity_type : null,
    entity_name: entity.hasOwnProperty('entity_name') ? entity.entity_name : null,
    date_of_incorporation: entity.hasOwnProperty('date_of_incorporation') ? entity.date_of_incorporation : null,
    pan_no: entity.hasOwnProperty('pan_no') ? entity.pan_no : null,
    urc_no: entity.hasOwnProperty('urc_no') ? entity.urc_no : null,
    cin_no: entity.hasOwnProperty('cin_no') ? entity.cin_no : null,
    gst_no: entity.hasOwnProperty('gst_no') ? entity.gst_no : null,
    gst_certificate: entity.hasOwnProperty('gst_certificate') ? entity.gst_certificate : null,
    shop_est_certificate: entity.hasOwnProperty('shop_est_certificate') ? entity.shop_est_certificate : null,
    authority_letter: entity.hasOwnProperty('authority_letter') ? entity.authority_letter : null,
    moa_file: entity.hasOwnProperty('moa_file') ? entity.moa_file : null,
    aoa_file: entity.hasOwnProperty('aoa_file') ? entity.aoa_file : null,
    coi_file: entity.hasOwnProperty('coi_file') ? entity.coi_file : null,
    directors_file: entity.hasOwnProperty('directors_file') ? entity.directors_file : null,
    communication_address: {
      address_line_1: entity.hasOwnProperty('com_addr_ln1') ? entity.com_addr_ln1 : null,
      address_line_2: entity.hasOwnProperty('com_addr_ln2') ? entity.com_addr_ln2 : null,
      city: entity.hasOwnProperty('com_city') ? entity.com_city : null,
      state: entity.hasOwnProperty('com_state') ? entity.com_state : null,
      pincode: entity.hasOwnProperty('com_pincode') ? entity.com_pincode : null,
    },
    current_address: {
      address_line_1: entity.hasOwnProperty('res_addr_ln1') ? entity.res_addr_ln1 : null,
      address_line_2: entity.hasOwnProperty('res_addr_ln2') ? entity.res_addr_ln2 : null,
      city: entity.hasOwnProperty('res_city') ? entity.res_city : null,
      state: entity.hasOwnProperty('res_state') ? entity.res_state : null,
      pincode: entity.hasOwnProperty('res_pincode') ? entity.res_pincode : null,
    },
    status: entity.hasOwnProperty('status') ? entity.status : 'in_review',
  };
};

const coapplicantSerializedData = (coborrower) => {
  return {
    _id: coborrower.hasOwnProperty('_id') ? coborrower._id : null,
    first_name: coborrower.hasOwnProperty('cb_fname') ? coborrower.cb_fname : null,
    middle_name: coborrower.hasOwnProperty('cb_mname') ? coborrower.cb_mname : null,
    last_name: coborrower.hasOwnProperty('cb_lname') ? coborrower.cb_lname : null,
    father_name: coborrower.hasOwnProperty('cb_father_name') ? coborrower.cb_father_name : null,
    mobile: coborrower.hasOwnProperty('cb_mobile') ? coborrower.cb_mobile : null,
    pan: coborrower.hasOwnProperty('cb_pan') ? coborrower.cb_pan : null,
    aadhaar: coborrower.hasOwnProperty('cb_aadhaar') ? coborrower.cb_aadhaar : null,
    age: coborrower.hasOwnProperty('cb_dob') ? calculateAge(coborrower.cb_dob) : null,
    dob: coborrower.hasOwnProperty('cb_dob') ? coborrower.cb_dob : null,
    email: coborrower.hasOwnProperty('cb_email') ? coborrower.cb_email : null,
    gender: coborrower.hasOwnProperty('cb_gender') ? coborrower.cb_gender : null,
    current_address: {
      address_line_1: coborrower.hasOwnProperty('cb_resi_addr_ln1') ? coborrower.cb_resi_addr_ln1 : null,
      address_line_2: coborrower.hasOwnProperty('cb_resi_addr_ln2') ? coborrower.cb_resi_addr_ln2 : null,
      city: coborrower.hasOwnProperty('cb_city') ? coborrower.cb_city : null,
      state: coborrower.hasOwnProperty('cb_state') ? coborrower.cb_state : null,
      pincode: coborrower.hasOwnProperty('cb_pincode') ? coborrower?.cb_pincode?.toString() : null,
    },
    permanent_address: {
      address_line_1: coborrower.hasOwnProperty('cb_per_addr_ln1') ? coborrower.cb_per_addr_ln1 : null,
      address_line_2: coborrower.hasOwnProperty('cb_per_addr_ln2') ? coborrower.cb_per_addr_ln2 : null,
      city: coborrower.hasOwnProperty('cb_per_city') ? coborrower.cb_per_city : null,
      state: coborrower.hasOwnProperty('cb_per_state') ? coborrower.cb_per_state : null,
      pincode: coborrower.hasOwnProperty('cb_per_pincode') ? coborrower?.cb_per_pincode?.toString() : null,
    },
    validation_checklist: {
      nsdl_verification: coborrower.hasOwnProperty('nsdl_verification') ? coborrower.nsdl_verification : 'in_review',
      ckyc: coborrower.hasOwnProperty('ckyc') ? coborrower.ckyc : 'in_review',
      bureau_verification: coborrower.hasOwnProperty('bureau_verification') ? coborrower.bureau_verification : 'in_review',
      hunter_validation: coborrower.hasOwnProperty('hunter_validation') ? coborrower.nsdl_verification : 'in_review',
      primary_pan: coborrower.hasOwnProperty('primary_pan') ? coborrower.primary_pan : 'in_review',
    },
    status: coborrower.hasOwnProperty('status') ? coborrower.status : 'in_review',
  };
};

const guarantorSerializedData = (guarantor) => {
  return {
    _id: guarantor.hasOwnProperty('_id') ? guarantor._id : null,
    first_name: guarantor.hasOwnProperty('gua_fname') ? guarantor.gua_fname : null,
    middle_name: guarantor.hasOwnProperty('gua_mname') ? guarantor.gua_mname : null,
    last_name: guarantor.hasOwnProperty('gua_lname') ? guarantor.gua_lname : null,
    father_name: guarantor.hasOwnProperty('gua_father_name') ? guarantor.gua_father_name : null,
    pan: guarantor.hasOwnProperty('gua_pan') ? guarantor.gua_pan : null,
    aadhaar: guarantor.hasOwnProperty('gua_aadhaar') ? guarantor.gua_aadhaar : null,
    age: guarantor.hasOwnProperty('gua_dob') ? calculateAge(guarantor.gua_dob) : null,
    dob: guarantor.hasOwnProperty('gua_dob') ? guarantor.gua_dob : null,
    gender: guarantor.hasOwnProperty('gua_gender') ? guarantor.gua_gender : null,
    mobile: guarantor.hasOwnProperty('gua_mobile') ? guarantor.gua_mobile : null,
    email: guarantor.hasOwnProperty('gua_email') ? guarantor.gua_email : null,
    current_address: {
      address_line_1: guarantor.hasOwnProperty('gua_resi_addr_ln1') ? guarantor.gua_resi_addr_ln1 : null,
      address_line_2: guarantor.hasOwnProperty('gua_resi_addr_ln2') ? guarantor.gua_resi_addr_ln2 : null,
      city: guarantor.hasOwnProperty('gua_city') ? guarantor.gua_city : null,
      state: guarantor.hasOwnProperty('gua_state') ? guarantor.gua_state : null,
      pincode: guarantor.hasOwnProperty('gua_pincode') ? guarantor?.gua_pincode?.toString() : null,
    },
    permanent_address: {
      address_line_1: guarantor.hasOwnProperty('gua_per_addr_ln1') ? guarantor.gua_per_addr_ln1 : null,
      address_line_2: guarantor.hasOwnProperty('gua_per_addr_ln2') ? guarantor.gua_per_addr_ln2 : null,
      city: guarantor.hasOwnProperty('gua_per_city') ? guarantor.gua_per_city : null,
      state: guarantor.hasOwnProperty('gua_per_state') ? guarantor.gua_per_state : null,
      pincode: guarantor.hasOwnProperty('gua_per_pincode') ? guarantor?.gua_per_pincode?.toString() : null,
    },
    validation_checklist: {
      nsdl_verification: guarantor.hasOwnProperty('nsdl_verification') ? guarantor.nsdl_verification : 'in_review',
      ckyc: guarantor.hasOwnProperty('ckyc') ? guarantor.ckyc : 'in_review',
      bureau_verification: guarantor.hasOwnProperty('bureau_verification') ? guarantor.bureau_verification : 'in_review',
      hunter_validation: guarantor.hasOwnProperty('hunter_validation') ? guarantor.nsdl_verification : 'in_review',
    },
    status: guarantor.hasOwnProperty('status') ? guarantor.status : 'in_review',
  };
};

const financialDocsSerializeData = (financialDocs) => {
  return {
    bank_name: financialDocs.hasOwnProperty('borro_bank_name') ? financialDocs.borro_bank_name : null,
    bank_account_number: financialDocs.hasOwnProperty('borro_bank_acc_num') ? financialDocs.borro_bank_acc_num : null,
    bank_branch: financialDocs.hasOwnProperty('borro_bank_branch') ? financialDocs.borro_bank_branch : null,
    bank_code: financialDocs.hasOwnProperty('borro_bank_code') ? financialDocs.borro_bank_code : null,
    bank_ifsc: financialDocs.hasOwnProperty('borro_bank_ifsc') ? financialDocs.borro_bank_ifsc : null,

    bank_type: financialDocs.hasOwnProperty('borro_bank_type') ? financialDocs.borro_bank_type : null,
    financial_docs_gstin: financialDocs.hasOwnProperty('fina_docs_gstin') ? financialDocs.fina_docs_gstin : null,
    status: financialDocs.hasOwnProperty('status') ? financialDocs.status : 'in_review',
  };
};

const additionalDocsSerializeData = (addditionalDocs) => {
  return {
    itr_statement: addditionalDocs.hasOwnProperty('itr_statement') ? addditionalDocs.itr_statement : null,
    gstr_statement: addditionalDocs.hasOwnProperty('gstr_statement') ? addditionalDocs.gstr_statement : null,
    bank_statement: addditionalDocs.hasOwnProperty('bank_statement') ? addditionalDocs.bank_statement : null,
    financial_statement: addditionalDocs.hasOwnProperty('financial_statement') ? addditionalDocs.financial_statement : null,
    status: addditionalDocs.hasOwnProperty('status') ? addditionalDocs.status : 'in_review',
  };
};

const getTransformedData = (lead) => {
  let leadData = {
    company_id:lead?.company_id ?? null,
    product_id:lead?.product_id ?? null,
    lead_status: lead?.lead_status ?? null,
    primary_applicant: primaryDetailsSerializedData(lead),
  };
  if (lead.hasOwnProperty('entity_details')) {
    leadData['entity_details'] = formatKeys(lead.entity_details, entitySerializedData, 'entity_details');
  }
  if (lead.hasOwnProperty('coborrower') && lead.coborrower.length >= 1) {
    leadData['co-applicant_details'] = {
      status: lead['coborrower'].hasOwnProperty('status') ? lead['coborrower'].status : 'in_review',
      ...formatKeys(lead.coborrower, coapplicantSerializedData, 'co-applicant'),
    };
  }
  if (lead.hasOwnProperty('guarantor') && lead.guarantor.length >= 1) {
    leadData['guarantor_details'] = {
      status: lead['guarantor'].hasOwnProperty('status') ? lead['guarantor'].status : 'in_review',
      ...formatKeys(lead.guarantor, guarantorSerializedData, 'guarantor'),
    };
  }
  leadData['financial_documents'] = financialDocsSerializeData(lead);

  return leadData;
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

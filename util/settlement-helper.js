const moment = require('moment');
const LoanStates = require('../models/loan-state-schema.js');
const SettlementOfferSchema = require('../models/settlement-offer-schema');
const LeadSchema = require('../models/loan-request-schema.js');
const {
  amountToIndianCurrencyWord,
} = require('../utils/amount-to-indian-currency-word.js');
const { createPdf } = require('../utils/createPdfFromTemplate.js');
const ChargesSchema = require('../models/charges-schema.js');
const { default: axios } = require('axios');
const LoanDocumentSchema = require('../models/loandocument-common-schema.js');
const fetchLoanStateData = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    //Fetch loan state data against loan id
    const loanStateResp = await LoanStates.findByLID(loan_id);
    if (!loanStateResp)
      throw {
        success: false,
        message: 'No records found in loan states against provided loan id.',
      };
    req.loanStateData = loanStateResp;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const settlementSummaryCalculations = async (loan_id) => {
  const charge_ids = [{ charge_id: 1 }, { charge_id: 7 }];
  return calculateSettlementSummary(loan_id, charge_ids);
};

const settlementSummaryCalculationsForUpload = async (loan_id) => {
  const charge_ids = [{ charge_id: 1 }];
  return calculateSettlementSummary(loan_id, charge_ids);
};

const calculateSettlementSummary = async (loan_id, charge_ids) => {
  try {
    const charge_query = {
      loan_id: loan_id,
      $or: charge_ids,
    };
    const charges = await ChargesSchema.findbyCondition(charge_query);

    const total_amount_waived =
      charges.length !== 0 && charges[0].total_amount_waived
        ? charges[0].total_amount_waived
        : 0;
    const total_amount_paid =
      charges.length !== 0 && charges[0].total_amount_paid
        ? charges[0].total_amount_paid
        : 0;
    const charge_amount =
      charges.length !== 0 && charges[0].charge_amount
        ? charges[0].charge_amount
        : 0;
    const total_gst_reversed =
      charges.length !== 0 && charges[0].total_gst_reversed
        ? charges[0].total_gst_reversed
        : 0;
    const total_gst_paid =
      charges.length !== 0 && charges[0].total_gst_paid
        ? charges[0].total_gst_paid
        : 0;
    const gst = charges.length !== 0 && charges[0].gst ? charges[0].gst : 0;

    const bounceCharges =
      charge_amount - total_amount_waived - total_amount_paid;
    const gst_on_bc = gst - total_gst_reversed - total_gst_paid;
    const responseObj = {
      bounce_charge: bounceCharges,
      gst: gst_on_bc,
    };
    return responseObj;
  } catch (error) {
    return {
      success: false,
      message: 'Error while getting settlement request',
    };
  }
};

const isSettlementPending = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    const _id = req.params.request_id;
    const settlement = await SettlementOfferSchema.findByLoanIdAndRequestId(
      loan_id,
      _id,
      'Pending',
    );
    if (!settlement) {
      throw {
        success: false,
        message:
          'No pending record found in settlement offers against provided loan id.',
      };
    }
    req.settlement = settlement;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const uploadSettlementOfferLetterToS3 = async (req) => {
  try {
    const settlement_data = req.settlement;
    const loanData = req.loanData;
    const leadData = await LeadSchema.findBySingleLoanIds(loanData.loan_id);
    const outstanding_loan_amount = await calculateOutstandingLoanAmount(
      req.loanStateData,
      settlement_data.prin_os,
    );
    const waiver_amount =
      Math.round(
        (outstanding_loan_amount - totalTranchesAmount(settlement_data)) * 100,
      ) / 100;
    const template_parameters = {
      letter_number: settlement_data._id,
      date: new Date().toISOString(),
      name: getFullName(loanData),
      address: currentResidentialAddress(leadData),
      lan: loanData.loan_id,
      outstanding_loan_amount,
      waiver_amount,
      waiver_amount_in_words: amountToIndianCurrencyWord(waiver_amount),
      tranches: getTranches(settlement_data),
      company_details: JSON.parse(process.env.ARTHMATE_DETAILS),
    };
    const base64 = await callPdfGenerateApi(template_parameters);
    return await uploadSettlementOfferLetter(base64, req);
  } catch (error) {
    throw {
      success: false,
      message: 'Settlement offer upload failed',
    };
  }
};

const uploadSettlementOfferLetter = async (base64, req) => {
  const { partner_loan_app_id, partner_borrower_id, loan_app_id, borrower_id } =
    req.loanData;
  return axios
    .post(
      `${process.env.APP_URL}/api/loandocument`,
      {
        partner_loan_app_id,
        partner_borrower_id,
        borrower_id,
        loan_app_id,
        code: 997,
        base64pdfencodedfile: base64,
      },
      {
        headers: {
          authorization: req.headers['authorization'],
          'Content-Type': 'application/json',
        },
      },
    )
    .then(async (response) => {
      const loanDocData = await LoanDocumentSchema.findByCodeAndLoanAppID(
        997,
        loan_app_id,
      );
      return loanDocData.file_url;
    })
    .catch((error) => {
      throw error;
    });
};

const callPdfGenerateApi = async (template_parameters) => {
  try {
    const request = {
      template_code: '004',
      template_parameters: JSON.stringify(template_parameters),
    };
    let clientConfig = {
      headers: {
        Authorization: process.env.PDF_URL_AUTHROIZATION_KEY,
        'Content-Type': 'application/json',
      },
    };
    const response = await createPdf(request, clientConfig);
    return response.data;
  } catch (error) {
    throw {
      success: false,
      message: 'Settlment pdf api failed',
    };
  }
};

const totalTranchesAmount = (settlement_data) => {
  return Array.from(settlement_data.tranches).reduce(
    (total, tranch) => total + parseFloat(tranch.settlement_amount),
    0,
  );
};

const getTranches = (settlement_data) => {
  return Array.from(settlement_data.tranches).map((tranch) => ({
    amount: tranch.settlement_amount,
    amount_in_words: amountToIndianCurrencyWord(tranch.settlement_amount),
    due_date: new Date(tranch.settlement_date).toISOString(),
  }));
};

const calculateOutstandingLoanAmount = async (loan_state_data, prin_os) => {
  const bc_gst_data = await settlementSummaryCalculationsForUpload(
    loan_state_data.loan_id,
  );
  const int_accr = loan_state_data.int_accrual || 0;
  const curr_int_due = loan_state_data.current_int_due || 0;
  const prin = parseFloat(prin_os) || 0;
  const int = parseFloat(curr_int_due) + parseFloat(int_accr) || 0;
  const lpi = parseFloat(loan_state_data.current_lpi_due) || 0;
  const bounce_charge = parseFloat(bc_gst_data.bounce_charge) || 0;
  const gst = parseFloat(bc_gst_data.gst) || 0;
  return Math.round((prin + int + lpi + bounce_charge + gst) * 100) / 100;
};

const getFullName = (loan_data) => {
  return `${loan_data.first_name}${
    !loan_data.middle_name ? '' : ' ' + loan_data.middle_name
  }${!loan_data.last_name ? '' : ' ' + loan_data.last_name}`;
};

const currentResidentialAddress = (lead_data) => {
  return `${lead_data.resi_addr_ln1}${
    !lead_data.resi_addr_ln2 ? '' : ' ' + lead_data.resi_addr_ln2
  },${lead_data.city},${lead_data.state}:${lead_data.pincode}`;
};

module.exports = {
  fetchLoanStateData,
  settlementSummaryCalculations,
  isSettlementPending,
  uploadSettlementOfferLetterToS3,
};

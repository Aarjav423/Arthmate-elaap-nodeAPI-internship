const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const ForeclosureRequest = require('../models/foreclosure-request-schema.js');
const RepaymentInstallment = require('../models/repayment-installment-schema.js');
const LoanStates = require('../models/loan-state-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');
const customIdHelper = require('../util/customLoanIdHelper.js');
const moment = require('moment');
const jwt = require('../util/jwt');

const validateForeclosurePayload = [
  check('loan_id').notEmpty().withMessage('loan_id is required'),

  check('waiver_requested')
    .optional({ checkFalsy: false })
    .isFloat('en-US', { ignore: ' ' })
    .withMessage('waiver_requested should be float'),

  check('prin_partner')
    .notEmpty()
    .withMessage('prin_partner is required')
    .isFloat()
    .withMessage('prin_partner should be float'),

  check('int_partner')
    .notEmpty()
    .withMessage('int_partner is required')
    .isFloat()
    .withMessage('int_partner should be float'),

  check('foreclosure_charge_partner')
    .notEmpty()
    .withMessage('foreclosure_charge_partner is required')
    .isFloat()
    .withMessage(' foreclosure_charge_partner should be float'),

  check('gst_foreclosure_charge_partner')
    .notEmpty()
    .withMessage('gst_foreclosure_charge_partner is required ')
    .isFloat()
    .withMessage(' gst_foreclosure_charge_partner should be float'),

  check('waiver_partner')
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage(' waiver_partner should be float'),

  check('total_foreclosure_amt_partner')
    .notEmpty()
    .withMessage('total_foreclosure_amt_partner is required ')
    .isFloat()
    .withMessage('total_foreclosure_amt_partner should be float'),
];

const validateData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw { success: false, message: errors.errors[0]['msg'] };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const fetchRepayInstallment = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    // Fetch installment data against loan id
    const installmentData = await RepaymentInstallment.findAllByLoanId(loan_id);
    req.repayInstallment = installmentData;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

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

const validateForeclosureRequest = async (req, res, next) => {
  try {
    let upcomingInstallments = [];
    let previousInstallments = [];
    const currentDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
    req.repayInstallment?.forEach((record) => {
      let dueDate = moment(record.due_date).format('YYYY-MM-DD');
      if (dueDate <= currentDate) {
        previousInstallments.push(dueDate);
      }
      if (dueDate >= currentDate) {
        upcomingInstallments.push(dueDate);
      }
    });
    let previousInstallmentDate = previousInstallments[0];
    let upcomingInstallmentDate =
      upcomingInstallments[upcomingInstallments.length - 1];
    //Validate previous installment date
    if (previousInstallments.length && previousInstallmentDate == currentDate)
      throw {
        success: false,
        message:
          'Foreclosure Request cannot be accepted as Request Date has to atleast 3 days after the last installment date.',
      };
    if (
      previousInstallments.length &&
      previousInstallmentDate > moment().subtract(4, 'd').format('YYYY-MM-DD')
    )
      throw {
        success: false,
        message:
          'Foreclosure Request cannot be accepted as Request Date has to atleast 3 days after the last installment date.',
      };
    // Validate upcoming installment date
    if (upcomingInstallments.length && upcomingInstallmentDate == currentDate)
      throw {
        success: false,
        message:
          'Foreclosure Request cannot be accepted as Request Date has to at least 5 days prior to the upcoming installment.',
      };
    if (
      upcomingInstallments.length &&
      currentDate >
        moment(upcomingInstallmentDate).subtract(6, 'd').format('YYYY-MM-DD')
    )
      throw {
        success: false,
        message:
          'Foreclosure Request cannot be accepted as Request Date has to at least 5 days prior to the upcoming installment.',
      };
    //Validate dpd from loan state table
    if (req.loanStateData.dpd > 0)
      throw {
        success: false,
        message: 'Foreclosure Request cannot be accepted as Loan is past due.',
      };
    req.previousInstallmentDates = previousInstallments;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const foreclosureCalculations = async (req, res, next) => {
  try {
    // Validate final_approve_date is required if no installments are available.
    if (!req.repayInstallment.length && !req.loanData.final_approve_date)
      throw { success: false, message: 'final_approve_date is required.' };
    let finalApproveDate = moment(req.loanData.final_approve_date).format(
      'YYYY-MM-DD',
    );
    let prin_os = req.loanStateData.prin_os * 1;
    //--------------- Calculate interest--------------------------------//
    let int_calculated = 0;
    let interestRate = req.loanData.loan_int_rate
      ? req.loanData.loan_int_rate
      : 0;
    let validityDate = moment().add(3, 'd').format('YYYY-MM-DD');
    let lastInstallmentDate = req.previousInstallmentDates.length
      ? req.previousInstallmentDates[0]
      : finalApproveDate;
    let a = moment(lastInstallmentDate, 'YYYY-MM-DD');
    let b = moment(validityDate, 'YYYY-MM-DD');
    let daysDiff = b.diff(a, 'days');
    int_calculated = (prin_os * interestRate * daysDiff) / 365;
    int_calculated = Math.round((int_calculated + Number.EPSILON) * 100) / 100;
    //---------------Calculate foreclosure charge--------------------------------//

    let foreclosure_charge = req.loanData.foreclosure_charge
      ? req.loanData.foreclosure_charge
      : req.product.foreclosure_charge;

    let foreclosure_charges_calculated =
      foreclosure_charge?.indexOf('A') > -1
        ? foreclosure_charge?.replace(/[a-zA-Z]+/g, '') * 1
        : foreclosure_charge?.indexOf('P') > -1
        ? ((foreclosure_charge?.replace(/[a-zA-Z]+/g, '') * 1) / 100) * prin_os
        : 0;
    foreclosure_charges_calculated =
      Math.round((foreclosure_charges_calculated + Number.EPSILON) * 100) / 100;
    //---------------Calculate gst on foreclosure charge--------------------------------//
    let gst_foreclosure_charges_calculated =
      Number(foreclosure_charges_calculated) * 0.18;
    gst_foreclosure_charges_calculated =
      Math.round((gst_foreclosure_charges_calculated + Number.EPSILON) * 100) /
      100;
    //---------------Calculate total foreclosure amount--------------------------------//
    let total_foreclosure_amt_calculated = 0;
    total_foreclosure_amt_calculated =
      prin_os * 1 +
      int_calculated * 1 +
      foreclosure_charges_calculated * 1 +
      gst_foreclosure_charges_calculated * 1;
    total_foreclosure_amt_calculated =
      Math.round((total_foreclosure_amt_calculated + Number.EPSILON) * 100) /
      100;
    req.foreclosure_charges_calculated = foreclosure_charges_calculated;
    req.gst_foreclosure_charges_calculated = gst_foreclosure_charges_calculated;
    req.int_calculated = int_calculated;
    req.total_foreclosure_amt_calculated = total_foreclosure_amt_calculated;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const recordForeclosureData = async (req, res, next) => {
  try {
    const requestCount = await ForeclosureRequest.getCount();
    const sequence = customIdHelper.generateSequence(requestCount + 1, 10);
    let requestDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
    let validityDate = moment().add(3, 'd').format('YYYY-MM-DD');

    let foreclosureData = {
      loan_id: req.body.loan_id,
      company_id: req.company._id,
      product_id: req.product._id,
      comapny_name: req.company.name,
      product_name: req.product.name,
      sr_req_id: `FCQ${sequence}`,
      customer_name: `${
        req.loanData.first_name ? req.loanData.first_name : ''
      } ${req.loanData.last_name ? req.loanData.last_name : ''}`,
      request_type: 'foreclosure',
      prin_requested: req.body.prin_partner,
      int_requested: req.body.int_partner,
      foreclosure_charge_requested: req.body.foreclosure_charge_partner,
      gst_foreclosure_charge_requested: req.body.gst_foreclosure_charge_partner,
      waiver_requested: req.body.waiver_partner,
      total_foreclosure_amt_requested: req.body.total_foreclosure_amt_partner,
      total_foreclosure_amt_calculated: req.total_foreclosure_amt_calculated,
      prin_os: req.loanStateData.prin_os,
      int_calculated: req.int_calculated,
      foreclosure_charges_calculated: req.foreclosure_charges_calculated,
      gst_foreclosure_charges_calculated:
        req.gst_foreclosure_charges_calculated,
      is_approved: 'P',
      remarks_by_approver: '',
      request_date: requestDate,
      validity_date: validityDate,
      requested_by: req.company.name,
      borrower_id: req.loanData.borrower_id,
      sanction_amount: req.loanData.sanction_amount,
      waiver_requested: req.body.waiver_requested
        ? req.body.waiver_requested
        : '',
    };
    const addForeclosureRequest =
      await ForeclosureRequest.addNew(foreclosureData);
    if (!addForeclosureRequest)
      throw {
        success: false,
        message: 'Error while adding foreclosure request',
      };
    req.foreclosureRecord = addForeclosureRequest;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

module.exports = {
  validateForeclosurePayload,
  validateData,
  fetchRepayInstallment,
  fetchLoanStateData,
  validateForeclosureRequest,
  foreclosureCalculations,
  recordForeclosureData,
};

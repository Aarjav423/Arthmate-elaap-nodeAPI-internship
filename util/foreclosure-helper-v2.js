const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const ForeclosureRequest = require('../models/foreclosure-request-schema.js');
const RepaymentInstallment = require('../models/repayment-installment-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanStates = require('../models/loan-state-schema.js');
const ChargesSchema = require('../models/charges-schema.js');
const ForeClosureSchema = require('../models/foreclosure-offers-schema.js');
const moment = require('moment');
const jwt = require('../util/jwt');
const { createPdf } = require('../utils/createPdfFromTemplate.js');
const { findBySingleLoanIds } = require('../models/loan-request-schema.js');

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
    let { repayment_type } = req.product;
    const currentDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');

    //Fetch Last Repayment

    const lastRepayment = await RepaymentInstallment.findOne({
      loan_id: req.loanData.loan_id,
    }).sort({
      due_date: -1,
    });

    if (lastRepayment && lastRepayment.due_date && moment(lastRepayment.due_date).format('YYYY-MM-DD') < currentDate) {
      throw {
        success: false,
        message: 'Foreclosure is not allowed as loan last repayment due date is passed',
      };
    }

    const upcomingInstallments = await RepaymentInstallment.getFilteredRepaymentsOnLoanId({
      loan_id: req.loanData.loan_id,
      from_date: currentDate,
      to_date: currentDate,
    });

    const previousInstallments = await RepaymentInstallment.getPreviousRepaymentsOnLoanId({
      loan_id: req.loanData.loan_id,
      to_date: currentDate,
    });

    let previousInstallmentDate;
    if (previousInstallments.length) {
      previousInstallmentDate = moment(previousInstallments[0].due_date).format('YYYY-MM-DD');
    }

    let upcomingInstallmentDate;
    if (upcomingInstallments.length) {
      upcomingInstallmentDate = moment(upcomingInstallments[upcomingInstallments.length - 1].due_date).format('YYYY-MM-DD');
    }

    //Validate previous installment date
    if (previousInstallments.length && (previousInstallmentDate == currentDate || previousInstallmentDate > moment().subtract(3, 'd').format('YYYY-MM-DD')) && repayment_type != 'Daily')
      throw {
        success: false,
        message: 'Foreclosure is not allowed as Request Date has to atleast 3 days after the last installment date.',
      };

    // Validate upcoming installment date
    if (upcomingInstallments.length && (upcomingInstallmentDate == currentDate || currentDate >= moment(upcomingInstallmentDate).subtract(5, 'd').format('YYYY-MM-DD')) && repayment_type != 'Daily')
      throw {
        success: false,
        message: 'Foreclosure is not allowed as Request Date has to at least 5 days prior to the upcoming installment.',
      };

    req.previousInstallmentDates = previousInstallmentDate;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const isLoanExistInForeclosure = async (req, res, next) => {
  try {
    if (!req.body.id) {
      throw {
        success: false,
        message: `id is required`,
      };
    }

    const id = req.body.id;
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const foreclosureExist = await ForeClosureSchema.findByIdAndLoanId(id, loan_id);

    if (!foreclosureExist)
      throw {
        success: false,
        message: `${req.body.id} for the loan ${req.params.loan_id} does not exist. Please check the input.`,
      };

    req.foreclosure = foreclosureExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const foreclosureCalculations = async (data, totalExcessAmount) => {
  try {
    const { loanData, previousInstallmentDate, product, loanStateData, request_date, validity_date, foreClosure_charge } = data;

    // validate approve_date is required if no installments are available.
    if (!previousInstallmentDate && !loanData.disbursement_date_time) return { success: false, message: 'disbursement_date is required.' };

    const loan_id = loanData.loan_id;
    //global variable for no. of day for foreclosure offer
    const fc_offer_days = loanData.fc_offer_days ? loanData.fc_offer_days : product.fc_offer_days;
    if (!fc_offer_days) {
      return { success: false, message: 'fc_offer_days is required.' };
    }
    const penal_interest = product.penal_interest ? product.penal_interest : 0;

    //principle outstanding
    let prinOs = parseFloat(loanStateData.prin_os);

    //interest rate
    let interestRate = parseFloat(loanData.loan_int_rate) ? parseFloat(loanData.loan_int_rate) : 0;

    //--------------- Calculate ForeClosure Offers--------------------------------//
    //query for charge collection
    const charge_query = {
      loan_id: loan_id,
      charge_id: 1,
      $or: [{ is_processed: 'null' }, { is_processed: null }, { is_processed: '' }],
    };
    //fetch charges
    const charges = (await ChargesSchema.findbyCondition(charge_query)) || [];
    let charge_amount = 0;
    let total_amount_waived = 0;
    let total_amount_paid = 0;
    let total_gst_reversed = 0;
    let total_gst_paid = 0;
    let gst = 0;

    for (let b = 0; b < charges.length; b++) {
      let temp = charges[b];
      charge_amount += temp.charge_amount;
      total_amount_waived += temp.total_amount_waived;
      total_amount_paid += temp.total_amount_paid;
      total_gst_reversed += temp.total_gst_reversed;
      total_gst_paid += temp.total_gst_paid;
      gst += temp.gst;
    }

    let foreclosure_offers = [];
    const requestDate = request_date;
    const validityDate = validity_date;
    const current_int_due = loanStateData.current_int_due ? loanStateData.current_int_due : 0;
    const current_prin_due = loanStateData.current_prin_due ? loanStateData.current_prin_due : 0;
    const current_lpi_due = loanStateData.current_lpi_due ? loanStateData.current_lpi_due : 0;

    let unDuePrinciple = prinOs - current_prin_due;
    let finalApproveDate = moment(loanData.disbursement_date_time, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');

    for (let index = 0; index < fc_offer_days; index++) {
      var obj = {};

      let previousInstallment_date = previousInstallmentDate ? previousInstallmentDate : '';

      let intDue;
      let int_on_termination = 0;
      if (previousInstallment_date) {
        //for intDue: (current_int_due(from loan_states)) + (prin_os * loan_int_rate%*((request_date + 3) - previous installment date)/365)
        intDue = parseFloat(current_int_due) + (unDuePrinciple * interestRate * moment(requestDate).add(index, 'd').diff(moment(previousInstallment_date), 'days')) / 36500;
        int_on_termination = (unDuePrinciple * interestRate * moment(requestDate).add(index, 'd').diff(moment(previousInstallment_date), 'days')) / 36500;
      } else {
        //incase there is no previous installment date then take approve_date (current_int_due(from loan_states)) +  ( prin_os  * loan_int_rate%*(validity date-approve_date + index)/365)
        intDue = parseFloat(current_int_due) + (unDuePrinciple * interestRate * moment(requestDate).add(index, 'd').diff(moment(finalApproveDate), 'days')) / 36500;
        int_on_termination = (unDuePrinciple * interestRate * moment(requestDate).add(index, 'd').diff(moment(finalApproveDate), 'days')) / 36500;
      }

      //validate intDue
      if (intDue == null) {
        intDue = 0;
      }
      let lpiDue;
      if (index == 0) {
        lpiDue = parseFloat(current_lpi_due);
      } else {
        lpiDue = parseFloat(current_lpi_due) + (index * ((parseFloat(current_prin_due) + parseFloat(current_int_due)) * penal_interest)) / 36500;
      }

      //validate lpiDue
      if (lpiDue == null) {
        lpiDue = 0;
      }

      //(charge_amount - total_amount_waived - total_amount_paid) >> Query on loan_id and charge_id = 1 and is_processed = N in charges collection.
      let bounceCharges = charge_amount - total_amount_waived - total_amount_paid;

      let gst_on_fc = foreClosure_charge * 0.18;
      //(gst - total_gst_reversed - total_gst_paid)
      let gst_on_bc = gst - total_gst_reversed - total_gst_paid;

      //prin_os + int_due+ foreclosure_charge + gst_on_fc + bounce_charges + gst_on_bc + lpi_due
      let totalForecloserCharge = parseFloat(prinOs) + parseFloat(intDue) + parseFloat(foreClosure_charge) + parseFloat(gst_on_fc) + parseFloat(bounceCharges) + parseFloat(gst_on_bc) + parseFloat(lpiDue);

      obj = {
        seq_id: index,
        prin_os: prinOs,
        gst_reversal_bc: 0,
        gst_reversal_fc: 0,
        total_foreclosure_amt_requested: 0,
        bounce_charges: Math.round((bounceCharges + Number.EPSILON) * 100) / 100,
        foreclosure_charges: Math.round((foreClosure_charge + Number.EPSILON) * 100) / 100,
        gst_on_fc: Math.round((gst_on_fc + Number.EPSILON) * 100) / 100,
        gst_on_bc: Math.round((gst_on_bc + Number.EPSILON) * 100) / 100,
        int_due: Math.round((intDue + Number.EPSILON) * 100) / 100,
        int_on_termination: Math.round((int_on_termination + Number.EPSILON) * 100) / 100,
        lpi_due: Math.round((lpiDue + Number.EPSILON) * 100) / 100,
        total_foreclosure_amt: Math.round((totalForecloserCharge - totalExcessAmount + Number.EPSILON) * 100) / 100,
        foreclosure_date: moment(new Date(requestDate)).add(index, 'd').format('YYYY-MM-DD HH:mm:ss'),
        status: 'offered',
      };

      foreclosure_offers.push(obj);
    }

    return foreclosure_offers;
  } catch (error) {
    return {
      success: false,
      message: 'Error while adding foreclosure request',
    };
  }
};

const foreClosureCharge = async (req, res, next) => {
  try {
    const foreclosure_charge = req.loanData.foreclosure_charge ? req.loanData.foreclosure_charge : req.product.foreclosure_charge;
    if (!foreclosure_charge)
      throw {
        success: false,
        message: 'Error while adding foreclosure request',
      };
    //check for absolute or percentage
    let absOrPer = foreclosure_charge.substr(foreclosure_charge.length - 1, foreclosure_charge.length);
    if (absOrPer == 'A') {
      //for absolute
      req.foreClosureCharge = parseFloat(foreclosure_charge.replace(/[^0-9]/g, ''));
    } else {
      //for percentage
      let prinOs = parseFloat(req.loanStateData.prin_os);
      const current_prin_due = req.loanStateData.current_prin_due ? req.loanStateData.current_prin_due : 0;
      let unDuePrinciple = prinOs - current_prin_due;
      req.foreClosureCharge = (parseFloat(foreclosure_charge.replace(/[^0-9]/g, '')) * unDuePrinciple) / 100;
    }

    req.requestDate = moment().endOf('day').format('YYYY-MM-DD');
    req.validityDate = moment().add(3, 'd').format('YYYY-MM-DD');

    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send(error);
  }
};

const createForeClosurePdfFromTemplate = async (loanId, foreclosureRequestID, productData, data) => {
  try {
    let { borrowerData, foreclosureOffer, loanStateData } = data;
    if (!productData) {
      throw {
        success: false,
        message: 'Please provide the product configuration',
      };
    }
    if (!borrowerData) {
      borrowerData = await BorrowerinfoCommon.findByCondition({
        loan_id: loanId,
      });
      if (!borrowerData) {
        throw {
          success: false,
          message: 'No Loan Data found against the provided Loan ID',
        };
      }
    }
    if (!foreclosureOffer) {
      foreclosureOffer = await ForeClosureSchema.findByIdAndLoanId(foreclosureRequestID, loanId);
      if (!foreclosureOffer) {
        throw {
          success: false,
          message: 'No Foreclosure Offer Exist for provided Foreclosure ID',
        };
      }
    }
    if (!loanStateData) {
      loanStateData = await LoanStates.findByLID(loan_id);
      if (!loanStateData) {
        throw {
          success: false,
          message: 'No Loan State Data Found for provided LoanID',
        };
      }
    }
    let loanRequestData = await findBySingleLoanIds(loanId);
    let { resi_addr_ln1, state } = loanRequestData;
    let { prin_os, offers, excess_received, undue_prin_os } = foreclosureOffer;

    let foreclosure_charge = borrowerData.foreclosure_charge ? borrowerData.foreclosure_charge : productData.foreclosure_charge;

    let absOrPer = foreclosure_charge.substr(foreclosure_charge.length - 1, foreclosure_charge.length);
    if (absOrPer == 'A') {
      //for absolute
      foreclosure_charge = parseInt(foreclosure_charge.replace(/\D/g, ''));
    } else {
      //for percentage
      foreclosure_charge = `${foreclosure_charge.replace(/\D/g, '')}%`;
    }

    let offerArray = foreclosureOffer.offers;
    let offerDateAndAmount = [];
    offerArray.forEach((element) => {
      offerDateAndAmount.push({
        date: moment(element.foreclosure_date).format('YYYY-MM-DD'),
        amount: element.total_foreclosure_amt_requested,
      });
    });
    let { first_name, last_name, middle_name = '', loan_id, sanction_amount, disbursement_date_time, loan_int_rate } = borrowerData;

    let { current_int_due = 0, current_prin_due = 0 } = loanStateData;
    let templateBody = {
      template_code: '002',
      template_parameters: JSON.stringify({
        companyName: 'Arthmate Financing India Private Limited',
        cinNumber: 'U23209WB1994PTC063940',
        firstAddress: 'EM03, Unit 1528, 15th Floor, Bengal Eco',
        secondAddress: 'Intelligent Park, Sector V, Saltlake, Kolkata WB 700091',
        emaild: 'statutory.compliance@arthmate.com',
        mobileNumber: '+91 9811232342/8336901886',
        date: moment(foreclosureOffer.offers[0].foreclosure_date).format('YYYY-MM-DD'),
        paymentDate: moment(foreclosureOffer.offers[0].foreclosure_date).format('YYYY-MM-DD'),
        userName: `${first_name} ${middle_name} ${last_name}`,
        userAddress: `${resi_addr_ln1}`, //Loan Request
        userState: `${state}`, //Loan Request
        countryName: 'India', //Loan Request
        user: `${first_name} ${middle_name} ${last_name}`,
        loanAccountNo: `${loan_id}`,
        loanAmount: `${sanction_amount}`,
        disbursalDate: moment(disbursement_date_time).format('YYYY-MM-DD'),
        principalOutstanding: `${parseFloat(undue_prin_os).toFixed(2)}`,
        lastPaymentCharges: parseFloat(offers[0].lpi_due).toFixed(2),
        chequeBouncingCharges: parseFloat(parseFloat(offers[0].bounce_charges) + parseFloat(offers[0].gst_on_bc)).toFixed(2),
        interest: parseFloat(offers[0].int_on_termination).toFixed(2),
        foreclosureChargePercent: `${foreclosure_charge}`,
        foreclosurecharges: (parseFloat(offers[0].foreclosure_charges) + parseFloat(offers[0].gst_on_fc)).toFixed(2),
        perDayInterest: ((parseFloat(undue_prin_os) * loan_int_rate) / 36500).toFixed(2),
        pendingInstallments: (parseFloat(current_prin_due) + parseFloat(current_int_due)).toFixed(2), //loan_states
        intTermination: parseFloat(offers[0].int_due - current_int_due).toFixed(2), //Offer[0]int_due-Loan_states current_interest_due,
        intamount: parseFloat((prin_os * loan_int_rate) / 36500).toFixed(2),
        waiverOff: parseFloat(offers[0].interest_waiver + offers[0].lpi_waiver + offers[0].bounce_charges_waiver + offers[0].fc_waiver + offers[0].gst_reversal_bc + offers[0].gst_reversal_fc).toFixed(2), //current_interest_due+current_prin_os_due,
        totalDue: parseFloat(offers[0].total_foreclosure_amt_requested + excess_received).toFixed(2), //total_foreclosure_amt_requested for first_offer + access,
        totalRefunds: parseFloat(excess_received).toFixed(2), //Excess,
        total: parseFloat(offers[0].total_foreclosure_amt_requested).toFixed(2), //foreclosure_amount_request,
        days: `${foreclosureOffer.offers.length}`,
        monthDate: '20',
        prePaymentDays: '25',
        offer: offerDateAndAmount,
      }),
    };
    const config = {
      headers: {
        authorization: process.env.PDF_URL_AUTHROIZATION_KEY,
        'Content-Type': 'application/json',
      },
    };
    let responseData = await createPdf(templateBody, config);
    return responseData ? responseData.data : null;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const checkIfForeclosureOfferIsInApprovedState = async (req, res, next) => {
  try {
    if (!req.body.loan_id) {
      throw {
        success: false,
        message: 'Error please provide a loanId',
      };
    }
    let foreclosureData=await ForeClosureSchema.findByCondition({loan_id:req.body.loan_id,status:"approved"}) || []
    if(foreclosureData.length>0)
    {
      throw {
        success: false,
        message: 'Foreclosure offer already exist in the approved state for the provided loanId',
      };
    }
    next()
  } catch (err) {
    return res.status(400).send(error);
  }
};

module.exports = {
  validateData,
  fetchRepayInstallment,
  fetchLoanStateData,
  validateForeclosureRequest,
  foreclosureCalculations,
  foreClosureCharge,
  isLoanExistInForeclosure,
  createForeClosurePdfFromTemplate,
  checkIfForeclosureOfferIsInApprovedState
};

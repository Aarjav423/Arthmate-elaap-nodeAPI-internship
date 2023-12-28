'use strict';
const helper = require('./helper');
const moment = require('moment');
const WalletLedger = require('../models/wallet-ledger-schema.js');
const { getEPSILON } = require('./math-ops');

const getVal = (value) => {
  if (value?.$numberDecimal !== undefined) {
    return parseFloat(value.$numberDecimal.toString());
  } else if (typeof value === 'object') {
    return parseFloat(value.toString());
  }
  return value;
};

const calculateUpfrontCharges = (capturedBI, product, txnAmount, txn_date) => {
  let charges = {};
  try {
    charges['fees'] = helper.calculateConfigFieldValue('fees', capturedBI, product, '0UA');
    charges['processing_fees'] = helper.calculateConfigFieldValue('processing_fees', capturedBI, product, '0UA');
    charges['upfront_interest'] = helper.calculateConfigFieldValue('upfront_interest', capturedBI, product, '0UA');
    charges['subvention_fees'] = helper.calculateConfigFieldValue('subvention_fees', capturedBI, product, '0UA');
    charges['usage_fee'] = helper.calculateConfigFieldValue('usage_fee', capturedBI, product, '0UA');
    charges['upfront_deducted_charges'] = 0;
    charges['upfront_fees'] = 0;
    charges['upfront_processing_fees'] = 0;
    charges['upfront_int_amount'] = 0;
    charges['upfront_subvention_fees'] = 0;
    charges['upfront_usage_fee'] = 0;
    var upfront_interest_days = helper.calculateConfigFieldValue('upfront_interest_days', capturedBI, product, 0);
    if (upfront_interest_days < 1) {
      var is_monthly_billing_date_fixed = capturedBI.is_monthly_billing_date_fixed || product.monthly_billing_cycle_day;
      var monthly_billing_cycle_day = capturedBI.monthly_billing_cycle_day || product.monthly_billing_cycle_day || 1;
      var txn_day_date = moment(txn_date, 'YYYY/MM/DD');
      var txn_day = txn_day_date.format('DD');
      var isTxnAfterBillingDay = txn_day * 1 > monthly_billing_cycle_day * 1;
      var days_in_month = moment(txn_date).daysInMonth();

      upfront_interest_days = isTxnAfterBillingDay ? days_in_month - txn_day + monthly_billing_cycle_day : 0;
    }
    charges['upfront_interest_days'] = upfront_interest_days;
    var upfrontInterstPercentage = ((charges.upfront_interest.replace(/[a-zA-Z]+/g, '') * 1) / 365) * (charges['upfront_interest_days'] * 1);
    charges.upfront_fees += charges.fees.indexOf('UA') > -1 ? charges.fees.replace(/[a-zA-Z]+/g, '') * 1 : charges.fees.indexOf('UP') > -1 ? ((charges.fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) * txnAmount : 0;
    charges.upfront_processing_fees += charges.processing_fees.indexOf('UA') > -1 ? charges.processing_fees.replace(/[a-zA-Z]+/g, '') * 1 : charges.processing_fees.indexOf('UP') > -1 ? ((charges.processing_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) * txnAmount : 0;
    charges.upfront_int_amount += charges.upfront_interest.indexOf('UA') > -1 ? charges.upfront_interest.replace(/[a-zA-Z]+/g, '') * 1 : charges.upfront_interest.indexOf('UP') > -1 ? (txnAmount * 1 * (upfrontInterstPercentage * 1)) / 100 : 0;
    charges.upfront_subvention_fees += charges.subvention_fees.indexOf('UA') > -1 ? charges.subvention_fees.replace(/[a-zA-Z]+/g, '') * 1 : charges.subvention_fees.indexOf('UP') > -1 ? ((charges.subvention_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) * txnAmount : 0;
    charges.upfront_usage_fee += charges.usage_fee.indexOf('UA') > -1 ? charges.usage_fee.replace(/[a-zA-Z]+/g, '') * 1 : charges.usage_fee.indexOf('UP') > -1 ? ((charges.usage_fee.replace(/[a-zA-Z]+/g, '') * 1) / 100) * txnAmount : 0;
    charges.upfront_deducted_charges += charges.upfront_fees + charges.upfront_processing_fees + charges.upfront_int_amount + charges.upfront_subvention_fees + charges.upfront_usage_fee;
    return charges;
  } catch (err) {
    return err;
  }
};

// check disbursement channel wallet balance
const checkWalletBalance = async (data) => {
  const { company_id, product_id, lender_id, disbursement_channel } = data;
  let creditAmount = 0;
  let debitAmount = 0;
  //fetch wallet data by requested filter
  const walletResp = await WalletLedger.getWalletBalance(data);
  if (!walletResp.length)
    throw {
      success: false,
      message: 'No records found in wallet ledger',
    };
  //make sum of cr and dr entries from response
  walletResp.forEach((row, index) => {
    if (row.txn_type === 'dr') {
      debitAmount += parseFloat(row.txn_amount);
    }
    if (row.txn_type === 'cr') {
      creditAmount += parseFloat(row.txn_amount);
    }
  });
  //calculate wallet balance as substractio of credit amount and debit amount
  const disburseWalletBalance = creditAmount - debitAmount;
  if (disburseWalletBalance <= 0)
    return {
      success: false,
      message: 'Insufficient disbursement wallet balance',
    };
  return {
    success: true,
    disburseWalletBalance,
  };
};

const calculateGST = async (data, product) => {
  try {
    const processingFees = Number(data.processing_fees_amt) >= 0 ? Number(data.processing_fees_amt) : product.processing_fees.indexOf('A') > -1 ? product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1 : product.processing_fees.indexOf('P') > -1 ? ((product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) * Number(data.sanction_amount) : 0;
    let gstPercentage = 0;
    // check which gst is applicable state+central or igst
    gstPercentage = data.state.toUpperCase() === 'HARYANA' ? product.cgst_on_pf_perc * 1 + product.sgst_on_pf_perc * 1 : product.igst_on_pf_perc;

    // GST amount provided in Loan API.
    const providedGstAmt = Math.round((data.gst_on_pf_amt * 1 + Number.EPSILON) * 100) / 100;

    // Calculate GST amount with PF amount and GST % config in product
    let calculatedGstAmt = (gstPercentage / 100) * processingFees;
    calculatedGstAmt = Math.round((calculatedGstAmt + Number.EPSILON) * 100) / 100;
    const diff = Number(calculatedGstAmt) - Number(providedGstAmt);
    // GST on Processing Fees validation should ignore +1 or -1 mismatch in loan api.
    if (diff > 1 || diff < -1) {
      throw {
        success: false,
        errorCode: 10001,
        message: `GST amount ${providedGstAmt} is not correct as per applicable GST rate ${gstPercentage}% on processing fees of ${processingFees}, it should be ${calculatedGstAmt}`,
      };
    }
    //Calculate cgst,sgst and igst as per product configurations
    let calculatedCgst = Number(calculatedGstAmt / 2);
    let calculatedSgst = Number(calculatedGstAmt / 2);
    let calculatedIgst = Number(calculatedGstAmt);
    if (data.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
      calculatedCgst = Math.round((calculatedCgst + Number.EPSILON) * 100) / 100;
      calculatedSgst = Math.round((calculatedSgst + Number.EPSILON) * 100) / 100;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
      calculatedIgst = Math.round((calculatedIgst + Number.EPSILON) * 100) / 100;
    }
    return {
      success: true,
      calculatedGstAmt,
      calculatedCgst,
      calculatedSgst,
      calculatedIgst,
    };
  } catch (error) {
    return error;
  }
};

const calculateBrokenInterest = (data, product) => {
  try {
    let brokenInterestAmount = 0;
    if (!data.first_inst_date)
      throw {
        success: false,
        message: 'first_inst_date is missing in the request',
      };
    const brokenInterestAmountPerDay = data.loan_int_rate ? Number(((data.loan_int_rate * 1) / 100 / 365) * data.sanction_amount) : 0;
    //If first_inst_date(10 feb 2022) > disb_date(05 jan 2022) calculate broken interest for 5-10 i.e 5 days
    if (moment(data.final_approve_date).format('YYYY-MM-DD') > moment(data.first_inst_date).format('YYYY-MM-DD')) {
      throw {
        success: false,
        message: 'disbursement_date should be less than first_inst_date',
      };
    }
    const startDate = moment(data.final_approve_date, 'YYYY-MM-DD');
    const endDate = moment(data.first_inst_date, 'YYYY-MM-DD');
    //calculate difference in days day of data.final_approve_date and data.first_inst_date
    const brokenInterestDays = endDate.diff(startDate, 'days');
    //Calculate broken interest on sanction amount as per broken_interest_rate configured in product
    if (brokenInterestDays > 30) {
      brokenInterestAmount += brokenInterestAmountPerDay * ((brokenInterestDays - 30) * 1);
    }

    return {
      success: true,
      brokenInterestAmount: Math.round((brokenInterestAmount + Number.EPSILON) * 100) / 100,
    };
  } catch (error) {
    return error;
  }
};

const calculateNetDisbursementAmount = (brokenInterest, gstAmount, data, product) => {
  try {
    let netDisbursementAmount = 0;
    let providedNetDisbAmount = Math.round((data.net_disbur_amt * 1 + Number.EPSILON) * 100) / 100;
    let processingFees = data.processing_fees_amt ? data.processing_fees_amt * 1 : 0;
    let subventionFees = 0;
    let applicationFees = 0;
    let stampCharges = 0;
    let advanceEmi = 0;
    let downpaymentAmount = 0;
    let convFees = data.conv_fees ? Number(data.conv_fees) : 0;
    let upfrontInterest = product.interest_type === 'upfront' && data.upfront_interest ? Number(data.upfront_interest) : 0;
    let applicationCharges = data.application_fees ? Number(data.application_fees) : 0;
    let insuranceAmount = data.insurance_amount ? Number(data.insurance_amount) : 0;
    let withheld_amt = 0;
    // if cash collateral product
    if (product?.cash_collateral) {
      // if both withheld_amt && withheld_percent not passed
      if (!data.withheld_amt && !data.withheld_percent) {
        if (product?.withhold_amount.includes('UA')) {
          withheld_amt = Number(product.withhold_amount.toString().replace(/[a-zA-Z]+/g, ''));
        }
        if (product?.withhold_amount.includes('UP')) {
          let percent = Number(product.withhold_amount.toString().replace(/[a-zA-Z]+/g, ''));
          withheld_amt = (data.sanction_amount * percent) / 100;
        }
      }
      // only withheld_amt is passed
      else if (data.withheld_amt && !data.withheld_percent) {
        withheld_amt = data.withheld_amt ? Number(data.withheld_amt) : 0;
      }
      // only withheld_percent is passes
      else if (!data.withheld_amt && data.withheld_percent) {
        let percent = Number(data.withheld_percent);
        withheld_amt = (data.sanction_amount * percent) / 100;
      }
      // if both passed
      else if (data.withheld_amt && data.withheld_percent) {
        let amountFromWithheldAMount = data.withheld_amt ? Number(data.withheld_amt) : 0;
        let amountFromWithheldPercent = (data.sanction_amount * data.withheld_percent) / 100;
        const difference = Number(amountFromWithheldAMount) - Number(amountFromWithheldPercent);
        if (difference > 1 || difference < -1) {
          throw {
            success: false,
            errorCode: 10001,
            message: `Withhend Amount is wrong as per the withheld percentage provided.`,
          };
        } else {
          withheld_amt = Number(data.withheld_amt);
        }
      }
    } // if not cash collateral product
    else {
      withheld_amt = data.withheld_amt ? Number(data.withheld_amt) : 0;
    }
    if (product.subvention_based || product.subvention_based === '1') {
      subventionFees += data.subvention_fees * 1;
    }
    if (product.application_fee || product.application_fee === '1') {
      applicationFees += data.app_charges * 1;
    }
    if (product.stamp_charges || product.stamp_charges === '1') {
      stampCharges += data.stamp_charges * 1;
    }
    if (product.insurance_charges || product.insurance_charges === '1') {
      insuranceAmount = data.insurance_amount ? Number(data.insurance_amount) : 0;
    }
    if (product.advance_emi || product.advance_emi === '1') {
      advanceEmi += data.advance_emi * 1;
    }
    if (product?.downpayment == 1) {
      downpaymentAmount = data.downpayment_amount * 1;
    }
    //calculate net disbursement amount
    netDisbursementAmount = data.sanction_amount * 1 - (upfrontInterest + processingFees + subventionFees * 1 + applicationFees * 1 + stampCharges * 1 + brokenInterest * 1 + gstAmount * 1 + advanceEmi * 1 + convFees + applicationCharges + insuranceAmount + withheld_amt) + downpaymentAmount;

    netDisbursementAmount = Math.round((netDisbursementAmount + Number.EPSILON) * 100) / 100;

    //Validate calculated net_disbursement_amount with net_disbursement_amount passed in data
    const diff = Number(providedNetDisbAmount) - Number(netDisbursementAmount);
    // netDisbursementAmount validation should ignore +1 or -1 mismatch in loan api.
    if (diff > 1 || diff < -1) {
      throw {
        success: false,
        errorCode: 10001,
        message: `net_disbur_amt mismatch calculatedNetDisbAmt ${netDisbursementAmount}`,
      };
    }

    return {
      success: true,
      netDisbursementAmount,
      withheld_amt,
    };
  } catch (error) {
    return error;
  }
};

const EMI_frequncy_master = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  bullet: 1,
};

const getEndDateByRepaymentType = (type, first_inst_date, loan_tenure) => {
  switch (type) {
    case 'daily':
      return moment(first_inst_date)
        .add(loan_tenure - 1, 'day')
        .format('YYYY-MM-DD');
    case 'monthly':
      return moment(first_inst_date)
        .add(loan_tenure - 1, 'M')
        .format('YYYY-MM-DD');
    case 'weekly':
      return moment(first_inst_date)
        .add((loan_tenure - 1) * 7, 'day')
        .format('YYYY-MM-DD');
    default:
      break;
  }
};

const generateRepaySch = (data, product) => {
  try {
    let repaymentSchData = data;
    if (!data.repayment_type) {
      return {
        success: false,
        message: 'repayment_type is required',
      };
    }
    if (!data.int_type) {
      return {
        success: false,
        message: 'interest_rate_type is required',
      };
    }
    if (!data.emi_count) {
      return {
        success: false,
        message: 'emi_count is required',
      };
    }
    if (!data.sanction_amount) {
      return {
        success: false,
        message: 'sanction_amount is required',
      };
    }
    if (!data.intr_rate) {
      return {
        success: false,
        message: 'int_value is required',
      };
    }
    if (!data.first_inst_date) {
      return {
        success: false,
        message: 'first_inst_date is required',
      };
    }
    const emiFreq = EMI_frequncy_master[repaymentSchData.repayment_type.toLowerCase()];
    let monthly = 0;
    if (repaymentSchData.int_type.toLowerCase() === 'flat' && repaymentSchData.repayment_type.toLowerCase() !== 'bullet') {
      const principal = Math.round((repaymentSchData.sanction_amount * 1 + Number.EPSILON) * 100) / 100;

      const calculatedPayments = repaymentSchData.emi_count * 1;
      const calculatedInterest = (principal * 1 * ((calculatedPayments * 1) / (emiFreq * 1)) * (repaymentSchData.intr_rate * 1)) / 100;

      if (product.interest_type === 'upfront') {
        monthly = Math.round(((principal * 1) / (repaymentSchData.emi_count * 1) + Number.EPSILON) * 100) / 100;
      } else {
        monthly = Math.round(((principal * 1 + calculatedInterest * 1) / (repaymentSchData.emi_count * 1) + Number.EPSILON) * 100) / 100;
      }

      repaymentSchData.inst_date_after_advance_emis = repaymentSchData.first_inst_date;
      // Get last installment date
      repaymentSchData.end_date = getEndDateByRepaymentType(repaymentSchData.repayment_type.toLowerCase(), repaymentSchData.first_inst_date, repaymentSchData.emi_count - Number(repaymentSchData.advance_emi));
      // Get installment amount
      repaymentSchData.emi_amount = Math.round((monthly * 1 + Number.EPSILON) * 100) / 100;
      repaymentSchData.total_repayment = Math.round((monthly * 1 * (calculatedPayments * 1) + Number.EPSILON) * 100) / 100;
      //Get total interest
      repaymentSchData.total_interest = Math.round((monthly * 1 * (calculatedPayments * 1) - principal * 1 + Number.EPSILON) * 100) / 100;
    } else if (repaymentSchData.repayment_type.toLowerCase() == 'daily' && repaymentSchData.int_type.toLowerCase() === 'flat') {
      const principal = Math.round((repaymentSchData.sanction_amount * 1 + Number.EPSILON) * 100) / 100;

      const calculatedPayments = repaymentSchData.emi_count * 1;

      const calculatedInterest = (principal * 1 * ((calculatedPayments * 1) / (emiFreq * 1)) * (repaymentSchData.intr_rate * 1)) / 100;
      const monthly = (principal * 1 + calculatedInterest * 1) / (repaymentSchData.emi_count * 1);
      repaymentSchData.inst_date_after_advance_emis = repaymentSchData.first_inst_date;
      repaymentSchData.end_date = getEndDateByRepaymentType(repaymentSchData.repayment_type.toLowerCase(), repaymentSchData.first_inst_date, repaymentSchData.emi_count - Number(repaymentSchData.advance_emi));
      repaymentSchData.first_inst_date = Number(repaymentSchData.advance_emi) > 0 ? repaymentSchData.disburse_date : repaymentSchData.first_inst_date;
      repaymentSchData.emi_amount = monthly * 1;
      repaymentSchData.total_repayment = monthly * 1 * (calculatedPayments * 1);
      repaymentSchData.total_interest = monthly * 1 * (calculatedPayments * 1) - principal * 1;
    } else if (repaymentSchData.repayment_type.toLowerCase() == 'daily' && repaymentSchData.int_type.toLowerCase() === 'reducing') {
      const principal = repaymentSchData.sanction_amount * 1;

      const calculatedInterest = parseFloat(repaymentSchData.intr_rate * 1) / 100 / emiFreq;
      const calculatedPayments = repaymentSchData.emi_count * 1;
      const x = Math.pow(1 + calculatedInterest * 1, calculatedPayments * 1);
      const monthly = (principal * x * calculatedInterest) / (x - 1);

      repaymentSchData.inst_date_after_advance_emis = repaymentSchData.first_inst_date;
      repaymentSchData.end_date = getEndDateByRepaymentType(repaymentSchData.repayment_type.toLowerCase(), repaymentSchData.first_inst_date, repaymentSchData.emi_count - Number(repaymentSchData.advance_emi));
      repaymentSchData.first_inst_date = Number(repaymentSchData.advance_emi) > 0 ? repaymentSchData.disburse_date : repaymentSchData.first_inst_date;

      repaymentSchData.emi_amount = monthly * 1;
      repaymentSchData.total_repayment = monthly * 1 * (calculatedPayments * 1);
      repaymentSchData.total_interest = monthly * 1 * (calculatedPayments * 1) - principal * 1;
    } else if (repaymentSchData.repayment_type.toLowerCase() === 'bullet' && !product.allow_loc) {
      const principal = repaymentSchData.sanction_amount * 1;
      let calculatedInterestRate = parseFloat(repaymentSchData.intr_rate * 1) / 100;
      calculatedInterestRate = calculatedInterestRate / 365;

      let calculatedInterest = principal * calculatedInterestRate * repaymentSchData.tenure_in_days;
      //Ovverride first_inst_date for loan repayment type having bullet
      repaymentSchData.first_inst_date = moment()
        .add(repaymentSchData.tenureCaptured - 1, 'days')
        .format('YYYY-MM-DD');

      repaymentSchData.emi_amount = (principal + calculatedInterest).toFixed(2);
      repaymentSchData.total_repayment = repaymentSchData.emi_amount;
      repaymentSchData.total_interest = calculatedInterest.toFixed(2);
    } else {
      const principal = repaymentSchData.sanction_amount * 1;

      const calculatedInterest = parseFloat(repaymentSchData.intr_rate * 1) / 100 / emiFreq;
      const calculatedPayments = repaymentSchData.emi_count * 1;
      const x = Math.pow(1 + calculatedInterest * 1, calculatedPayments * 1);
      const monthly = ((principal * x * calculatedInterest) / (x - 1)).toFixed(2);

      repaymentSchData.inst_date_after_advance_emis = repaymentSchData.first_inst_date;
      repaymentSchData.end_date = getEndDateByRepaymentType(repaymentSchData.repayment_type.toLowerCase(), repaymentSchData.first_inst_date, repaymentSchData.emi_count - Number(repaymentSchData.advance_emi));
      repaymentSchData.first_inst_date = Number(repaymentSchData.advance_emi) > 0 ? repaymentSchData.disburse_date : repaymentSchData.first_inst_date;

      repaymentSchData.emi_amount = (monthly * 1).toFixed(2);
      repaymentSchData.total_repayment = (monthly * 1 * (calculatedPayments * 1)).toFixed(2);
      repaymentSchData.total_interest = (monthly * 1 * (calculatedPayments * 1) - principal * 1).toFixed(2);
    }
    const repaymentScheduleGenerated = repaymentSchData.repayment_type.toLowerCase() === 'bullet' && !product.allow_loc ? generateRepayDatesAmntsBullet(repaymentSchData) : generateRepayDatesAmnts(repaymentSchData);
    return {
      success: true,
      repaymentScheduleGenerated,
    };
  } catch (err) {
    return err;
  }
};

const generateRepayDatesAmnts = (data) => {
  const repaymentSchData = data;

  try {
    let schedules = [];
    const emiFreq = EMI_frequncy_master[repaymentSchData.repayment_type.toLowerCase()];
    if (data.int_type.toLowerCase() === 'flat') {
      let repayment_balance = Math.round(((data.total_repayment * 1 - data.total_interest * 1) * 1 + Number.EPSILON) * 100) / 100;
      let emi_date = moment(data.first_inst_date);
      for (var i = 0; i < data.emi_count; i++) {
        data.id = i + 1;
        const emi_amount = data.emi_amount * 1;
        const int_amount = (data.total_interest * 1) / (data.emi_count * 1);
        let prin = emi_amount * 1 - int_amount * 1;
        if (i == data.emi_count - 1) prin += repayment_balance - prin;
        repayment_balance = Math.round(((repayment_balance * 1 - prin * 1) * 1 + Number.EPSILON) * 100) / 100;
        emi_date = data.advance_emi && Number(data.advance_emi) > i ? moment(data.disburse_date) : data.advance_emi && i === Number(data.advance_emi) ? moment(data.inst_date_after_advance_emis) : i <= 0 ? emi_date : data.repayment_type.toLowerCase() === 'weekly' ? emi_date.add(1, 'W') : data.repayment_type.toLowerCase() === 'monthly' ? emi_date.add(1, 'M') : data.repayment_type.toLowerCase() === 'quarterly' ? emi_date.add(3, 'M') : emi_date.add(1, 'M');
        let installment = {
          emi_no: data.id,
          due_date: moment(emi_date).format('YYYY-MM-DD'),
          emi_amount: Math.round((data.emi_amount * 1 + Number.EPSILON) * 100) / 100,
          prin: Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) / 100,
          int_amount: Math.round((int_amount * 1 + Number.EPSILON) * 100) / 100,
          principal_bal: repayment_balance,
          status: data.advance_emi && Number(data.advance_emi) > i ? 'PAID' : 'OPEN',
          principal_outstanding: Math.round((prin + Number(repayment_balance * 1) + Number.EPSILON) * 100) / 100,
        };
        if (data.repayment_type.toLowerCase() === 'daily') {
          delete installment.due_date;
        }
        schedules.push(installment);
      }
    } else if (data.repayment_type.toLowerCase() === 'daily') {
      let repayment_balance = Math.round((data.total_repayment * 1 - data.total_interest * 1 + Number.EPSILON) * 100) / 100;
      let emi_date = moment(data.first_inst_date);
      for (var i = 0; i < data.emi_count; i++) {
        data.id = i + 1;
        const emi_amount = data.emi_amount * 1;
        let int_amount = (repayment_balance * 1 * ((data.intr_rate * 1) / 100)) / (emiFreq * 1);
        const prin = emi_amount * 1 - int_amount * 1;
        repayment_balance = repayment_balance * 1 - prin * 1;
        emi_date =
          data.advance_emi && Number(data.advance_emi) > i
            ? moment(data.disburse_date)
            : data.advance_emi && i === Number(data.advance_emi)
            ? moment(data.inst_date_after_advance_emis)
            : i <= 0
            ? emi_date
            : data.repayment_type.toLowerCase() === 'weekly'
            ? emi_date.add(1, 'W')
            : data.repayment_type.toLowerCase() === 'monthly'
            ? emi_date.add(1, 'M')
            : data.repayment_type.toLowerCase() === 'daily'
            ? emi_date.add('days', 1)
            : data.repayment_type.toLowerCase() === 'quarterly'
            ? emi_date.add(3, 'M')
            : emi_date.add(1, 'M');
        let installment = {
          emi_no: data.id,
          emi_amount: Math.round((data.emi_amount * 1 + Number.EPSILON) * 100) / 100,
          prin: Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) / 100,
          int_amount: Math.round((int_amount * 1 + Number.EPSILON) * 100) / 100,
          principal_bal: Math.round((repayment_balance * 1 + Number.EPSILON) * 100) / 100,
          status: data.advance_emi && Number(data.advance_emi) > i ? 'PAID' : 'OPEN',
          principal_outstanding: Math.round((prin + Number(repayment_balance * 1) + Number.EPSILON) * 100) / 100,
        };
        schedules.push(installment);
      }
    } else {
      let repayment_balance = (data.total_repayment * 1 - data.total_interest * 1).toFixed(2);

      let emi_date = moment(data.first_inst_date);
      for (var i = 0; i < data.emi_count; i++) {
        data.id = i + 1;
        const emi_amount = data.emi_amount * 1;

        let int_amount = (repayment_balance * 1 * ((data.intr_rate * 1) / 100)) / (emiFreq * 1);

        int_amount = int_amount.toFixed(2);

        let prin = emi_amount * 1 - int_amount * 1;

        if (i == data.emi_count - 1) prin += repayment_balance - prin;

        repayment_balance = repayment_balance * 1 - prin * 1;
        emi_date = data.advance_emi && Number(data.advance_emi) > i ? moment(data.disburse_date) : data.advance_emi && i === Number(data.advance_emi) ? moment(data.inst_date_after_advance_emis) : i <= 0 ? emi_date : data.repayment_type.toLowerCase() === 'weekly' ? emi_date.add(1, 'W') : data.repayment_type.toLowerCase() === 'monthly' ? emi_date.add(1, 'M') : data.repayment_type.toLowerCase() === 'quarterly' ? emi_date.add(3, 'M') : emi_date.add(1, 'M');
        let installment = {
          emi_no: data.id,
          due_date: moment(emi_date).format('YYYY-MM-DD'),

          emi_amount: (data.emi_amount * 1).toFixed(2),
          prin: (emi_amount * 1 - int_amount * 1).toFixed(2),
          int_amount: (int_amount * 1).toFixed(2),
          principal_bal: (repayment_balance * 1).toFixed(2),
          status: data.advance_emi && Number(data.advance_emi) > i ? 'PAID' : 'OPEN',
          principal_outstanding: Math.round((prin + Number(repayment_balance * 1) + Number.EPSILON) * 100) / 100,
        };
        schedules.push(installment);
      }
    }
    return schedules;
  } catch (err) {
    return err;
  }
};

const generateRepayDatesAmntsBullet = (data) => {
  try {
    const repaymentSchData = data;

    let schedules = [];
    const emiFreq = EMI_frequncy_master[repaymentSchData.repayment_type.toLowerCase()];
    let repayment_balance = repaymentSchData.emi_amount;
    let emi_date = repaymentSchData.first_inst_date;
    data.id = 1;
    const emi_amount = repaymentSchData.emi_amount * 1;
    let int_amount = repaymentSchData.total_interest;
    let prin = emi_amount * 1 - int_amount * 1;
    let installment = {
      emi_no: data.id,
      due_date: repaymentSchData.first_inst_date,
      emi_amount: data.emi_amount * 1,
      prin: Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) / 100,
      int_amount: int_amount * 1,
      principal_bal: Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) / 100,
      status: 'OPEN',
      principal_outstanding: Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) / 100,
    };
    schedules.push(installment);
    return schedules;
  } catch (err) {
    return err;
  }
};

const calculateSubventionFeesExcGST = (data, product) => {
  try {
    let subventionFeesAmt = data.subvention_fees ? Number(data.subvention_fees) : 0;
    let subventionFeesExcludingGst = 0;
    let gstOnSubventionFees = 0;
    let cgstOnSubventionFees = 0;
    let sgstOnSubventionFees = 0;
    let igstOnSubventionFees = 0;
    subventionFeesAmt = Math.round((subventionFeesAmt + Number.EPSILON) * 100) / 100;
    subventionFeesExcludingGst = data.subvention_fees ? subventionFeesAmt / 1.18 : 0;
    subventionFeesExcludingGst = Math.round((subventionFeesExcludingGst + Number.EPSILON) * 100) / 100;
    gstOnSubventionFees = Math.round((subventionFeesAmt - subventionFeesExcludingGst + Number.EPSILON) * 100) / 100;
    gstOnSubventionFees = Math.round((gstOnSubventionFees * 1 + Number.EPSILON) * 100) / 100;
    //Calculate cgst,sgst and igst as per product configurations
    cgstOnSubventionFees = Number(gstOnSubventionFees / 2);
    sgstOnSubventionFees = Number(gstOnSubventionFees / 2);
    igstOnSubventionFees = Number(gstOnSubventionFees);
    // Divide gst according to the subventor state
    if (data.subventor_addr_state?.toUpperCase() === 'HARYANA') {
      igstOnSubventionFees = 0;
      cgstOnSubventionFees = Math.round((cgstOnSubventionFees + Number.EPSILON) * 100) / 100;
      sgstOnSubventionFees = Math.round((sgstOnSubventionFees + Number.EPSILON) * 100) / 100;
    } else {
      cgstOnSubventionFees = 0;
      sgstOnSubventionFees = 0;
      igstOnSubventionFees = Math.round((igstOnSubventionFees + Number.EPSILON) * 100) / 100;
    }
    return {
      subventionFeesAmt,
      gstOnSubventionFees,
      cgstOnSubventionFees,
      sgstOnSubventionFees,
      igstOnSubventionFees,
      subventionFeesExcludingGst,
    };
  } catch (error) {
    return error;
  }
};

const calculateGSTOnConvFees = async (data, lead, product) => {
  try {
    let convFeesExcludingGst = 0;
    let calculatedGstAmt = 0;
    let convFees = data.conv_fees ? Number(data.conv_fees) : 0;
    convFees = Math.round((convFees + Number.EPSILON) * 100) / 100;
    convFeesExcludingGst = data.conv_fees ? convFees / 1.18 : 0;
    convFeesExcludingGst = Math.round((convFeesExcludingGst + Number.EPSILON) * 100) / 100;
    calculatedGstAmt = Math.round((convFees - convFeesExcludingGst + Number.EPSILON) * 100) / 100;
    //Calculate cgst,sgst and igst as per product configurations
    let calculatedCgst = Number(calculatedGstAmt / 2);
    let calculatedSgst = Number(calculatedGstAmt / 2);
    let calculatedIgst = Number(calculatedGstAmt);
    if (lead.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
      calculatedCgst = Math.round((calculatedCgst + Number.EPSILON) * 100) / 100;
      calculatedSgst = Math.round((calculatedSgst + Number.EPSILON) * 100) / 100;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
      calculatedIgst = Math.round((calculatedIgst + Number.EPSILON) * 100) / 100;
    }
    return {
      success: true,
      calculatedGstAmt,
      calculatedCgst,
      calculatedSgst,
      calculatedIgst,
      convFeesExcludingGst,
    };
  } catch (error) {
    return error;
  }
};

const calculateGSTOnApplicationFees = async (data, lead, product) => {
  try {
    let applFeesExcludingGst = 0;
    let calculatedGstAmt = 0;
    let applFees = data.application_fees ? Number(data.application_fees) : 0;
    applFees = Math.round((applFees + Number.EPSILON) * 100) / 100;
    applFeesExcludingGst = data.application_fees ? applFees / 1.18 : 0;
    applFeesExcludingGst =
      Math.round((applFeesExcludingGst + Number.EPSILON) * 100) / 100;
    calculatedGstAmt =
      Math.round((applFees - applFeesExcludingGst + Number.EPSILON) * 100) /
      100;
    //Calculate cgst,sgst and igst as per product configurations
    let calculatedCgst = Number(calculatedGstAmt / 2);
    let calculatedSgst = Number(calculatedGstAmt / 2);
    let calculatedIgst = Number(calculatedGstAmt);
    if (lead.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
      calculatedCgst =
        Math.round((calculatedCgst + Number.EPSILON) * 100) / 100;
      calculatedSgst =
        Math.round((calculatedSgst + Number.EPSILON) * 100) / 100;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
      calculatedIgst =
        Math.round((calculatedIgst + Number.EPSILON) * 100) / 100;
    }
    return {
      success: true,
      calculatedGstAmt,
      calculatedCgst,
      calculatedSgst,
      calculatedIgst,
      applFeesExcludingGst,
    };
  } catch (error) {
    return error;
  }
};
const calculateGSTOnApplicationFeesForMSME= async (data, lead, product) => {
  try {
    let applFeesExcludingGst = 0;
    let calculatedGstAmt = 0;
    let applFees = data.application_fees ? Number(data.application_fees) : 0;
    applFees = Math.round((applFees + Number.EPSILON) * 100) / 100;
    applFeesExcludingGst = data.application_fees ? applFees / 1.18 : 0;
    applFeesExcludingGst =
      Math.round((applFeesExcludingGst + Number.EPSILON) * 100) / 100;
    calculatedGstAmt =
      Math.round((applFees - applFeesExcludingGst + Number.EPSILON) * 100) /
      100;
    //Calculate cgst,sgst and igst as per product configurations
    let calculatedCgst = Number(calculatedGstAmt / 2);
    let calculatedSgst = Number(calculatedGstAmt / 2);
    let calculatedIgst = Number(calculatedGstAmt);
    if (lead.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
      calculatedCgst =
        Math.round((calculatedCgst + Number.EPSILON) * 100) / 100;
      calculatedSgst =
        Math.round((calculatedSgst + Number.EPSILON) * 100) / 100;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
      calculatedIgst =
        Math.round((calculatedIgst + Number.EPSILON) * 100) / 100;
    }
    return {
      success: true,
      calculatedGstAmt,
      calculatedCgst,
      calculatedSgst,
      calculatedIgst,
      applFeesExcludingGst,
    };
  } catch (error) {
    return error;
  }
};
const calculateGSTOnCharges = (charge, state, product) => {
  try {
    let gstPercentage = 0;
    const isSameState = state?.toUpperCase() === 'HARYANA';
    // check which gst is applicable state+central or igst
    gstPercentage = isSameState ? product.cgst_on_pf_perc * 1 + product.sgst_on_pf_perc * 1 : product.igst_on_pf_perc;
    // Calculate GST amount with PF amount and GST % config in product
    let gst = (gstPercentage / 100) * charge * 1;
    gst = Math.round((gst + Number.EPSILON) * 100) / 100;
    //Calculate cgst,sgst and igst as per product configurations
    let cgst = !isSameState ? 0 : Number(gst / 2);
    let sgst = !isSameState ? 0 : Number(gst / 2);
    let igst = isSameState ? 0 : Number(gst);
    return {
      success: true,
      gst,
      cgst,
      sgst,
      igst,
    };
  } catch (error) {
    return error;
  }
};

const calculateUpfrontInterest = (req, data) => {
  try {
    let calculatedUpfrontInterest = 0;
    let sanctionAmount = data.sanction_amount ? data.sanction_amount * 1 : 0;
    let loanIntRate = data.loan_int_rate ? data.loan_int_rate * 1 : 0;
    let repaymentType = data.repayment_type ? data.repayment_type : req.product.repayment_type;
    let tenure = data.tenure ? data.tenure : req.product.loan_tenure;
    let emiCount = data.emi_count ? data.emi_count * 1 : 0;

    // Calculate upfront interest
    if (repaymentType.toLowerCase() === 'monthly' && emiCount) {
      calculatedUpfrontInterest = (sanctionAmount * loanIntRate * emiCount) / (100 * 12);
    } else if (repaymentType.toLowerCase() === 'weekly' && emiCount) {
      calculatedUpfrontInterest = (sanctionAmount * loanIntRate * emiCount) / (100 * 52);
    } else if (repaymentType.toLowerCase() === 'daily' && emiCount) {
      calculatedUpfrontInterest = (sanctionAmount * loanIntRate * emiCount) / (100 * 365);
    } else if (repaymentType.toLowerCase() === 'bullet' && tenure && !req.product.allow_loc) {
      calculatedUpfrontInterest = (sanctionAmount * loanIntRate * tenure) / (100 * 365);
    } else {
      calculatedUpfrontInterest = (sanctionAmount * loanIntRate * emiCount) / 100;
    }
    calculatedUpfrontInterest = Math.round((calculatedUpfrontInterest * 1 + Number.EPSILON) * 100) / 100;

    // validate calculatedUpfrontInterest with upfront_interest passed in payload
    if (Number(data.upfront_interest) !== Number(calculatedUpfrontInterest))
      throw {
        success: false,
        message: `upfront_interest is not correct, it should be ${calculatedUpfrontInterest}`,
      };
    return { success: true, upfront_interest: calculatedUpfrontInterest };
  } catch (error) {
    return error;
  }
};

const calculateEligibleLoanAmount = (data) => {
  try {
    const emiFreqency = EMI_frequncy_master[data?.repayment_type.toLowerCase()];
    let calculatedEligibleLoanAmount = 0;
    let programType = data.program_type;

    let EligibleLoanAmount = 0;
    let partnerCustCategory = data.partner_customer_category;
    let loanIntRate = data.loan_int_rate ? data.loan_int_rate : req.product.int_value;
    let tenure = data.tenure ? data.tenure : req.product.loan_tenure;
    let i = loanIntRate / (emiFreqency * 100);
    let emiAllowed = 0;

    if (programType === 'Transactions' || partnerCustCategory === 'GST') {
      let txnAvg = Number(data.txn_1 * 1 + data.txn_2 * 1 + data.txn_3 * 1 + data.txn_4 * 1 + data.txn_5 * 1 + data.txn_6 * 1) / 6;
      calculatedEligibleLoanAmount = txnAvg * 3;
    } else if (programType === 'Banking' || partnerCustCategory === 'Bank') {
      let abb = data.abb;
      let emiAmount = Number(abb) / 1.2;
      emiAllowed = emiAmount;
      EligibleLoanAmount = emiAmount * ((1 - 1 / Math.pow(1 + i, tenure)) / i);
      calculatedEligibleLoanAmount = Math.min(EligibleLoanAmount * 1, 5000000);
    } else if (programType === 'Income' && data.customer_type_ntc === 'No') {
      let monthlyIncome = data.monthly_income;
      let maxFoirNTC = 0.5;
      let maxFixedObligationNTC = Number(maxFoirNTC * monthlyIncome);
      let EMINNTC = maxFixedObligationNTC;
      emiAllowed = EMINNTC;
      calculatedEligibleLoanAmount = EMINNTC * ((1 - 1 / Math.pow(1 + i, tenure)) / i);
    } else if (programType === 'Income' && data.customer_type_ntc === 'Yes') {
      let emiObligation = data.emi_obligation;
      let monthlyIncome = data.monthly_income;
      let maxFoirETC = 0.75;
      let maxFixedObligationETC = Number(maxFoirETC * monthlyIncome);
      let EMIETC = maxFixedObligationETC - emiObligation;
      emiAllowed = EMIETC;
      calculatedEligibleLoanAmount = EMIETC * ((1 - 1 / Math.pow(1 + i, tenure)) / i);
    }

    calculatedEligibleLoanAmount = Math.round(((calculatedEligibleLoanAmount * 1 + Number.EPSILON) * 100) / 100);
    emiAllowed = Math.round(((emiAllowed * 1 + Number.EPSILON) * 100) / 100);

    return {
      success: true,
      eligible_loan_amount: isNaN(calculatedEligibleLoanAmount) ? data.eligible_loan_amount : calculatedEligibleLoanAmount,
      emi_allowed: emiAllowed,
    };
  } catch (error) {
    console.log('error', error);
    return error;
  }
};

const calculateGSTOnPF = async (data, product) => {
  try {
    const processingFees = Number(data.processing_fees_amt) >= 0 ? Number(data.processing_fees_amt) : product.processing_fees.indexOf('A') > -1 ? product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1 : product.processing_fees.indexOf('P') > -1 ? ((product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) * Number(data.sanction_amount) : 0;
    let gstPercentage = 0;
    // check which gst is applicable state+central or igst
    gstPercentage = data.state.toUpperCase() === 'HARYANA' ? product.cgst_on_pf_perc * 1 + product.sgst_on_pf_perc * 1 : product.igst_on_pf_perc;

    // Calculate GST amount with PF amount and GST % config in product
    let calculatedGstAmt = (gstPercentage / 100) * processingFees;
    calculatedGstAmt = Math.round((calculatedGstAmt + Number.EPSILON) * 100) / 100;
    //Calculate cgst,sgst and igst as per product configurations
    let calculatedCgst = Number(calculatedGstAmt / 2);
    let calculatedSgst = Number(calculatedGstAmt / 2);
    let calculatedIgst = Number(calculatedGstAmt);
    if (data.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
      calculatedCgst = Math.round((calculatedCgst + Number.EPSILON) * 100) / 100;
      calculatedSgst = Math.round((calculatedSgst + Number.EPSILON) * 100) / 100;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
      calculatedIgst = Math.round((calculatedIgst + Number.EPSILON) * 100) / 100;
    }
    return {
      success: true,
      calculatedGstAmt,
      calculatedCgst,
      calculatedSgst,
      calculatedIgst,
    };
  } catch (error) {
    return error;
  }
};

const calculateNetDisbursementAmountForMsme = (brokenInterest, gstAmount, data, product) => {
  try {
    let netDisbursementAmount = 0;
    let processingFees = data.processing_fees_amt ? data.processing_fees_amt * 1 : 0;
    let convFees = data.conv_fees ? Number(data.conv_fees) : 0;
    let applicationCharges = data.application_fees ? Number(data.application_fees) : 0;
    let insuranceAmount = data.insurance_amount ? Number(data.insurance_amount) : 0;

    //calculate net disbursement amount
    netDisbursementAmount = data.sanction_amount * 1 - (processingFees + brokenInterest * 1 + gstAmount * 1 + convFees + applicationCharges + insuranceAmount);

    netDisbursementAmount = Math.round((netDisbursementAmount + Number.EPSILON) * 100) / 100;

    return {
      success: true,
      netDisbursementAmount,
    };
  } catch (error) {
    return error;
  }
};

module.exports = {
  calculateUpfrontCharges,
  checkWalletBalance,
  calculateGST,
  calculateBrokenInterest,
  calculateNetDisbursementAmount,
  generateRepaySch,
  generateRepayDatesAmnts,
  calculateSubventionFeesExcGST,
  calculateGSTOnConvFees,
  calculateGSTOnApplicationFees,
  calculateGSTOnCharges,
  calculateNetDisbursementAmountForMsme,
  calculateGSTOnPF,
  calculateUpfrontInterest,
  getEndDateByRepaymentType,
  getVal,
  calculateEligibleLoanAmount,
  calculateGSTOnApplicationFeesForMSME
};

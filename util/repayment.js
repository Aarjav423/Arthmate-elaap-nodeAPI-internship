'use strict';
const moment = require('moment');
const s3helper = require('./s3helper.js');
const RepaymentScheduleSchema = require('../models/repayment-schedule-dump-schema.js');
const RepaymentInstallment = require('../models/repayment-installment-schema');
const LoanStateSchema = require('../models/loan-state-schema');

const calcTotalChargesAndDisbAmnt = (data, schema) => {
  const {
    proc_fees,
    flexible_int_rate,
    intrest_rate,
    dpd_rate,
    dpd_amount_per_day,
  } = schema;
  const {
    sanction_amount,
    insurance_amt,
    app_charges,
    stamp_charges,
    disburse_date,
    int_rate_annum,
    first_inst_date,
    repayment_type,
  } = data;
  // check if flexible int rate is checked and calculate interest amount
  const intAmount =
    flexible_int_rate === 1
      ? parseInt(sanction_amount) * (parseInt(intrest_rate) / 100)
      : parseInt(sanction_amount) * (parseInt(int_rate_annum) / 100);
  const intPerDay = intAmount / 365;
  const daysBeforeFirstEmi = getDaysForPreEmiCalc(
    disburse_date,
    first_inst_date,
  );
  const preEmiInt = Math.round(
    calcPreEmiInt(disburse_date, intPerDay, daysBeforeFirstEmi, repayment_type),
  );
  const gst = Math.round(parseInt(proc_fees) * 0.18);
  const totalCharges = (
    parseInt(preEmiInt) +
    parseInt(gst) +
    parseInt(proc_fees) +
    parseInt(app_charges) +
    parseInt(stamp_charges) +
    parseInt(insurance_amt)
  ).toFixed(0);
  const disbAmnt = (parseInt(sanction_amount) - totalCharges).toFixed(0);
  return {
    intAmount,
    intPerDay,
    daysBeforeFirstEmi,
    preEmiInt,
    gst,
    proc_fees,
    app_charges,
    insurance_amt,
    totalCharges,
    disbAmnt,
    dpd_rate,
    dpd_amount_per_day,
  };
};

const getDaysForPreEmiCalc = (disburse_date, first_inst_date) => {
  const disbur_date = moment(disburse_date, 'YYYY-MM-DD');
  const pre_emi_till_date = moment(first_inst_date, 'YYYY-MM-DD');
  return pre_emi_till_date.diff(disbur_date, 'days');
};

const calcPreEmiInt = (disburse_date, int, days, type) => {
  const date = moment(disburse_date).date(15);
  switch (type) {
    case 'daily':
      return days > 0 ? int * days : 0;
    case 'weekly':
      return days > 6 ? int * (days - 6) : 0;
    case 'monthly':
      return moment(disburse_date).isAfter(date) && (days > 29 || days >= 27)
        ? int * (days - 29)
        : 0;
    default:
      break;
  }
};

const calcEmi = (disburAmt, intRate, loanTenure, type) => {
  switch (type) {
    case 'daily':
      try {
        let interest = intRate / 1200;
        let term = loanTenure / 30.416;
        let top = Math.pow(1 + interest, term);
        let bottom = top - 1;
        let ratio = top / bottom;
        const EMI = disburAmt * interest * ratio;
        const total = EMI * term;
        return EMI;
      } catch (err) {
        console.log(err);
      }
      break;
    case 'weekly':
      try {
        let interest = intRate / 1200;
        let term = loanTenure;
        let top = Math.pow(1 + interest, term);
        let bottom = top - 1;
        let ratio = top / bottom;
        const EMI = disburAmt * interest * ratio;
        const total = EMI * term;
        return EMI;
      } catch (err) {
        console.log(err);
      }
      break;
    case 'monthly':
      try {
        let int = intRate / 1200;
        let term = loanTenure;
        const EMI = (disburAmt * int) / (1 - Math.pow(1 / (1 + int), term));
        const total = EMI * term;
        return EMI;
      } catch (err) {
        console.log(err);
      }
      break;
    default:
      break;
  }
};

const storeRepaymentSchedule = async (req, data, repaymentSchedule) => {
  try {
    const repaymentScheduleToUpload = {
      source: 'custom',
      loan_id: data.loan_id,
      company_id: req.company._id,
      product_id: req.product._id,
      repayment_schedule_json: repaymentSchedule,
    };

    //Check Repayment Schedule Already Exist
    const repayScheduleAlreadyExist =
      await RepaymentScheduleSchema.findOneByLoanId(data.loan_id);
    let recordRepaymentSchedule = {};
    // Record data in repayment_schedule_dump schema
    if (!repayScheduleAlreadyExist) {
      recordRepaymentSchedule = await RepaymentScheduleSchema.addNew(
        repaymentScheduleToUpload,
      );
      if (!recordRepaymentSchedule)
        throw {
          success: false,
          message: 'Error while adding repayment schedule',
        };
    }
    if (repayScheduleAlreadyExist) {
      //Check if repayment_installments already exist by repay_schedule_id
      const repaymentInstallmentAlreadyExist =
        await RepaymentInstallment.findByRepayScheduleId(
          repayScheduleAlreadyExist._id,
        );

      // If already exist then delete existing record and add newly passed data
      if (repaymentInstallmentAlreadyExist) {
        const deleteRepaymentInstallment =
          await RepaymentInstallment.deleteByRepayScheduleId(
            repayScheduleAlreadyExist._id,
          );
        if (!deleteRepaymentInstallment)
          throw {
            success: false,
            message:
              'Error while deleting previous repayment installment data.',
          };
      }
    }
    //Prepare data to add in repaymwnt installment table
    const repaymentInstallmentData = repaymentSchedule?.map((record) => {
      return {
        ...record,
        company_id: req.company._id,
        product_id: req.product._id,
        loan_id: data?.loan_id,
        repay_schedule_id: recordRepaymentSchedule._id
          ? recordRepaymentSchedule._id
          : repayScheduleAlreadyExist
          ? repayScheduleAlreadyExist._id
          : '',
      };
    });
    let prin_os = 0;
    let int_os = 0;
    repaymentInstallmentData.forEach((item) => {
      prin_os += parseFloat(item.prin);
      int_os += parseFloat(item.int_amount);
    });
    const loanStateData = {
      company_id: req.company._id,
      product_id: req.product._id,
      loan_id: data?.loan_id,
      prin_os: Math.round((prin_os * 1 + Number.EPSILON) * 100) / 100,
      int_os: Math.round((int_os * 1 + Number.EPSILON) * 100) / 100,
    };

    const loanStateCondition = {
      company_id: req.company._id,
      product_id: req.product._id,
      loan_id: data?.loan_id,
    };
    const loanStateExist =
      await LoanStateSchema.findByCondition(loanStateCondition);
    if (loanStateExist) {
      prin_os = Math.round((prin_os * 1 + Number.EPSILON) * 100) / 100;
      int_os = Math.round((int_os * 1 + Number.EPSILON) * 100) / 100;
      const updateLoanState = await LoanStateSchema.updateLoanstate(
        loanStateCondition,
        { prin_os, int_os },
      );
      if (!updateLoanState)
        throw {
          success: false,
          message: 'Error while updating loan state data.',
        };
    } else {
      const recordRepayScheduleSum =
        await LoanStateSchema.addNew(loanStateData);
      if (!recordRepayScheduleSum)
        throw {
          success: false,
          message: 'Error while recording repayment schedule outstanding data',
        };
    }
    const addRepaymentInstallment = await RepaymentInstallment.addInBulk(
      repaymentInstallmentData,
    );
    if (addRepaymentInstallment) {
      return true;
    }
    return false;
  } catch (error) {
    return error;
  }
};

const recordLoanState = async (req, data, repaymentInstallmentData) => {
  try {
    let prin_os = 0;
    let int_os = 0;
    repaymentInstallmentData.forEach((item) => {
      prin_os += parseFloat(item.prin);
      int_os += parseFloat(item.int_amount);
    });
    const loanStateData = {
      company_id: req.company._id,
      product_id: req.product._id,
      loan_id: data?.loan_id,
      prin_os: Math.round((prin_os * 1 + Number.EPSILON) * 100) / 100,
      int_os: Math.round((int_os * 1 + Number.EPSILON) * 100) / 100,
    };
    const loanStateCondition = {
      company_id: req.company._id,
      product_id: req.product._id,
      loan_id: data?.loan_id,
    };
    const loanStateExist =
      await LoanStateSchema.findByCondition(loanStateCondition);
    if (loanStateExist) {
      const updateLoanState = await LoanStateSchema.updateLoanstate(
        loanStateCondition,
        { prin_os, int_os },
      );
      if (!updateLoanState)
        throw {
          success: false,
          message: 'Error while updating loan state data.',
        };
    } else {
      const recordRepayScheduleSum =
        await LoanStateSchema.addNew(loanStateData);
      if (!recordRepayScheduleSum)
        throw {
          success: false,
          message: 'Error while recording repayment schedule outstanding data',
        };
    }
    return { success: true };
  } catch (error) {
    return error;
  }
};

module.exports = {
  calcTotalChargesAndDisbAmnt,
  storeRepaymentSchedule,
  recordLoanState,
};

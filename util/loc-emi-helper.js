const moment = require('moment');
const calculation = require('./calculation');
const Product = require('../models/product-schema.js');
const LOCRepaymentInstSchema = require('../models/loc-repayment-installment-schema.js');
const RepaymentScheduleSchema = require('../models/repayment-schedule-dump-schema.js');
const customLoanId = require('../util/customLoanIdHelper.js');

const EMI_frequncy_master = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  bullet: 1,
};

const generateEmi = async (req, res, next) => {
  try {
    if (req.body.no_of_emi) {
      const emiFreq =
        EMI_frequncy_master[req.loanData?.repayment_type.toLowerCase()];
      const emiCount = req.body.no_of_emi ? req.body.no_of_emi * 1 : 0;
      if (!req.loanData.repayment_type) {
        return {
          success: false,
          message: 'repayment_type is required',
        };
      }
      const intr_rate = req.loanData.loan_int_rate
        ? Number(req.loanData.loan_int_rate)
        : String(req.product.int_value).replace(/[a-zA-Z]+/g, '') * 1;

      // Total principal
      const principal = req.body.drawdown_amount
        ? req.body.drawdown_amount * 1
        : 0;
      //Calculate total interest
      let calculatedInterest =
        (principal * 1 * (emiCount / emiFreq) * (intr_rate * 1)) / 100;
      if (emiFreq === 1 && emiCount > 1) {
        calculatedInterest = calculatedInterest / 12;
      }
      if (req.product.interest_type.toLowerCase() === 'upfront') {
        calculatedInterest = 0;
      }
      // Calculate monthly emi_amount
      const monthly = (principal + calculatedInterest) / emiCount;
      // Get installment amount
      const emi_amount = monthly * 1;
      const total_repayment =
        Math.round((monthly * 1 * emiCount + Number.EPSILON) * 100) / 100;
      let repaymentSchData = {
        repayment_type: req.loanData?.repayment_type.toLowerCase(),
        total_repayment: total_repayment * 1,
        total_interest: calculatedInterest * 1,
        first_inst_date: req.body.drawadown_request_date,
        emi_amount: emi_amount,
        emi_count: emiCount,
      };
      const emiGenerated = await generateEmiInstallments(req, repaymentSchData);
      req.emiGenerated = emiGenerated;
    }
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const generateEmiInstallments = async (req, data) => {
  try {
    let schedules = [];
    let repayment_balance = data.total_repayment - data.total_interest;
    let emi_date = moment(data.first_inst_date);
    //generate sub loan id
    const customCode = req.company.custom_code
      ? req.company.custom_code
      : 'UND';
    const generatedLoanKey = req.product.loan_key
      ? req.product.loan_key
      : customLoanId.generateRandomString(
          3,
          '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        );
    const loanKey = generatedLoanKey.toUpperCase();
    const generatedLoanId = await customLoanId.generatedLoanId(
      customCode,
      loanKey,
      data,
    );
    for (var i = 0; i < data.emi_count; i++) {
      data.id = i + 1;
      const emi_amount = data.emi_amount * 1;
      const int_amount = (data.total_interest * 1) / (data.emi_count * 1);
      let prin = emi_amount * 1 - int_amount * 1;
      if (i == data.emi_count - 1) prin += repayment_balance - prin;
      repayment_balance = repayment_balance * 1 - prin * 1;
      data.repayment_type.toLowerCase() === 'weekly'
        ? emi_date.add(1, 'W')
        : data.repayment_type.toLowerCase() === 'monthly'
        ? emi_date.add(1, 'M')
        : data.repayment_type.toLowerCase() === 'quarterly'
        ? emi_date.add(3, 'M')
        : emi_date.add(1, 'M');
      let installment = {
        loan_id: req.body.loan_id,
        sub_loan_id: `SUB-${generatedLoanId}`,
        company_id: req.company._id,
        product_id: req.product._id,
        emi_no: data.id,
        due_date: moment(emi_date).format('YYYY-MM-DD'),
        emi_amount:
          Math.round((data.emi_amount * 1 + Number.EPSILON) * 100) / 100,
        prin:
          Math.round((emi_amount * 1 - int_amount * 1 + Number.EPSILON) * 100) /
          100,
        int_amount: Math.round((int_amount * 1 + Number.EPSILON) * 100) / 100,
        principal_bal:
          Math.round((repayment_balance * 1 + Number.EPSILON) * 100) / 100,
        status:
          data.advance_emi && Number(data.advance_emi) > i ? 'PAID' : 'OPEN',
        principal_outstanding:
          Math.round(
            (prin + Number(repayment_balance * 1) + Number.EPSILON) * 100,
          ) / 100,
        created_at: moment().format('YYYY-MM-DD'),
        created_by:
          req.authData.type == 'api' ? req.company.name : req.user.username,
      };
      schedules.push(installment);
    }
    return schedules;
  } catch (err) {
    return err;
  }
};

const recordEmi = async (req, res, next) => {
  try {
    if (req.body.no_of_emi) {
      const repaymentScheduleToUpload = {
        source: 'loc',
        loan_id: req.body.loan_id,
        company_id: req.company._id,
        product_id: req.product._id,
      };
      const recordRepaymentSchedule = await RepaymentScheduleSchema.addNew(
        repaymentScheduleToUpload,
      );
      if (!recordRepaymentSchedule)
        throw {
          success: false,
          message: 'Error while recording repayment schedule data.',
        };
      const repaymentInstallmentData = req.emiGenerated?.map((record) => {
        return {
          ...record,
          repay_schedule_id: recordRepaymentSchedule?._id,
          usage_id: req.drawdownRecord?._id,
        };
      });

      let prin_os = 0;
      let int_os = 0;
      repaymentInstallmentData.forEach((item) => {
        prin_os += item.prin * 1;
        int_os += item.int_amount * 1;
      });
      req.prin_os = Math.round((prin_os * 1 + Number.EPSILON) * 100) / 100;
      req.int_os = Math.round((int_os * 1 + Number.EPSILON) * 100) / 100;

      const addRepaymentInstallment = await LOCRepaymentInstSchema.addInBulk(
        repaymentInstallmentData,
      );
      if (!addRepaymentInstallment)
        throw { success: false, message: 'Error while adding loc emi data' };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
module.exports = {
  generateEmi,
  recordEmi,
};

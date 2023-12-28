const RepaymentInstallment = require('../models/repayment-installment-schema.js');
const LoanStates = require('../models/loan-state-schema.js');
const ChargesSchema = require('../models/charges-schema.js');
const moment = require('moment');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const { check, validationResult } = require('express-validator');
const ForceCloseRequest = require('../models/foreclosure-offers-schema.js');
const BICSchema = require('../models/borrowerinfo-common-schema.js');


const forceCloseCalculations = async (req, res, next) => {
  try {
    const { loan_id } = req.params;
    const loanData = req.loanData;
    const currentDate = moment().endOf('day').format('YYYY-MM-DD');

    const loanStateData = await LoanStates.findByLID(loan_id);
    if (!loanStateData || loanData.status.toLowerCase() !== 'disbursed') {
      throw {
        success: false,
        message: `Force Close of this Loan's ${loan_id} is not available as the loan status is ${loanData.status}`,
      };
    }

    const previousInstallments = await RepaymentInstallment.getPreviousRepaymentsOnLoanId({
      loan_id: loanData.loan_id,
      to_date: currentDate,
    });
    const previousInstallmentDate = previousInstallments.length ? moment(previousInstallments[0].due_date).format('YYYY-MM-DD') : '';

    const customer_name = `${loanData.first_name || ''} ${loanData.last_name || ''}`;
    const requestor_id = req?.authData?.type === 'api' ? req?.company?.name : req?.user?.email;
    const current_lpi_due = loanStateData.current_lpi_due || 0;

    const query = {
      loan_id: loan_id,
      label: 'repayment',
      is_received: 'Y',
      $or: [{ processed: 'null' }, { processed: null }],
    };
    const transactionLedger = await LoanTransactionLedgerSchema.findAllWithCondition(query);
    let loanTransactionAmount = 0;
    transactionLedger.forEach(transaction => {
      loanTransactionAmount += parseFloat(transaction.txn_amount);
    });

    const paymentLedger = loanStateData;
    const excessPaymentLedger = paymentLedger?.excess_payment_ledger?.txn_amount ? parseFloat(paymentLedger.excess_payment_ledger.txn_amount) : 0;
    const totalExcessAmount = loanTransactionAmount + excessPaymentLedger;
    const current_int_due = loanStateData.current_int_due
      ? loanStateData.current_int_due
      : 0;

    const current_prin_due = loanStateData.current_prin_due || 0;
    const prinOs = parseFloat(loanStateData.prin_os);
    //interest rate
    let interestRate = parseFloat(loanData.loan_int_rate)
      ? parseFloat(loanData.loan_int_rate)
      : 0;

    const charge_query = {
      loan_id: loan_id,
      charge_id: 1,
      $or: [
        { is_processed: 'null' },
        { is_processed: null },
        { is_processed: '' },
      ],
    };
    const charges = (await ChargesSchema.findbyCondition(charge_query)) || [];
    let charge_amount = 0, total_amount_waived = 0, total_amount_paid = 0, total_gst_reversed = 0, total_gst_paid = 0, gst = 0;

    charges.forEach(temp => {
      charge_amount += temp.charge_amount;
      total_amount_waived += temp.total_amount_waived;
      total_amount_paid += temp.total_amount_paid;
      total_gst_reversed += temp.total_gst_reversed;
      total_gst_paid += temp.total_gst_paid;
      gst += temp.gst;
    });

    let bounceCharges = charge_amount - total_amount_waived - total_amount_paid;
    let lpiDue = parseFloat(current_lpi_due);
    let previousInstallment_date = previousInstallmentDate || '';
    const unDuePrinciple = prinOs - current_prin_due;

    let intDue, int_on_termination = 0;

    if (previousInstallment_date) {
      intDue = parseFloat(current_int_due) + (unDuePrinciple * interestRate * moment(currentDate).diff(moment(previousInstallment_date), 'days')) / 36500;
      int_on_termination = (unDuePrinciple * interestRate * moment(currentDate).diff(moment(previousInstallment_date), 'days')) / 36500;
    } else {
      intDue = parseFloat(current_int_due) + (unDuePrinciple * interestRate * moment(currentDate).diff(moment(loanData.disbursement_date_time, 'YYYY-MM-DD HH:mm:ss'), 'days')) / 36500;
      int_on_termination = (unDuePrinciple * interestRate * moment(currentDate).diff(moment(loanData.disbursement_date_time, 'YYYY-MM-DD HH:mm:ss'), 'days')) / 36500;
    }

    let obj = {
      prin_os: prinOs,
      charges_due: Math.round((bounceCharges + Number.EPSILON) * 100) / 100,
      int_due: Math.round((intDue + Number.EPSILON) * 100) / 100,
      lpi_due: Math.round((lpiDue + Number.EPSILON) * 100) / 100,
      gst: Math.round((gst + Number.EPSILON) * 100) / 100,
      total_due: Math.round(((Number(bounceCharges) + Number(intDue) + Number(lpiDue) + Number(prinOs) + Number(gst))  + Number.EPSILON) * 100) / 100,
      total_amount_excess: Math.round((totalExcessAmount + Number.EPSILON) * 100) / 100,
      int_on_termination: Math.round((int_on_termination + Number.EPSILON) * 100) / 100,
    };
    req.forceCloseData = obj;
    next();

  } catch (error) {
    return res.status(400).send({
      success: false,
      message: 'Error during calculations',
    });
  }

};

const forceCloseExist = async(req, res, next) => {
  try {
    //check if is force_close flag true in bic table
    const loanData = await BICSchema.findByCondition({ loan_id: req.params.loan_id });
    if (loanData && loanData?.is_force_closed) throw new Error('Loan is already force closed.');
    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error?.message || 'Error during loan check',
    });
  }
}
module.exports = {
  forceCloseCalculations,
  forceCloseExist
};

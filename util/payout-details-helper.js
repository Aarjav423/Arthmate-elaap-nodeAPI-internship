const moment = require('moment');
const { refundType, tdsStatus } = require('../utils/constant');
const payoutDetail = require('../models/payout-detail-schema');
const Product = require('../models/product-schema');

const createInterestRefundTL = async (loan, product, requestedBy) => {
  try {
    const refund = await calculateInterestRefundAmtTL(loan, product);
    if (refund) {
      return await createInterestRefundPayoutRecord(loan, refund, requestedBy);
    } else {
      return;
    }
  } catch (error) {
    throw {
      success: false,
      message: error?.message || "Error creating interest refund",
    }
  }
}

const calculateInterestRefundAmtTL = async (loan, product) => {
  if (product?.allow_loc || product?.allow_loc !== 1) {
    if (!loan) {
      throw {
        success: false,
        message: "Loan not found for calculating interest refund",
      }
    }

    const disbDateTime = moment(loan.disbursement_date_time, "YYYY-MM-DD HH:mm:ss")?.startOf('day');
    const firstInstDate = moment(loan.first_inst_date)?.startOf('day');
    const dateDiffDisbAndFirstInst = firstInstDate.diff(disbDateTime, 'days');

    // if date component are same then even 
    // if date diff is 31, 30, 29, 28 it won't calculate refund
    if ((disbDateTime?.date() === firstInstDate?.date()) && dateDiffDisbAndFirstInst <= 31) {
      return;
    }

    const roi = (loan.loan_int_rate ?? product.int_value?.replace(/[a-zA-Z]+/g, '')) * 1;
    let noOfRefundDays = 0;
    let isBrokenInterest = false;

    if (dateDiffDisbAndFirstInst < 30) {
      noOfRefundDays = 30 - dateDiffDisbAndFirstInst;

    } else if (dateDiffDisbAndFirstInst > 30) {
      if (product.calculate_broken_interest) {
        const finalApproveDate = moment(loan.final_approve_date)?.startOf('day');
        noOfRefundDays = disbDateTime.diff(finalApproveDate, 'days');
        isBrokenInterest = true;
      } else {
        return;
      }
    } else {
      return;
    }

    const interestRefundAmt = (loan.sanction_amount * roi * noOfRefundDays) / 36500;
    return {
      refund_amount: Math.round((interestRefundAmt + Number.EPSILON) * 100) / 100,
      refund_days: noOfRefundDays,
      is_broken_interest: isBrokenInterest,
    }
  }
}

const createInterestRefundPayoutRecord = async (loan, refund, requestedBy) => {
  const data = {
    company_id: loan.company_id,
    product_id: loan.product_id,
    loan_app_id: loan.loan_app_id,
    loan_id: loan.loan_id,
    partner_loan_id: loan.partner_loan_id,
    borrower_id: loan.borrower_id,
    partner_borrower_id: loan.partner_borrower_id,
    type: refundType.INTEREST_REFUND,
    amount: refund?.refund_amount,
    refund_days: refund?.refund_days,
    status: refund?.refund_status || tdsStatus.Open,
    disbursement_date_time: moment(loan.disbursement_date_time, "YYYY-MM-DD HH:mm:ss"),
    loan_app_date: moment(loan.loan_app_date, "YYYY-MM-DD"),
    final_approve_date: loan.final_approve_date,
    first_inst_date: loan.first_inst_date,
    is_broken_interest: refund?.is_broken_interest ?? false,
    requested_by: requestedBy,
  }
  const result = await payoutDetail.create(data);
  return { ...result, ...data };
}

const getInterestRefundPayoutDetails = async (loan, requestedBy) => {
  let payoutDetails = await payoutDetail.findOneByQuery({
    loan_id: loan?.loan_id,
    type: refundType.INTEREST_REFUND,
  });
  if (!payoutDetails) {
    
    const product = await Product.findById(loan?.product_id);
    if (!product) {
      throw {
        success: false,
        message: "Product doesn't exist for the provided data.",
      }
    }

    // get data from bic if available and create payout details
    if ((loan.int_refund_days !== undefined && loan.int_refund_days !== null)
      && (loan.int_refund_amount !== undefined && loan.int_refund_amount !== null)
      && (loan.int_refund_status !== undefined && loan.int_refund_status !== null)) {
      const refundCalc = await calculateInterestRefundAmtTL(loan, product);
      const refund = {
        refund_amount: loan.int_refund_amount,
        refund_days: loan.int_refund_days,
        refund_status: loan.int_refund_status === "Initiated"
          ? "In_Progress"
          : loan.int_refund_status === "NotInitiated"
            ? "Open"
            : loan.int_refund_status,
        is_broken_interest: refundCalc?.is_broken_interest,
      };
      payoutDetails = await createInterestRefundPayoutRecord(loan, refund, loan.int_refund_triggered_by);
    } else {
      // else calculate and create payout details
      payoutDetails = await createInterestRefundTL(loan, product, requestedBy);
    }
  }
  return payoutDetails;
}

module.exports = {
  createInterestRefundTL,
  calculateInterestRefundAmtTL,
  createInterestRefundPayoutRecord,
  getInterestRefundPayoutDetails,
};
const { check, validationResult } = require('express-validator');
const calculation = require('../util/calculation');
const insuranceHelper = require('../util/insurance-policy-helper.js');
const repayment = require('../util/repayment');

const validateRecalibratePayload = async (req) => {
  try {
    //Validate loan status is not disbursal_approved
    if (req.loanData.stage >= 3)
      throw {
        success: false,
        message: `Loan is already in ${req.loanData.status} status, changes not allowed.`,
      };
    //Validate either sanction_amount or tenure is mandatory.
    if (!req.body.sanction_amount && !req.body.tenure)
      throw {
        success: false,
        message:
          'Either sanction amount or tenure is mandatory to process the request',
      };

    //Validate sanction_amount should be less than sanction_amount already present in loan
    if (Number(req.body.sanction_amount) > Number(req.loanData.sanction_amount))
      throw {
        success: false,
        message: 'Loan amount requested is higher than approved amount.',
      };

    //Validate the tenure with the tenure configured in product
    if (Number(req.body.tenure) > Number(req.product.loan_tenure))
      throw { success: false, message: 'Incorrect tenure requested.' };
    //Validate net_disbur_amt should not be 0 or less tan 0.
    if (Number(req.body.net_disbur_amt) <= 0)
      throw {
        success: false,
        message: 'net_disbur_amt amount should be greater than 0.',
      };
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processGstOnPfAmount = async (req, res) => {
  try {
    const gstCalculation = await calculation.calculateGST(
      req.lmsPostData,
      req.product,
    );
    if (!gstCalculation.success) {
      throw {
        ...gstCalculation,
      };
    }
    req.lmsPostData.cgst_amount = gstCalculation.calculatedCgst;
    req.lmsPostData.sgst_amount = gstCalculation?.calculatedSgst;
    req.lmsPostData.igst_amount = gstCalculation?.calculatedIgst;
    req.lmsPostData.gst_on_pf_amt = gstCalculation?.calculatedGstAmt;
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processBrokenInterest = async (req) => {
  try {
    let brokenInterest = 0;
    if (
      req.product.calculate_broken_interest &&
      req.company.lms_version === 'origin_lms'
    ) {
      brokenInterestResp = await calculation.calculateBrokenInterest(
        req.body,
        req.product,
      );
      if (!brokenInterestResp.success) {
        throw {
          ...brokenInterestResp,
        };
      }
      brokenInterest = brokenInterestResp.brokenInterestAmount
        ? brokenInterestResp.brokenInterestAmount
        : 0;
    }
    req.lmsPostData.broken_interest = brokenInterest;
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processNetDisbAmount = async (req) => {
  try {
    const netDisbursementAmount =
      await calculation.calculateNetDisbursementAmount(
        req.lmsPostData.broken_interest,
        req.lmsPostData.gst_on_pf_amt,
        req.lmsPostData,
        req.product,
      );
    if (!netDisbursementAmount.success) {
      throw {
        ...netDisbursementAmount,
      };
    }
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processSubventionFees = async (req) => {
  try {
    subventionFeesExclGST = await calculation.calculateSubventionFeesExcGST(
      req.lmsPostData,
      req.product,
    );
    req.lmsPostData.subvention_fees_amount =
      subventionFeesExclGST?.subventionFeesExcludingGst;
    req.lmsPostData.gst_on_subvention_fees =
      subventionFeesExclGST?.gstOnSubventionFees;
    req.lmsPostData.cgst_on_subvention_fees =
      subventionFeesExclGST?.cgstOnSubventionFees;
    req.lmsPostData.sgst_on_subvention_fees =
      subventionFeesExclGST?.sgstOnSubventionFees;
    req.lmsPostData.igst_on_subvention_fees =
      subventionFeesExclGST?.igstOnSubventionFees;
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processUpfrontInterest = async (req) => {
  try {
    if (!req.product.allow_loc && req.product.interest_type === 'upfront') {
      upfrontInterest = await calculation.calculateUpfrontInterest(
        req,
        req.body,
      );
      if (!upfrontInterest.success) throw upfrontInterest;
    }
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processConvenienceFees = async (req) => {
  try {
    gstOnConvFees = await calculation.calculateGSTOnConvFees(
      req.lmsPostData,
      req.lmsPostData,
      req.product,
    );
    req.lmsPostData.gst_on_conv_fees = gstOnConvFees.calculatedGstAmt;
    req.lmsPostData.conv_fees_excluding_gst =
      gstOnConvFees.convFeesExcludingGst;
    req.lmsPostData.cgst_on_conv_fees = gstOnConvFees.calculatedCgst;
    req.lmsPostData.sgst_on_conv_fees = gstOnConvFees.calculatedSgst;
    req.lmsPostData.igst_on_conv_fees = gstOnConvFees.calculatedIgst;
    return { success: true };
  } catch (error) {
    return error;
  }
};

const processApplicationFees = async (req) => {
  try {
    gstOnApplicationFees = await calculation.calculateGSTOnApplicationFees(
      req.lmsPostData,
      req.lmsPostData,
      req.product,
    );
    //record gst on application_fees
    req.lmsPostData.gst_on_application_fees =
      gstOnApplicationFees.calculatedGstAmt;
    req.lmsPostData.application_fees_excluding_gst =
      gstOnApplicationFees.applFeesExcludingGst;
    req.lmsPostData.cgst_on_application_fees =
      gstOnApplicationFees.calculatedCgst;
    req.lmsPostData.sgst_on_application_fees =
      gstOnApplicationFees.calculatedSgst;
    req.lmsPostData.igst_on_application_fees =
      gstOnApplicationFees.calculatedIgst;
    return { success: true };
  } catch (error) {
    return error;
  }
};

module.exports = {
  validateRecalibratePayload,
  processGstOnPfAmount,
  processNetDisbAmount,
  processSubventionFees,
  processUpfrontInterest,
  processConvenienceFees,
  processApplicationFees,
  processBrokenInterest,
};

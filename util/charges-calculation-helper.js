const LoanRequestSchema = require('../models/loan-request-schema');
const { getEPSILON } = require('./math-ops');

const calculateProcessingFeesUpdateLimit = (req, limit_amount, loanData) => {
  try {
    let processingFeesAmt =
      req.product.processing_fees.indexOf('A') > -1
        ? req.product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1
        : req.product.processing_fees.indexOf('P') > -1
        ? ((req.product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
          Number(limit_amount)
        : 0;
    return getEPSILON(processingFeesAmt);
  } catch (error) {
    return error;
  }
};

const calculateGst = async (product, loan_app_id, gstOnAmount) => {
  try {
    const leadData = await LoanRequestSchema.findByLId(loan_app_id);
    const gstPercentage =
      leadData.state.toUpperCase() === 'HARYANA'
        ? product.cgst_on_pf_perc * 1 + product.sgst_on_pf_perc * 1
        : product.igst_on_pf_perc;
    let calculatedGst = (gstPercentage / 100) * gstOnAmount;
    let calculatedCgst = ((product.cgst_on_pf_perc || 0) / 100) * gstOnAmount;
    let calculatedSgst = ((product.sgst_on_pf_perc || 0) / 100) * gstOnAmount;
    let calculatedIgst = ((product.igst_on_pf_perc || 0) / 100) * gstOnAmount;
    if (leadData.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
    }
    calculatedGst = Number(calculatedGst).toFixed(2);
    calculatedCgst = Number(calculatedCgst).toFixed(2);
    calculatedSgst = Number(calculatedSgst).toFixed(2);
    calculatedIgst = Number(calculatedIgst).toFixed(2);
    return { calculatedGst, calculatedCgst, calculatedSgst, calculatedIgst };
  } catch (error) {
    return error;
  }
};

module.exports = { calculateProcessingFeesUpdateLimit, calculateGst };

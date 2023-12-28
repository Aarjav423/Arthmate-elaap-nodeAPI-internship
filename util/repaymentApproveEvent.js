const compositeHelper = require('../utils/compositeDisbursementHelper');
const { callPartnerWebhookUrl } = require('../util/disbursalApprovedEvent');

const fireRepaymentApproveEvent = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const { data, successRecords } = req.repaymentApprove;
    // Make array of UTR numbers.
    const utrNumbers = successRecords.map((item) => {
      return item.utr_number;
    });
    const dataObj = {};
    dataObj.utrNumbers = utrNumbers;
    dataObj.isRepaymentVerified = true;
    let txnId = Date.now();
    req.webhookData = dataObj;
    await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      txnId,
      webhookData: dataObj,
      eventKey: 'repayment_approval_confirmation',
    });
    req.webhookData.loan_id = txnId;

    // Make call to the webhook url
    await callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: 'repayment_approval_confirmation',
    });
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireRepaymentApproveEvent,
};

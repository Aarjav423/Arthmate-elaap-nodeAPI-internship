const compositeHelper = require('../utils/compositeDisbursementHelper');
const { callPartnerWebhookUrl } = require('../util/disbursalApprovedEvent');
const fireSetCreditLimitEvent = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const { reqData, updateLoanData } = req.creditLimitData;
    const data = {};
    const row = updateLoanData;
    if (reqData[0]?.loan_id === row.loan_id) {
      data.partner_loan_id = row.partner_loan_id;
      data.loan_id = row.loan_id;
      data.credit_limit = row.limit_amount;
    }
    let txnId = row.loan_id;
    req.webhookData = data;
    await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      txnId,
      webhookData: data,
      eventKey: 'set_limit',
    });

    // Make call to the webhook url
    await callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: 'set_limit',
    });
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireSetCreditLimitEvent,
};

const compositeHelper = require('../utils/compositeDisbursementHelper');
const { callPartnerWebhookUrl } = require('../util/disbursalApprovedEvent');
const moment = require('moment');

const fireWaiverEvent = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const { waiverRequest } = req.waiverData;
    const data = {};
    data.request_id = waiverRequest.sr_req_id;
    data.waiver_status = waiverRequest.status;
    data.remarks = waiverRequest.approver_remarks;
    data.loan_id = waiverRequest.loan_id;
    let txnId = waiverRequest.sr_req_id;
    req.webhookData = data;
    await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      txnId,
      webhookData: data,
      eventKey: 'waiver_decision',
    });
    // Make call to the webhook url
    await callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: 'waiver_decision',
    });
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireWaiverEvent,
};

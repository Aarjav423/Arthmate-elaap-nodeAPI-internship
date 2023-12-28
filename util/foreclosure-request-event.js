const compositeHelper = require('../utils/compositeDisbursementHelper');
const { callPartnerWebhookUrl } = require('../util/disbursalApprovedEvent');
const moment = require('moment');

const fireForeclosureRequestEvent = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const { foreclosureRequest } = req.ForeclosureData;
    const data = {};
    data.foreclosure_status =
      req.params.is_approved === 'Y' ? 'Approved' : 'Rejected';
    data.remarks = req.body.remarks ? req.body.remarks : '';
    data.validity_date = moment(foreclosureRequest.validity_date).format(
      'YYYY-MM-DD',
    );
    data.loan_id = req.params.loan_id;
    let txnId = req.params.loan_id;
    req.webhookData = data;
    await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      txnId,
      webhookData: data,
      eventKey: 'foreclosure',
    });
    // Make call to the webhook url
    await callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: 'foreclosure',
    });
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireForeclosureRequestEvent,
};

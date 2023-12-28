const compositeHelper = require('../utils/compositeDisbursementHelper');
const { callPartnerWebhookUrl } = require('../util/disbursalApprovedEvent');
const fireAddCamsDetailsEvent = async (req, res, next) => {
  try {
    if (req.status === 'confirmed') {
      const company_id = req.company._id;
      const product_id = req.product._id;
      const { data, recordCamsDetails } = req.camsDetails;
      const dataObj = {};
      dataObj.loan_app_id = recordCamsDetails.loan_app_id;
      dataObj.status = recordCamsDetails.status;
      dataObj.loan_id = recordCamsDetails.loan_app_id;
      let txnId = recordCamsDetails.loan_app_id;
      req.webhookData = dataObj;
      await compositeHelper.uploadWebhookDataToS3({
        company_id,
        product_id,
        txnId,
        webhookData: dataObj,
        eventKey: 'cams_confirmation',
      });
      // Make call to the webhook url
      await callPartnerWebhookUrl({
        company_id,
        product_id,
        req,
        key: 'cams_confirmation',
      });
    }
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireAddCamsDetailsEvent,
};

const WebhookNotifySchema = require('../models/webhook-notify-schema.js');
const s3helper = require('../util/s3helper.js');

const uploadWebhookDataToS3 = async (dataParams) => {
  try {
    const { company_id, product_id, webhookData, eventKey, loanAppId } =
      dataParams;
    //upload request data to s3 and store it in webhook_notify_calls table
    let filename = Math.floor(10000 + Math.random() * 99999) + '_client_req';
    const reqKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${loanAppId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookRequest = await s3helper.uploadFileToS3(
      webhookData,
      reqKey,
    );
    if (!uploadWebhookRequest)
      throw { success: false, message: 'Error uploading data to s3' };
    // Record request upload s3 url in webhook notify schema
    if (uploadWebhookRequest) {
      const recordWebhookReqURL =
        await WebhookNotifySchema.recordWebhookForeclosureRequestData({
          company_id,
          product_id,
          transaction_id: loanAppId,
          req_s3_url: uploadWebhookRequest.Location,
          event_key: eventKey,
        });
      return recordWebhookReqURL;
    }
  } catch (error) {
    return error;
  }
};

const uploadPartnerResponseToS3 = async (dataParams) => {
  try {
    const { company_id, product_id, responseData, loanAppId, webhookData } =
      dataParams;
    //upload response data to s3 .
    filename = Math.floor(10000 + Math.random() * 99999) + '_client_res';
    const resKey = `WEBHOOK-NOTIFY/${company_id}/${product_id}/${loanAppId}/${filename}/${Date.now()}.txt`;
    const uploadWebhookResponse = await s3helper.uploadFileToS3(
      responseData,
      resKey,
    );
    if (!uploadWebhookResponse)
      throw {
        success: false,
        message: 'Error while uploading partner webhook response to s3.',
      };
    // Record response upload s3 url in webhook_notify_calls table
    if (uploadWebhookResponse) {
      webhookData.res_s3_url = uploadWebhookResponse.Location;
      webhookData.client_response_code = responseData.status_code;
      webhookData.transaction_id = loanAppId;
      const recordClientResponseData =
        await WebhookNotifySchema.recordForeclosureClientResponseData(
          webhookData,
        );
      return recordClientResponseData;
    }
  } catch (error) {
    return error;
  }
};

module.exports = {
  uploadWebhookDataToS3,
  uploadPartnerResponseToS3,
};

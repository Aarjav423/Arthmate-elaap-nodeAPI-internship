'use strict';
const helper = require('../util/helper.js');
const BroadcastEventMasterSchema = require('../models/broadcast_event_master.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const autoLoanHelper = require('../utils/autoLoanHelper.js');
const eventPostData = require('../utils/event-postData.js');
const axios = require('axios');

const notifyPartner = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const loanAppId = req.loanAppId;
    // Upload Webhook request data to S3
    const uploadWebhookDataToS3 = await autoLoanHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      loanAppId,
      webhookData: req.webhookData,
      eventKey: 'manual_lead',
    });
    // Make call to the webhook url
    const callWebhookUrlResp = await callWebhookUrl({
      company_id,
      product_id,
      loanAppId,
      req,
    });
    if (callWebhookUrlResp === true) {
      return true;
    } else {
      return callWebhookUrlResp;
    }
  } catch (err) {
    throw err;
  }
};

// make call to the webhook url and store request and response data to s3
const callWebhookUrl = async (dataParams) => {
  let { company_id, product_id, loanAppId, req } = dataParams;
  let recordWebhookData = {
    company_id,
    product_id,
    transaction_id: loanAppId,
    event_key: 'manual_lead',
  };
  try {
    // Get subscribed event against company_id and product_id and key
    const eventRecord =
      await BroadcastEventMasterSchema.getByTitle('manual_lead');
    const subscribedEvent = await SubscribeEventSchema.getByKey({
      company_id,
      product_id,
      key: eventRecord.key,
    });
    //If event not subscribed throw error
    if (!subscribedEvent)
      throw {
        success: false,
        message: 'Event is not subscribed against selected company and product',
      };

    recordWebhookData.client_end_point = subscribedEvent.callback_uri;
    // Make call to the url provided by partner while subscribing event make it synchronous
    const partnerWebhookConfig = {
      method: 'POST',
      url: subscribedEvent.callback_uri,
      headers: {
        Authorization: subscribedEvent.secret_key,
        'Content-Type': 'application/json',
      },
      data: req.webhookData,
    };
    // Make call to the partner callback_url configured in event
    const partnerWebhookNotifyResponse = await axios(partnerWebhookConfig);
    partnerWebhookNotifyResponse.data.status_code = '200';
    const uploadPartnerWebhookResponse =
      await autoLoanHelper.uploadPartnerResponseToS3({
        company_id,
        product_id,
        loanAppId,
        responseData: partnerWebhookNotifyResponse.data,
        webhookData: recordWebhookData,
      });
    return true;
  } catch (error) {
    const errorData = {};
    errorData.data = error?.response?.data || {};
    errorData.status_code = '400';
    const uploadPartnerWebhookResponse =
      await autoLoanHelper.uploadPartnerResponseToS3({
        company_id,
        product_id,
        loanAppId,
        responseData: errorData,
        webhookData: recordWebhookData,
      });
    throw error;
  }
};

module.exports = {
  notifyPartner,
  callWebhookUrl,
};

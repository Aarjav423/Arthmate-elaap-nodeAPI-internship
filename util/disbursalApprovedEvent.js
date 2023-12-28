'use strict';
const helper = require('../util/helper.js');
const BroadcastEventMasterSchema = require('../models/broadcast_event_master.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const eventPostData = require('../utils/event-postData.js');
const axios = require('axios');
const loanedits = require('./loanedits');

// make call to the webhook url and store request and response data to s3
const callPartnerWebhookUrl = async (dataParams) => {
  let { company_id, product_id, req, key } = dataParams;
  let recordWebhookData = {
    company_id,
    product_id,
    event_key: key,
    transaction_id: req.webhookData.loan_id,
  };
  if (key === 'waiver_decision') {
    recordWebhookData.transaction_id = req.webhookData.request_id;
  }
  try {
    // Get subscribed event against company_id and product_id and key
    const eventRecord = await BroadcastEventMasterSchema.getByTitle(key);
    if (!eventRecord)
      throw {
        success: false,
        message: `Event is not created for ${key}`,
      };
    const subscribedEvent = await SubscribeEventSchema.getByKey({
      company_id,
      product_id,
      key: eventRecord.key,
    });
    //If event not subscribed throw error
    if (!subscribedEvent)
      throw {
        success: false,
        message: `Event for ${key} is not subscribed against selected company and product`,
      };
    if (subscribedEvent) {
      recordWebhookData.client_end_point = subscribedEvent.callback_uri;
      // Prepare data as per subscribed event
      const eventData = {
        event_key: key,
        data: req.webhookData,
      };
      if (key == 'repayment_approval_confirmation') {
        delete eventData.data.loan_id;
      }
      // Make call to the url provided by partner while subscribing event make it synchronous
      const partnerWebhookConfig = {
        method: 'POST',
        url: subscribedEvent.callback_uri,
        headers: {
          Authorization: subscribedEvent.secret_key,
          'Content-Type': 'application/json',
        },
        data: eventData,
      };
      // Make call to the partner callback_url configured in event
      const partnerWebhookNotifyResponse = await axios(partnerWebhookConfig);
      partnerWebhookNotifyResponse.data.status_code = '200';
      const uploadPartnerWebhookResponse =
        await compositeHelper.uploadPartnerResponseToS3({
          company_id,
          product_id,
          responseData: partnerWebhookNotifyResponse.data,
          webhookData: recordWebhookData,
        });
    }
  } catch (error) {
    const errorData = {};
    errorData.data = error.response.data || {};
    errorData.status_code = '400';
    const uploadPartnerWebhookResponse =
      await compositeHelper.uploadPartnerResponseToS3({
        company_id,
        product_id,
        txnId,
        responseData: errorData,
        webhookData: recordWebhookData,
      });
    return error;
  }
};

const fireDisbursalApprovedStatusEvent = async (req, res, next) => {
  try {
    const company_id = req.company._id;
    const product_id = req.product._id;
    const eventData = req.broadcastEventData;
    //Prepare data to send on partner webhook url
    req.webhookData = {
      company_id,
      product_id,
      loan_id: eventData.loan_id,
      status: eventData.status,
      stage: loanedits.mappingStages[eventData.status],
    };
    // Upload Webhook request data to S3
    const uploadWebhookDataToS3 = await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      webhookData: req.webhookData,
      eventKey: eventData.status,
      txnId: eventData.loan_id,
    });
    // Make call to the webhook url
    const callWebhookUrlResp = await callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: eventData.status,
    });
    next();
  } catch (error) {
    return error;
  }
};

module.exports = {
  fireDisbursalApprovedStatusEvent,
  callPartnerWebhookUrl,
};

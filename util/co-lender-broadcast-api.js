const helper = require('../util/helper.js');
const BroadcastEventMasterSchema = require('../models/broadcast_event_master.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const ColenderLoanSchema = require('../models/co-lender-loan-schema');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const eventPostData = require('../utils/event-postData.js');
const axios = require('axios');
const coLenderDisbursementStatus = async (req, next) => {
  if (req.isColender == false) {
    return;
  }
  try {
    const company_id = req.body.product.company_id;
    const product_id = req.body.product._id;
    const co_lender_id = req.colenderResp.co_lender_id;
    const txnId = req.disbursementRecord.txn_id;
    // Upload Webhook request data to S3
    const uploadWebhookDataToS3 =
      await compositeHelper.uploadColenderWebhookDataToS3({
        company_id,
        product_id,
        co_lender_id,
        txnId,
        webhookData: req.webhookData,
        eventKey: 'final_utr',
      });
    // Make call to the webhook url
    const callWebhookUrlResp = await callWebhookUrl({
      co_lender_id,
      txnId,
      req,
    });
    next();
  } catch (err) {
    return err;
  }
};

// make call to the webhook url and store request and response data to s3
const callWebhookUrl = async (dataParams) => {
  let { co_lender_id, txnId, req } = dataParams;
  const company_id = req.body.product.company_id;
  const product_id = req.body.product._id;
  let recordWebhookData = {
    co_lender_id,
    transaction_id: txnId,
    event_key: 'final_utr',
  };
  try {
    // Get subscribed event against company_id and product_id and key
    const eventRecord =
      await BroadcastEventMasterSchema.getByTitle('final_utr');
    const subscribedEvent = await SubscribeEventSchema.getByColenderKey({
      co_lender_id,
      key: eventRecord.key,
    });
    //If event not subscribed throw error
    if (subscribedEvent.length == 0)
      throw {
        success: false,
        message: 'Event is not subscribed against selected company and product',
      };
    for (let i = 0; i < subscribedEvent.length; i++) {
      let tempSubscribedEvent = subscribedEvent[i];
      recordWebhookData.client_end_point = tempSubscribedEvent.callback_uri;
      let coLenderId = JSON.parse(
        JSON.stringify(tempSubscribedEvent),
      ).co_lender_id;
      //get co_lender_loan_id for co-lender;
      let coLenderLoanResp = await ColenderLoanSchema.findByLoanIDAndCoLenderId(
        req.disbursementRecord.loan_id,
        coLenderId,
      );
      // Prepare data as per subscribed event
      const eventData = {
        co_lender_loan_id: coLenderLoanResp[0].co_lender_account_no,
        disbursement_status_code: req.webhookData.disbursement_status_code,
        loan_id: req.disbursementRecord.loan_id,
        partner_loan_id: req.disbursementRecord.partner_loan_id,
        txn_amount: req.disbursementRecord.amount,
        utrn_number: req.webhookData.utrn_number,
        txn_date: req.webhookData.txn_date,
        txn_id: req.webhookData.txn_id,
      };
      //Pass label for refund notofication.
      if (
        req?.disbursementRecord?.label?.toString().toLowerCase() === 'refund'
      ) {
        eventData.label = req?.disbursementRecord?.label || '';
      }
      //For loc product send usage_id and request_id in webhook data.
      if (req.disbursementRecord.allow_loc === 1) {
        eventData.usage_id = req.disbursementRecord.usage_id
          ? req.disbursementRecord.usage_id
          : '';
        eventData.request_id = req.disbursementRecord.request_id
          ? req.disbursementRecord.request_id
          : '';
        eventData.due_date = req.disbursementRecord.due_date
          ? req.disbursementRecord.due_date
          : '';
        eventData.principal_amount = req.disbursementRecord.principal_amount
          ? req.disbursementRecord.principal_amount
          : '';
        eventData.int_value = req.disbursementRecord.int_value
          ? req.disbursementRecord.int_value
          : '';
      }
      const disbursementEventPostData =
        eventPostData.coLenderDisbursementEventPostData(eventData);
      // Make call to the url provided by partner while subscribing event make it synchronous
      const partnerWebhookConfig = {
        method: 'POST',
        url: tempSubscribedEvent.callback_uri,
        headers: {
          Authorization: tempSubscribedEvent.secret_key,
          'Content-Type': 'application/json',
        },
        data: disbursementEventPostData,
      };
      // Make call to the partner callback_url configured in event
      const partnerWebhookNotifyResponse = await axios(partnerWebhookConfig);
      partnerWebhookNotifyResponse.data.status_code = '200';
      const uploadPartnerWebhookResponse =
        await compositeHelper.uploadColenderResponseToS3({
          company_id,
          product_id,
          co_lender_id,
          txnId,
          responseData: partnerWebhookNotifyResponse.data,
          webhookData: recordWebhookData,
        });
    }
  } catch (error) {
    const errorData = {};
    errorData.data = error.response.data || {};
    errorData.status_code = '400';
    const uploadPartnerWebhookResponse =
      await compositeHelper.uploadColenderResponseToS3({
        company_id,
        product_id,
        co_lender_id,
        txnId,
        responseData: errorData,
        webhookData: recordWebhookData,
      });
    return error;
  }
};

module.exports = {
  coLenderDisbursementStatus,
};

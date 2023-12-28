'use strict';
const helper = require('../util/helper.js');
const BroadcastEventMasterSchema = require('../models/broadcast_event_master.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const eventPostData = require('../utils/event-postData.js');
const axios = require('axios');

const disbursementStatus = async (req, res, next) => {
  try {
    const { company_id, product_id, txn_id } = req.disbursementRecord;
    await uploadWebhookData(company_id, product_id, txn_id, req, 'disbursement');
    await callWebhook({ company_id, product_id, txnId: txn_id, req }, 'disbursement');
    next();
  } catch (err) {
    return err;
  }
};

const intRefundStatus = async (req, res, next) => {
  try {
    const { company_id, product_id, txn_id } = req.disbursementRecord;
    await uploadWebhookData(company_id, product_id, txn_id, req, 'interest_refund');
    await callWebhook({ company_id, product_id, txnId: txn_id, req }, 'interest_refund');
    next();
  } catch (err) {
    return err;
  }
};

const excessRefundStatus = async (req, res, next) => {
  try {
    const { company_id, product_id, txn_id } = req.disbursementRecord;
    await uploadWebhookData(company_id, product_id, txn_id, req, 'excess_refund');
    await callWebhook({ company_id, product_id, txnId: txn_id, req }, 'excess_refund');
    next();
  } catch (err) {
    return err;
  }
};

const uploadWebhookData = async (company_id, product_id, txnId, req, eventKey) => {
  return compositeHelper.uploadWebhookDataToS3({
    company_id,
    product_id,
    txnId,
    webhookData: req.webhookData,
    eventKey,
  });
};

const callWebhook = async (dataParams, eventKey) => {
  let { company_id, product_id, txnId, req } = dataParams;
  let recordWebhookData = {
    company_id,
    product_id,
    transaction_id: txnId,
    event_key: eventKey,
  };
  try {
    const eventRecord = await BroadcastEventMasterSchema.getByTitle(eventKey);
    const subscribedEvent = await SubscribeEventSchema.getByKey({
      company_id,
      product_id,
      key: eventRecord.key,
    });
    if (!subscribedEvent) {
      throw {
        success: false,
        message: `Event is not subscribed against selected company and product for ${eventKey}`,
      };
    }

    if (subscribedEvent) {
      recordWebhookData.client_end_point = subscribedEvent.callback_uri;

      // Prepare data as per subscribed event
      const eventData = {
        disbursement_status_code: req.webhookData.disbursement_status_code,
        loan_id: req.disbursementRecord.loan_id,
        partner_loan_id: req.disbursementRecord.partner_loan_id,
        txn_amount: req.disbursementRecord.amount,
        utrn_number: req.webhookData.utrn_number,
        txn_date: req.webhookData.txn_date,
        txn_id: req.webhookData.txn_id,
        event_key: eventKey,
      };

      //Pass label for refund notofication.
      if (req?.disbursementRecord?.label?.toString().toLowerCase() === 'refund') {
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
        eventData.scheme_id = req.disbursementRecord.scheme_id
          ? req.disbursementRecord.scheme_id
          : '';
      }
      const disbursementEventPostData = await eventPostData.disbursementEventPostData(eventData);
      // Make call to the url provided by partner while subscribing event make it synchronous
      const partnerWebhookConfig = {
        method: 'POST',
        url: subscribedEvent.callback_uri,
        headers: {
          Authorization: subscribedEvent.secret_key,
          'Content-Type': 'application/json',
        },
        data: disbursementEventPostData,
      };
      // Make call to the partner callback_url configured in event
      const partnerWebhookNotifyResponse = await axios(partnerWebhookConfig);
      partnerWebhookNotifyResponse.data.status_code = '200';
      const uploadPartnerWebhookResponse =
        await compositeHelper.uploadPartnerResponseToS3({
          company_id,
          product_id,
          txnId,
          responseData: partnerWebhookNotifyResponse.data,
          webhookData: recordWebhookData,
        });
    }
  } catch (error) {
    const errorData = {};
    errorData.data = error?.response?.data || {};
    errorData.status_code = '400';
    const uploadPartnerWebhookResponse = await compositeHelper.uploadPartnerResponseToS3({
      company_id,
      product_id,
      txnId,
      responseData: errorData,
      webhookData: recordWebhookData,
    });
    return error;
  }
};

module.exports = {
  disbursementStatus,
  intRefundStatus,
  callWebhook,
  excessRefundStatus
};

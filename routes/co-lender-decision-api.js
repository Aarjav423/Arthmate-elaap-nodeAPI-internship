'use strict';
const jwt = require('../util/jwt');
const { validationResult } = require('express-validator');
const colenderHelper = require('../utils/colendHelper');
const BorrowerInfoCommonsSchema = require('../models/borrowerinfo-common-schema');
const ProductSchema = require('../models/product-schema');
const broadcastEvent = require('../util/disbursalApprovedEvent');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');

module.exports = (app) => {
  app.post(
    '/api/co-lender-decision-status',
    [
      jwt.verifyCoLenderDecisionApiToken,
      colenderHelper.validateCoLenderDecisionBody,
    ],
    async (req, res, next) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        if (!req.body) {
          throw {
            success: false,
            message: 'Internal server error',
          };
        }
        const body = req.body;
        const borrowerInforData = await BorrowerInfoCommonsSchema.findIfExists(
          body.loan_id,
          body.partner_loan_id,
        );
        if (!borrowerInforData) {
          throw {
            success: false,
            message: 'Invalid loan_id or partner_loan_id',
          };
        }
        const product = await ProductSchema.findById(
          borrowerInforData.product_id,
        );
        if (!product) {
          throw {
            success: false,
            message: 'Product not found',
          };
        }
        body.loan_data = borrowerInforData;
        // fire co_lender decision broadcast event
        fireColenderDecisionEvent(body);
        return res.status(200).send({
          success: true,
          message: 'Successfully notified to partner',
        });
      } catch (error) {
        return res.status(500).send(error);
      }
    },
  );
};

const fireColenderDecisionEvent = async (req) => {
  try {
    const company_id = req.loan_data.company_id;
    const product_id = req.loan_data.product_id;
    const eventData = req;
    req.webhookData = {
      company_id,
      product_id,
      loan_id: eventData.loan_id,
      partner_loan_id: eventData.partner_loan_id,
      outcome: eventData.outcome,
    };
    // Upload Webhook request data to S3
    const uploadWebhookDataToS3 = await compositeHelper.uploadWebhookDataToS3({
      company_id,
      product_id,
      webhookData: req.webhookData,
      eventKey: eventData.outcome,
      txnId: eventData.loan_id,
    });
    // Make call to the webhook url
    const callWebhookUrlResp = await broadcastEvent.callPartnerWebhookUrl({
      company_id,
      product_id,
      req,
      key: 'co_lender_approval',
    });
  } catch (error) {
    return error;
  }
};

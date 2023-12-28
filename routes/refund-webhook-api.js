'use strict';
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const refundHelper = require('../util/refund-webhook-helper.js');
const broadcastEvent = require('../util/broadcastEvent.js');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');
const ChargesSchema = require('../models/charges-schema');
const ProductSchema = require('../models/product-schema');
const moment = require('moment');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const PayoutDetails = require('../models/payout-detail-schema.js');

module.exports = (app) => {
  //API for refund webhook
  app.post(
    '/api/wireout-notification-refund',
   [jwt.verifyWebhookToken, compositeHelper.validateWebhookPayload],
    async (req, res, next) => {
      try {
        // Validate mandatory parameters in body
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        if (
          data.disbursement_status_code.indexOf('3') > -1 &&
          !data.utrn_number
        )
          throw { success: false, message: 'utrn_number is required' };
        // Get company_id and product_id from disbursements schema by txn_id.
        let disbursementRecord = await DisbursementAndTopupSchema.findByTxnId(
          data.txn_id,
        );
        disbursementRecord = JSON.parse(JSON.stringify(disbursementRecord));

        // Throw error if disbursement record not found by txn_id
        if (!disbursementRecord)
          throw {
            success: false,
            message: 'No record found in disbursement records against txn_id.',
          };
        // Fetch product details to check whether product is of type LOC or not
        const productResp = await ProductSchema.findById(
          disbursementRecord.product_id,
        );
        if (!productResp)
          throw { success: false, message: 'Product not found' };
        data.product = productResp;
        req.disbursementRecord = disbursementRecord;

        // Update webhook status code in disbursements_and_topup schema and also update loan status accordingly
        const updateWebhookStatusRes = await refundHelper.updateWebhookStatus(
          req,
          data,
          data.txn_id,
          productResp,
        );

        if (updateWebhookStatusRes.success == false) {
          throw updateWebhookStatusRes;
        }
        req.webhookData = data;
        next();
        return res.status(200).send({
          success: true,
          message: 'webhook response recorded successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    // broadcastEvent.disbursementStatus,
    broadcastEvent.intRefundStatus,
  );

  app.post(
    '/api/wireout-notification-excess-refund',
    [jwt.verifyWebhookToken, compositeHelper.validateWebhookPayload],
    async (req, res, next) => {
      try {
        // Validate mandatory parameters in body
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        if (data.disbursement_status_code.indexOf('3') > -1 && !data.utrn_number) throw { success: false, message: 'utrn_number is required' };
        // Get company_id and product_id from disbursements schema by txn_id.
        let disbursementRecord = await PayoutDetails.findOneByQuery({ txn_id: data.txn_id, type: 'excess_refund' });
        disbursementRecord = JSON.parse(JSON.stringify(disbursementRecord));

        // Throw error if disbursement record not found by txn_id
        if (!disbursementRecord)
          throw {
            success: false,
            message: 'No record found in disbursement records against txn_id in Payout Detailss',
          };
        // Fetch product details to check whether product is of type LOC or not
        const productResp = await ProductSchema.findById(disbursementRecord.product_id);
        if (!productResp) throw { success: false, message: 'Product not found' };
        data.product = productResp;
        req.disbursementRecord = disbursementRecord;

        // Update webhook status code in disbursements_and_topup schema and also update loan status accordingly
        const updateWebhookStatusRes = await refundHelper.updateWebhookStatusForExcessRefund(req, data, data.txn_id, productResp);

        if (updateWebhookStatusRes.success == false) {
          throw updateWebhookStatusRes;
        }
        req.webhookData = data;
        next();
        return res.status(200).send({
          success: true,
          message: 'Excess webhook response recorded successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    // broadcastEvent.disbursementStatus,
    broadcastEvent.excessRefundStatus,
  );
};

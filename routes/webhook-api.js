'use strict';
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const compositeHelper = require('../utils/compositeDisbursementHelper.js');
const broadcastEvent = require('../util/broadcastEvent.js');
const coLenderBroadcast = require('../util/co-lender-broadcast-api.js');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const ChargesSchema = require('../models/charges-schema');
const ProductSchema = require('../models/product-schema');
const moment = require('moment');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const productSchemeMappingSchema = require('../models/product-scheme-mapping-schema.js');
const payoutDetailsHelper = require('../util/payout-details-helper.js');

module.exports = (app) => {
  //Webhook api
  app.post(
    '/api/wireout_notification',
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

        if (productResp.allow_loc === 1) {
          //Fetch record from loan_transaction_ledger against txn_id for loc product
          if (disbursementRecord.label_type != 'cashcollateral') {
            const transactionLedgerResp =
              await LoanTransactionLedgerSchema.findOneTxnId(data.txn_id);
            let productSchemeMappingResp = {};
            if (transactionLedgerResp.product_scheme_id) {
              productSchemeMappingResp =
                await productSchemeMappingSchema.getById(
                  transactionLedgerResp.product_scheme_id,
                );
              if (productSchemeMappingResp.scheme_id) {
                disbursementRecord.scheme_id =
                  productSchemeMappingResp.scheme_id;
              }
            }
            const intValue =
              productResp?.interest_type === 'upfront'
                ? transactionLedgerResp?.upfront_interest
                : productResp.interest_type === 'rearended'
                ? transactionLedgerResp?.interest_payable
                : 0;
            //Pass usage_id and request_id if present in the webhook data for loc product.
            disbursementRecord.usage_id = transactionLedgerResp?._id
              ? transactionLedgerResp?._id
              : '';
            disbursementRecord.request_id = transactionLedgerResp?.request_id
              ? transactionLedgerResp.request_id
              : '';
            disbursementRecord.allow_loc = productResp?.allow_loc;
            disbursementRecord.due_date =
              productResp?.force_usage_convert_to_emi !== 1
                ? moment(data?.txn_date)
                    .add(transactionLedgerResp.repayment_days, 'd')
                    .format('YYYY-MM-DD')
                : '';
            disbursementRecord.principal_amount =
              transactionLedgerResp?.txn_amount
                ? transactionLedgerResp?.txn_amount
                : '';
            disbursementRecord.int_value = intValue;
            disbursementRecord.repayment_days =
              transactionLedgerResp?.repayment_days
                ? transactionLedgerResp?.repayment_days
                : 0;
          }
        }
        req.disbursementRecord = disbursementRecord;
        // Update webhook status code in disbursements_and_topup schema and also update loan status accordingly
        const updateWebhookStatusRes =
          await compositeHelper.updateWebhookStatus(
            req,
            data,
            data.txn_id,
            productResp,
          );

        if (updateWebhookStatusRes.success == false) {
          throw updateWebhookStatusRes;
        }
        req.webhookData = data;
        //fetch colender_id from loan id;
        const colenderResp = await BorrowerinfoCommon.findOneWithKLID(
          disbursementRecord.loan_id,
        );
        req.isColender = false;
        if (
          colenderResp.co_lender_id !== undefined &&
          colenderResp.co_lender_id !== null
        ) {
          req.colenderResp = colenderResp;
          req.isColender = true;
        }
        try {
          await payoutDetailsHelper.createInterestRefundTL(colenderResp, productResp);
        } catch (e) { /* do nothing */ }
        next();
        let chargesArray = [
          'Convenience Fees',
          'Usage Fees',
          'Insurance Amount',
          'Application Fees',
          'Subvention Fees',
        ];
        if (
          (data.disbursement_status_code.indexOf('3') > -1 &&
            disbursementRecord?.processing_fees &&
            disbursementRecord?.processing_fees > 0) ||
          productResp.allow_loc !== 1
        )
          chargesArray.push('Processing Fees');
        const disbursementCharges = await ChargesSchema.findAllChargeByTypes(
          disbursementRecord.loan_id,
          chargesArray,
          disbursementRecord.usage_id,
        );
        let chargesToUpdate = [];
        disbursementCharges.forEach(async (chargeItem) => {
          let chargeItemFinal = JSON.parse(JSON.stringify(chargeItem));
          const paymentObj = {
            utr: req.body.utrn_number,
            amount_paid: chargeItem.charge_amount,
            gst_paid: chargeItem.gst,
            utr_date: req.body.txn_date,
          };
          chargeItemFinal.payment.push(paymentObj);
          chargeItemFinal.is_processed = 'Y';
          chargeItemFinal.paid_date = req.body.txn_date;
          chargesToUpdate.push(chargeItemFinal);
        });
        if (chargesToUpdate.length) {
          chargesToUpdate.forEach((ctu) => {
            ctu.updated_by = "SYSTEM",
            ctu.payment.forEach((x) => {
              ctu.total_amount_paid =
                (ctu.total_amount_paid || 0) + x.amount_paid;
              ctu.total_gst_paid = (ctu.total_gst_paid || 0) + x.gst_paid;
            });
          });
        }
        if (chargesToUpdate.length) {
          const updatedCharges =
            await ChargesSchema.updateByIdBulk(chargesToUpdate);
        }
        return res.status(200).send({
          success: true,
          message: 'webhook response recorded successfully.',
        });
      } catch (error) {
        console.log('wireout notification error', error);
        return res.status(400).send(error);
      }
    },
    broadcastEvent.disbursementStatus,
    coLenderBroadcast.coLenderDisbursementStatus,
  );
};

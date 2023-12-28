const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const moment = require('moment');
const LoanTransactions = require('../models/loan-transaction-ledger-schema.js');
const repaymentApprove = require('../util/repaymentApproveEvent.js');
let reqUtils = require('../util/req.js');
const ChargesSchema = require('../models/charges-schema');
const BorrowerInfoCommons = require('../models/borrowerinfo-common-schema');
const ShortOrExcessSchema = require('../models/short-or-excess-schema');

/**
 * Exporting Repayment Records API
 * @param {*} app
 * @param {*} connection
 * @return {*} Pending Repayment Details
 * @throws {*} No pending Repayment Records/(NA)
 */

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/pending-repayment-records/:company_id/:product_id/:txn_amount/:txn_reference/:utr_number/:status/:page/:limit/',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const company_id = req.params.company_id;
        const product_id = req.params.product_id;
        const page = req.params.page;
        const limit = req.params.limit;
        const status = req.params.status;
        const txn_amount =
          req.params.txn_amount === '-1' ? '' : req.params.txn_amount;
        const txn_reference =
          req.params.txn_reference === '-1' ? '' : req.params.txn_reference;
        const utr_number =
          req.params.utr_number === '-1' ? '' : req.params.utr_number;
        if (company_id != req.company._id)
          throw { success: false, message: 'company authorization failed.' };
        if (product_id != req.product._id)
          throw { success: false, message: 'product authorization failed.' };
        const pendingRepaymentRecords =
          await LoanTransactions.getFilteredPendingRepayments({
            company_id,
            product_id,
            page,
            limit,
            txn_entry: 'cr',
            txn_amount,
            txn_reference,
            utr_number,
            status,
          });
        if (!pendingRepaymentRecords.rows.length)
          throw {
            success: false,
            message:
              'No pending repayment records found against provided filter',
          };
        return res.status(200).send(pendingRepaymentRecords);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/repayment-approve/:status',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const status = req.params.status;
        const payload = {
          is_received: status,
          action_by: req.user.email,
          action_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        };
        let filter = [];
        const data = req.body;
        let txnData = {};
        Array.from(data).forEach((row) => {
          filter.push({
            _id: row._id,
            loan_id: row.loan_id,
          });
          txnData[`${row.loan_id}txn_reference_datetime`] =
            row.txn_reference_datetime;
          txnData[`${row.loan_id}utr_number`] = row.utr_number;
          txnData[`${row.loan_id}utr_date_time_stamp`] =
            row.utr_date_time_stamp;
        });
        const repaymentsReceivedResp =
          await LoanTransactions.markRepaymentReceived(filter, payload);
        if (repaymentsReceivedResp.errors.length)
          throw {
            success: false,
            message: `Failed to update ${repaymentsReceivedResp.errors.length} records`,
            errors: repaymentsReceivedResp.errors,
          };
        const successRecords = repaymentsReceivedResp.successRecords;
        req.repaymentApprove = { data, successRecords };
        // charge to update in charge table//
        repaymentsReceivedResp.successRecords.forEach(async (item) => {
          const repaymentCharges = await ChargesSchema.findAllChargeByTypes(
            item.loan_id,
            ['Processing Fees'],
          );
          let chargesToUpdate = [];

          repaymentCharges.forEach(async (chargeItem) => {
            let chargeItemFinal = JSON.parse(JSON.stringify(chargeItem));
            const paymentObj = {
              utr: txnData[`${chargeItem.loan_id}utr_number`],
              amount_paid: chargeItem.charge_amount,
              gst_paid: chargeItem.gst,
              utr_date: txnData[`${chargeItem.loan_id}txn_reference_datetime`],
            };
            chargeItemFinal.payment.push(paymentObj);
            chargeItemFinal.is_processed = 'Y';
            chargeItemFinal.paid_date =
              txnData[`${chargeItem.loan_id}utr_date_time_stamp`];

            chargesToUpdate.push(chargeItemFinal);
          });
          if (chargesToUpdate.length) {
            chargesToUpdate.forEach((ctu) => {
              ctu.updated_by = req.user.email,
              ctu.payment.forEach((x) => {
                ctu.total_amount_paid =
                  (ctu.total_amount_paid || 0) + x.amount_paid;
                ctu.total_gst_paid = (ctu.total_gst_paid || 0) + x.gst_paid;
              });
            });
            await ChargesSchema.updateByIdBulk(chargesToUpdate);
          }
        });

        reqUtils.json(req, res, next, 200, {
          success: true,
          message: 'Repayment status recorded successfully.',
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
    repaymentApprove.fireRepaymentApproveEvent,
  );

  app.put(
    '/api/repayment-approve/:status/:bankName/:bankAccountNumber',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const status = req.params.status;
        const bankName = req.params.bankName;
        const bankAccountNumber = req.params.bankAccountNumber;
        const payload = {
          is_received: status,
          coll_bank_name: bankName,
          coll_bank_acc_number: bankAccountNumber,
          action_by: req.user.email,
          action_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        };
        let filter = [];
        const data = req.body;
        let txnData = {};
        Array.from(data).forEach((row) => {
          filter.push({
            _id: row._id,
            loan_id: row.loan_id,
          });
          txnData[`${row.loan_id}txn_reference_datetime`] =
            row.txn_reference_datetime;
          txnData[`${row.loan_id}utr_number`] = row.utr_number;
          txnData[`${row.loan_id}utr_date_time_stamp`] =
            row.utr_date_time_stamp;
        });
        const repaymentsReceivedResp =
          await LoanTransactions.markRepaymentReceived(filter, payload);
        if (repaymentsReceivedResp.errors.length)
          throw {
            success: false,
            message: `Failed to update ${repaymentsReceivedResp.errors.length} records`,
            errors: repaymentsReceivedResp.errors,
          };

        //check if loan is closed or foreclosed or cancelled and create entry in short_or_excess
        Array.from(data).map( async (row) => {
          const BICData = await BorrowerInfoCommons.findOneWithKLID(row.loan_id);

          if (BICData.stage === 6 || BICData.stage === 999) {
            const updatedPayload = {
              processed: "Y",
            }
            const updatedFilter = {
              _id: row._id,
              loan_id: row.loan_id,
            }
            const repaymentProcessedResp = await LoanTransactions.makeRepaymentProcessed(updatedFilter, updatedPayload);
            
            let shortOrExcessData = {
              loan_id: row.loan_id,
              company_id: row.company_id,
              product_id: row.product_id,
              amount: row.txn_amount,
              created_by: req.user.username,
              updated_by: req.user.username,
            };

            const dataExists = await ShortOrExcessSchema.findByLoanId(row.loan_id);
            let shortOrExcessResp;

            if (dataExists) {
              const txnAmount = parseFloat(row.txn_amount);
              let presentAmount = parseFloat(dataExists.amount);
              presentAmount = ((presentAmount + txnAmount) * 100 )/100;
              const finalAmount = String(presentAmount);
              shortOrExcessData.amount = finalAmount;

              shortOrExcessResp = await ShortOrExcessSchema.updateAmount(row.loan_id, shortOrExcessData)
            } else {
              shortOrExcessResp = await ShortOrExcessSchema.addNew(shortOrExcessData);
            }
          }
        });

        const successRecords = repaymentsReceivedResp.successRecords;
        req.repaymentApprove = { data, successRecords };

        // charge to update in charge table//
        repaymentsReceivedResp.successRecords.forEach(async (item) => {
          const repaymentCharges = await ChargesSchema.findAllChargeByTypes(
            item.loan_id,
            ['Processing Fees'],
          );
          let chargesToUpdate = [];

          repaymentCharges.forEach(async (chargeItem) => {
            let chargeItemFinal = JSON.parse(JSON.stringify(chargeItem));
            const paymentObj = {
              utr: txnData[`${chargeItem.loan_id}utr_number`],
              amount_paid: chargeItem.charge_amount,
              gst_paid: chargeItem.gst,
              utr_date: txnData[`${chargeItem.loan_id}txn_reference_datetime`],
            };
            chargeItemFinal.payment.push(paymentObj);
            chargeItemFinal.is_processed = 'Y';
            chargeItemFinal.paid_date =
              txnData[`${chargeItem.loan_id}utr_date_time_stamp`];

            chargesToUpdate.push(chargeItemFinal);
          });
          if (chargesToUpdate.length) {
            chargesToUpdate.forEach((ctu) => {
              ctu.updated_by = req.user.email,
              ctu.payment.forEach((x) => {
                ctu.total_amount_paid =
                  (ctu.total_amount_paid || 0) + x.amount_paid;
                ctu.total_gst_paid = (ctu.total_gst_paid || 0) + x.gst_paid;
              });
            });
            await ChargesSchema.updateByIdBulk(chargesToUpdate);
          }
        });

        reqUtils.json(req, res, next, 200, {
          success: true,
          message: 'Repayment status recorded successfully.',
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
    repaymentApprove.fireRepaymentApproveEvent,
  );
};

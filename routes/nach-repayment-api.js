const bodyParser = require('body-parser');
const moment = require('moment');
const nachEncDecHelper = require('../util/camspay-nach-encdec-helper.js');
const NachPresentmentSchema = require('../models/nach-presentment-schema.js');
const loanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const BorrowerinfoSchema = require('../models/borrowerinfo-common-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to receive cams nach repayment webhook.
  app.post('/api/nach-repayment', async (req, res) => {
    try {
      //Decrypt the input data.
      let encdata = req.body.transaction.split('.');
      var iv = encdata[0];
      var encinput = encdata[1];
      const decryptedData = await nachEncDecHelper.encryptDecrypt(
        'Decrypt',
        encinput,
        iv,
      );
      let data = JSON.parse(decryptedData);
      data = data.transaction;
      //making array of all loan ids
      const loanIds = data.map((item) => {
        return item.LOAN_NO;
      });
      // Make array of all unique loan ids so that there is no repetition of ids
      const uniqueLoanIds = [...new Set(loanIds)];
      //Fetch data from nach presentments against loan_id
      const nachPresentMentRecords =
        await NachPresentmentSchema.findByLId(uniqueLoanIds);
      if (!nachPresentMentRecords)
        throw {
          success: false,
          message: 'No records found in nach presentment schema.',
        };
      let repaymentData = [];
      let updateFailArray = [];
      for (let i = 0; i < data.length; i++) {
        nachPresentMentRecords.forEach(async (record) => {
          let condition =
            record.loan_id === data[i].LOAN_NO &&
            record.mandate_ref_number === data[i].MANDATE_REF_NO &&
            moment(record.due_date).format('DD-MMM-YYYY').toUpperCase() ===
              data[i].DUE_DATE;
          if (condition) {
            let updateObj = {
              trxn_batch_number: data[i].TRXN_BATCH_NO,
              nach_transaction_ref_no: data[i].TRANSACTION_REF_NO,
              trxn_batch_no: data[i].TRXN_BATCH_NO,
              mandate_ref_no: data[i].MANDATE_REF_NO,
              due_amount: Number(data[i]?.DUE_AMOUNT),
              nach_udr_no: data[i].UDR_NO,
              loan_id: data[i].LOAN_NO,
              due_day: data[i].DUE_DAY,
              due_date: data[i].DUE_DATE,
              presentation_status_code: data[i].STATUS_CODE,
              nach_status_description: data[i].STATUS_CODE_DESC,
              reject_code: data[i].REJECT_CODE,
              reject_code_description: data[i].REJECT_REASON,
              nach_settlement_date: data[i].SETTLEMENT_DATE,
              rbi_ecs_no: data[i].RBI_ECS_NO,
              remit_mode: data[i].REMIT_MODE,
              rem_ref_no: data[i].REM_REF_NO,
            };
            let query = {
              loan_id: data[i].LOAN_NO,
              mandate_ref_number: data[i].MANDATE_REF_NO,
              due_date: data[i].DUE_DATE,
            };
            //Update the nach repayment data in nach presentment schema
            const updateNachRepayment =
              await NachPresentmentSchema.updateByCondition(query, {
                repayment_transaction_status: updateObj,
              });
            if (!updateNachRepayment) {
              updateFailArray.push(record);
            }
          }
        });
        if (data[i].STATUS_CODE === 'C') {
          //Fetch record from borrowerinfo_common for partner_loan_id mapping.
          const borrowerResp = await BorrowerinfoSchema.findOneWithKLID(
            data[i].LOAN_NO,
          );
          //Record repayment in loan transaction ledger schema.
          repaymentData.push({
            txn_amount: data[i].DUE_AMOUNT,
            payment_mode: 'CAMSPay',
            utr_number: data[i].UDR_NO,
            txn_reference: data[i].TRANSACTION_REF_NO,
            txn_reference_datetime: moment(),
            utr_date_time_stamp: moment(),
            partner_loan_id: borrowerResp?.partner_loan_id,
            loan_id: data[i].LOAN_NO,
          });
        }
      }
      const recordRepayment = await loanTransactionSchema.addNew(repaymentData);
      if (!recordRepayment)
        throw { success: false, message: 'Error while recording repayment.' };
      if (updateFailArray.length)
        throw {
          success: false,
          message: 'Error while updating nach repayment data for some records.',
        };
      return res.status(200).send({
        success: true,
        message: 'Nach repayment data updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/encrypt-data', async (req, res) => {
    try {
      const data = req.body;
      const encData = await nachEncDecHelper.encryptDecrypt(
        'Encrypt',
        data,
        '',
      );
      return res.status(200).send(encData);
    } catch (error) {
      console.log(error);
      return res.status(400).send(error);
    }
  });

  app.post('/api/decrypt-data', async (req, res) => {
    try {
      let encdata = req.body.transaction.split('.');
      var iv = encdata[0];
      var encinput = encdata[1];
      const decData = await nachEncDecHelper.encryptDecrypt(
        'Decrypt',
        encinput,
        iv,
      );
      return res.status(200).send(decData);
    } catch (error) {
      console.log(error);
      return res.status(400).send(error);
    }
  });
};

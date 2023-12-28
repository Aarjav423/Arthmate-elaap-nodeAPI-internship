bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const moment = require('moment');
const axios = require('axios');
const CompositeDisbursementLog = require('../models/composite-disbursement-log-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/kooliza_disbursement',
    [AccessLog.maintainAccessLog],
    async (req, res) => {
      const objData = {};
      const reqData = req.body;
      try {
        const reqFilename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `CompositeDisbursementLog/${reqData.loan_id}/${reqFilename}.txt`;
        const reqUpload = await s3helper.uploadFileToS3(reqData, reqKey);
        if (!reqUpload)
          throw {
            message: 'error while uploading request data to s3',
          };
        objData.raw_data = reqUpload.Location;
        objData.transaction_id = reqData.txn_id;
        objData.request_type = 'request';
        objData.payment_channel = 'KOOLIZA';
        const CompositeDisbursementLogResp =
          await CompositeDisbursementLog.addNew(objData);
        if (!CompositeDisbursementLogResp)
          throw {
            message: 'Error while adding request log',
          };
        const koolizaData = {
          actionableContext_actualDisbursementData: moment(
            reqData.txn_date,
          ).format('DD MMM YYYY'),
          actionableContext_transactionAmount: reqData.txn_amount,
          actionableContext_isTransactional: 'FALSE',
          actionableContext_paymentTypeId: 'Bank Transfer',
          actionableContext_paymentTypeId2: '',
          targetContext_processDefinitionKey: 'adminMaker_disburseLoan01',
          targetContext_requestType: 'disburse',
          targetContext_clientNumber: '',
          targetContext_loanNumber: reqData.loan_id,
        };
        const config = {
          method: 'post',
          url: process.env.KOOLIZA_DISBURSEMENT_API_URL,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${reqData.token}`,
          },
          data: koolizaData,
        };
        const disburseLoanResp = await axios(config);
        if (disburseLoanResp.data.status !== 200)
          throw {
            message: disburseLoanResp.data.message,
          };
        if (disburseLoanResp) {
          const resFilename =
            Math.floor(10000 + Math.random() * 99999) + '_res';
          const resKey = `CompositeDisbursementLog/${reqData.loan_id}/${resFilename}.txt`;
          const uploadRespData = await s3helper.uploadFileToS3(
            disburseLoanResp,
            resKey,
          );
          if (!uploadRespData)
            throw {
              message: 'Error while uploading response data to s3',
            };
          objData.raw_data = uploadRespData.Location;
          objData.request_type = 'response';
          const CompositeDisbursementResp =
            await CompositeDisbursementLog.addNew(objData);
          if (!CompositeDisbursementResp)
            throw {
              message: 'Error while adding response data to database',
            };
        }
        return res.send(disburseLoanResp.data);
      } catch (error) {
        const errorReponseData = error;
        const errorFilename =
          Math.floor(10000 + Math.random() * 99999) + '_err';
        const errorKey = `CompositeDisbursementLog/${reqData.loan_id}/${errorFilename}.txt`;
        const uploadErrorResp = await s3helper.uploadFileToS3(
          errorReponseData,
          errorKey,
        );
        if (!uploadErrorResp)
          return res.status(400).json({
            message: 'Something went wrong while uploding error data to s3',
          });
        objData.raw_data = uploadErrorResp.Location;
        objData.request_type = 'error';
        const addErrResp = await CompositeDisbursementLog.addNew(objData);
        if (!addErrResp)
          return res.status(400).json({
            message: 'Something went wrong while adding error data to database',
          });
        return res.status(400).send(error);
      }
    },
  );
};

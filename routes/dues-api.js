bodyParser = require('body-parser');
const UsageDues = require('../models/usage-dues-schema.js');
const Product = require('../models/product-schema.js');
const helper = require('../util/helper');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const { check, validationResult } = require('express-validator');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const UsageDue = require('../models/usage-dues-schema');
const CustomDues = require('../models/custom-dues-schema');
let reqUtils = require('../util/req.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/fetch_custom_dues_data',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    [check('loan_id').notEmpty().withMessage('loan_id is required')],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        let where = {};
        let finalData = [];
        const loan_id = req.body.loan_id;
        where.loan_id = loan_id;
        if (req.body.txn_id) where.txn_id = req.body.txn_id;
        const RespBorro = await BorrowerinfoCommon.findOneWithKLID(loan_id);
        if (!RespBorro)
          throw {
            message: 'Error while fetching borrowerinfo data against loan id',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            message: 'This loan id is not associated with selected company',
          };
        if (req.product._id !== RespBorro.product_id)
          throw {
            message: ' This product is not associated with this company.',
          };
        const loanTransactionResp =
          await LoanTransactionSchema.findAllWithCondition(where);
        if (!loanTransactionResp.length)
          throw {
            message: 'No record found.',
          };
        var count = 0;
        req.result = loanTransactionResp;
        custom_due_data(count, finalData, req, res, next);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const custom_due_data = async (count, finalData, req, res, next) => {
  try {
    let records = req.result;
    const dueResp = await CustomDues.findByUsageId(records[count]._id);
    if (!dueResp)
      throw {
        message: 'Error while fetching custom dues data.',
      };
    let duesData = {
      txn_id: records[count].txn_id,
      amount: records[count].txn_amount,
      txn_reference: records[count].txn_reference,
    };
    let custom_dues = {};
    if (dueResp.length) {
      custom_dues = dueResp;
    }
    duesData.dues = custom_dues;
    finalData.push(duesData);
    count++;
    if (count < records.length) {
      custom_due_data(count, finalData, req, res, next);
    } else {
      return res.status(200).send({
        success: true,
        data: finalData,
        loan_id: records[0].loan_id,
      });
    }
  } catch (error) {
    return res.status(400).send(error);
  }
};

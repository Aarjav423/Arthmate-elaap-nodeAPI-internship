const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const jwt = require('../util/jwt');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
let reqUtils = require('../util/req.js');
const borrowerHelper = require('../util/borrower-helper.js');
const middlewares = require('../utils/middlewares');
const payoutDetail = require('../models/payout-detail-schema.js');
const { tdsStatus, refundType } = require('../utils/constant');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const { getFinancialQuarters, getSpecificDay, getFinancialYearQuarterDetails } = require('../utils/financialHelper');
const { uploadFileToS3 } = require('../util/s3helper');
const documentMapping = require('../models/document-mappings-schema.js');

module.exports = (app, connection) => {
  // create tds refund
  app.post('/api/tds_refund', [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct], borrowerHelper.isLoanExistByLID, [check('loan_id').notEmpty().withMessage('loan_id is required'), check('amount').notEmpty().withMessage('amount is required'), check('certificate_number').notEmpty().withMessage('certificate_number is required'), check('financial_year').notEmpty().withMessage('financial_year is required'), check('file_url').notEmpty().withMessage('file_url is required')], async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        throw {
          success: false,
          message: errors.errors[0]['msg'],
        };
      const { amount, loan_id, certificate_number, financial_year, file_url, comment } = req.body;
      //creating key
      const key = `loandocument/tdsdocument/${req.company ? req.company.code : 'COMPANY'}/${req.product.name.replace(/\s/g, '')}/${Date.now()}/tds_certificate.txt`;
      //uploading to bucket
      const s3_data = await uploadFileToS3(file_url, key);
      const loan = req.loanData;
      let data = {
        company_id: req?.company?._id,
        product_id: req?.product?._id,
        loan_app_id: loan.loan_app_id,
        loan_id,
        partner_loan_id: loan.partner_loan_id,
        borrower_id: loan.borrower_id,
        partner_borrower_id: loan.partner_borrower_id,
        type: refundType.TDS_REFUND,
        status: tdsStatus.Open,
        amount,
        reference_year: financial_year,
        certificate_number,
        requestor_comment: comment,
        file_url: s3_data?.Location,
      };

      let requestor_id;
      if (req.authData.type == 'api') {
        requestor_id = req?.company?.name;
      } else {
        requestor_id = req?.user?.email;
      }

      data.requested_by = requestor_id;

      const tds_data = await payoutDetail.create(data);
      if (!tds_data) {
        throw {
          success: false,
          message: 'TDS refund request create failed',
        };
      }
      return res.status(200).send({
        success: true,
        data: tds_data,
        message: 'TDS refund created',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  // tds refund list
  app.get('/api/refund', [jwt.verifyToken, jwt.verifyUser], async (req, res, next) => {
    try {
      const { status, tds_id, company_id, product_id, loan_id, financial_quarter, page, limit,type, loan_app_date, disbursement_date_time } = req.query;
      let doc_code,doc_type;
      let doc_map = {};
      if (type === refundType.TDS_REFUND){
        doc_code ="233";
        doc_type = "tds_certificate";
        doc_map = await documentMapping.getByDocCode(doc_code);
      }

      const filter_status = status.split(',');

      // Initialize an empty filter object
      const filter = {};
      let financialQuarter = {};
      let tds_data = {};
      // Helper function to add properties to the filter only if the value is not null
      const addToFilter = (key, value) => {
        if (value != 'null' && value != undefined && value != null) {
          filter[key] = value;
        }
      };
      // Add properties to the filter using the addToFilter function
      addToFilter('loan_id', loan_id);
      addToFilter('status', filter_status);
      addToFilter('_id', tds_id);
      addToFilter('company_id', company_id);
      addToFilter('product_id', product_id);
      addToFilter('type', type);
      addToFilter('disbursement_date_time', getSpecificDay(disbursement_date_time));
      addToFilter('loan_app_date', getSpecificDay(loan_app_date))
      addToFilter('reference_year', financial_quarter);
      if(type === refundType.INTEREST_REFUND){
        financialQuarter= {};
        tds_data = await payoutDetail.findByConditionWithLimit(filter, page, limit);
      } else if(type === refundType.TDS_REFUND){
        financialQuarter = getFinancialQuarters(new Date('2021-04-01'), new Date());
        tds_data = await payoutDetail.findByConditionWithLimit(filter, page, limit);
      } else {
        tds_data = await payoutDetail.findByConditionWithLimit(filter, page, limit);
      }

      return res.status(200).send({
        success: true,
        data: {
          rows: tds_data.rows,
          count: tds_data.count,
          doc_ext: doc_map ? doc_map[0]?.doc_ext: null,
          financialQuarter,
        },
        message: 'TDS refund list',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //api to update status
  app.patch('/api/tds_refund', [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct], [middlewares.tdsValidateData], async (req, res, next) => {
    try {
      const { comment, tds_request_id, bank_name, ifsc, account_number, utr_number, utr_date, status } = req.body;
      let data;
      if (status == 'Rejected') {
        data = {
          status: tdsStatus.Rejected,
          comment: comment,
          updated_by: req?.user?.email,
        };
      } else if (status == 'Processed') {
        data = {
          status: tdsStatus.Processed,
          comment: comment,
          bank_name,
          bank_ifsc_code: ifsc,
          bank_account_no: account_number,
          utrn_number: utr_number,
          utr_date,
          updated_by: req?.user?.email,
        };
      }
      const tds_data = await payoutDetail.findByIdAndUpdate({ _id: tds_request_id }, data, { new: true });
      const loanExist = await BorrowerinfoCommon.findByCondition({
        loan_id: tds_data.loan_id,
      });
      //get bic data for txn ledger
      let ledger_data = {
        company_id: req.company._id,
        product_id: req.product._id,
        company_name: req?.company?.name,
        txn_date: moment().format('YYYY-MM-DD'),
        txn_entry: 'dr',
        repay_status: '',
        created_by: req?.user?.username,
        action_by: req?.user?.email,
        utr_number: utr_number,
        utr_date_time_stamp: utr_date,
        loan_id: tds_data?.loan_id,
        partner_borrower_id: loanExist?.partner_borrower_id,
        partner_loan_id: loanExist?.partner_loan_id,
        partner_loan_app_id: loanExist?.partner_loan_app_id,
        borrower_id: loanExist?.borrower_id,
        txn_amount: tds_data?.amount,
        label: 'disbursement',
        label_type: tds_data?.type,
        account_number: tds_data?.bank_account_no,
        bank_name: tds_data?.bank_name,
        is_received: 'Y',
        processed: 'Y',
      };
      if (!tds_data) {
        throw {
          success: false,
          message: 'TDS refund request update failed',
        };
      }
      if (status === 'Processed') {
        await LoanTransactionLedgerSchema.create(ledger_data);
      }
      return res.status(200).send({
        success: true,
        data: tds_data,
        message: 'TDS refund updated',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

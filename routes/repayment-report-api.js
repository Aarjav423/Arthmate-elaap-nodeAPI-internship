const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const CPUHelper = require('../util/company-product-user-helper.js');
const disbursementReportHelper = require('../util/report');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
var XLSX = require('xlsx');
var json2xls = require('json2xls');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fecth generated report records
  app.get(
    '/api/repayment_reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const repaymentReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'repayment',
          company_id,
        );
        if (!repaymentReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for reapyment reports',
          };
        return res.status(200).send(repaymentReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated repayment report
  app.get(
    '/api/download-repayment-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const repaymentReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!repaymentReportResp)
          throw {
            success: false,
            message: 'No record found for repayment report.',
          };
        const url = repaymentReportResp.s3_url.substring(
          repaymentReportResp.s3_url.indexOf('repayment'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `repaymentReport${Date.now()}.xlsx`;
        const downloadedFileResp = await fs.writeFile(
          filename,
          reportFromS3Resp,
        );
        var workbook = XLSX.readFile(`./${filename}`, {
          dateNF: 'yyyy-mm-dd',
        });
        var ws = workbook.Sheets['Sheet 1'];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });
        const UnlinkXls = await fs.unlink(
          path.join(__dirname, `../${filename}`),
        );
        return res.status(200).send(data);  
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate report
  app.post(
    '/api/repayment-report',
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('from_date')
        .notEmpty()
        .withMessage('from_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid from_date in YYYY-MM-DD format'),
      check('to_date')
        .notEmpty()
        .withMessage('to_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid to_date in YYYY-MM-DD format'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompanyForAllPartners,
      CPUHelper.getCompanies,
      CPUHelper.getProducts,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        if (data.from_date && data.to_date) {
          let fromDate = moment(data.from_date, 'YYYY-MM-DD');
          let toDate = moment(data.to_date, 'YYYY-MM-DD');
          if (data.from_date && data.to_date) {
            // Validate from date should not be greater than to date
            if (toDate.isBefore(fromDate))
              throw {
                success: false,
                message: 'from_date should be less than to_date',
              };
            // Validate difference between from_date and to_date should be maximum one year

            if (
              data.company_id === '00' &&
              data.product_id === 0 &&
              toDate.diff(fromDate, 'days') >=
                process.env.MAXIMUM_DATE_RANGE_REPORT_REPAYMENT
            ) {
              throw {
                success: false,
                message: `Reports for more than ${process.env.MAXIMUM_DATE_RANGE_REPORT_REPAYMENT} days are not allowed for All Partner report, Kindly contact support team for further assistance `,
              };
            }
            if (
              toDate.diff(fromDate, 'days') >=
                process.env.MAXIMUM_DATE_RANGE_REPORT
            ) {
              throw {
                success: false,
                message: `Reports for more than ${process.env.MAXIMUM_DATE_RANGE_REPORT} days are not allowed for All Partner report, Kindly contact support team for further assistance `,
              };
            }
          }
        }
        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }

        // Fetch repayment records according to the filters
        const repaymentRecords =
          await LoanTransactionLedgerSchema.getFilteredRepaymentRecords(data);
        if (!repaymentRecords.length)
          throw {
            success: false,
            message: 'No repayment records found against provided filter',
          };
        let loanIds = [];
        Array.from(repaymentRecords).map((item) => {
          loanIds.push(item.loan_id);
        });

        loanIds = [...new Set(loanIds)];

        const borrowerInfos = await BorrowerinfoCommon.findKLIByIds(loanIds);
        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No borrower records found against provided loan ids',
          };
        const repaymentRecordFields = [];
        Array.from(borrowerInfos).forEach((borrowerInfo) => {
          repaymentRecords.forEach((record) => {
            if (borrowerInfo.loan_id === record.loan_id) {
              repaymentRecordFields.push({
                'Partner Name': req.companies.filter(
                  (company) => company._id === borrowerInfo.company_id,
                )[0].name,
                'Product Name': req.products.filter(
                  (product) => product._id === borrowerInfo.product_id,
                )[0].name,
                'Loan app id': borrowerInfo.loan_app_id || '',
                'Loan id': record.loan_id || '',
                'Borrower id': borrowerInfo.borrower_id || '',
                'Partner loan id': record.partner_loan_id || '',
                'Transaction Reference': record.txn_reference || '',
                'Transaction Reference Date Time': getFormattedDateTime(record.txn_reference_datetime) || '',
                'UTR number': record.utr_number || '',
                'UTR date time stamp':
                  getFormattedDateTime(record.utr_date_time_stamp) || '',
                'TXN amount': record.txn_amount || '',
                Label: record.label || '',
                'Record method': record.record_method || '',
                'Payment mode': record.payment_mode || '',
                'Created at': getFormattedDateTime(record.created_at) || '',
                'Approval status':
                  record.is_received == null
                    ? 'Pending Approval'
                    : record.is_received === 'Y'
                    ? 'Approved'
                    : record.is_received,
                'Collection Bank Account Number':record.coll_bank_acc_number||'',
                'Collection Bank Name' :record.coll_bank_name ||'',  
              });
            }
          });
        });
        let fields = [
          'Partner Name',
          'Product Name',
          'Loan app id',
          'Loan id',
          'Borrower id',
          'Partner loan id',
          'Transaction Reference',
          'Transaction Reference Date Time',
          'UTR number',
          'UTR date time stamp',
          'TXN amount',
          'Label',
          'Record method',
          'Payment mode',
          'Created at',
          'Approval status',
          'Collection Bank Account Number',
          'Collection Bank Name'
        ];

        // Convert json to excel structure
        const xls = json2xls(repaymentRecordFields, { fields: fields });

        //Generate file name according to provided filter
        let fileName = `RepaymentConfirmation_${req?.company?.code}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date}_${data.to_date}.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        const filePathInS3 = `repayment/${req?.company?.code}/${
          data.product_id ? data.product_id : 'all'
        }/${data.from_date}_${data.to_date}.xlsx`;
        const uploadFileToS3 = await disbursementReportHelper.uploadXlsxToS3(
          localFilePath,
          filePathInS3,
        );

        if (!uploadFileToS3)
          throw {
            success: false,
            message: 'Error while uploading report to s3',
          };
        //Unlink file by file_name very important
        const UnlinkXls = await fs.unlink(`./${localFilePath}`);
        // Record generated report in report_storage table
        let reportData = {
          file_name: localFilePath,
          requested_by_name: req.user.username,
          requested_by_id: req.user._id,
          s3_url: uploadFileToS3.Location,
          company_name: req.company?.name || 'All company',
          company_code: req.company?.code || 'All company',
          product_name: data.product_id ? productResp.name : '',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'repayment',
          from_date: data.from_date,
          to_date: data.to_date,
        };
        const recordGenereatedReport =
          await disbursementReportHelper.recordGenereatedReport(reportData);
        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated report',
          };
        return res.status(200).send({
          message: 'Repayment report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
  );
};

function getFormattedDateTime(date) {
  if (!date instanceof Date) {
    return ''
  }
  return  date.toISOString().replace('T',' ').split('.')[0]
}
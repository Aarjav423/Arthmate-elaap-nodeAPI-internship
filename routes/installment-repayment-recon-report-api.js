const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanStateAuditSchema = require('../models/loan-state-audit-schema.js');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to download generated repayment report
  app.get(
    '/api/download-installment-repayment-recon-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const reportResp = await ReportStorageSchema.findById(req.params.id);
        if (!reportResp)
          throw {
            success: false,
            message:
              'No records found for recon repayment and installment reports',
          };
        const url = reportResp.s3_url.substring(
          reportResp.s3_url.indexOf('recon-instalment-repayment'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `ReconRepayAndInstallmentsReports${Date.now()}.xlsx`;
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

  //Api to fecth generated report records
  app.get(
    '/api/installment-repayment-recon-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const reportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'recon-instalment-repayment',
          company_id,
        );
        if (!reportsResp.rows.length)
          throw {
            success: false,
            message:
              'No records found for recon repayment and installment reports',
          };
        return res.status(200).send(reportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate report
  app.post(
    '/api/installment-repayment-recon-report',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('product_id').notEmpty().withMessage('product_id is required'),
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

        // Validate company_id and product_id in authorization
        if (data.company_id && data.company_id != req.company._id)
          throw { success: false, message: 'company_id mismatch' };

        // Validate from_date and to_date
        if (data.from_date || data.to_date) {
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
            let Days = toDate.diff(fromDate, 'days');
            if (Days > process.env.MAXIMUM_DATE_RANGE_REPORT) {
              throw {
                success: false,
                message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT} days`,
              };
            }
          }
        }
        // Fetch installment repayment recon records according to the filters
        const loanStateAuditResp =
          await LoanStateAuditSchema.getFilteredLoanStateAuditResp(data);
        if (!loanStateAuditResp.length)
          throw {
            success: false,
            message:
              'No installment and repayment records found against provided filter.',
          };

        let loanIds = [];
        Array.from(loanStateAuditResp).map((item) => {
          loanIds.push(item.loan_id);
        });

        loanIds = [...new Set(loanIds)];
        const borrowerResp = await BorrowerinfoCommon.findKLIByIds(loanIds);

        if (!borrowerResp.length)
          throw {
            success: false,
            message: 'No borrower records found against provided loan ids',
          };

        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }

        const reconInstallmentRepaymentFields = [];

        Array.from(borrowerResp).forEach((borrowerInfo) => {
          loanStateAuditResp.forEach((record) => {
            if (borrowerInfo.loan_id == record.loan_id) {
              reconInstallmentRepaymentFields.push({
                'Partner loan id': borrowerInfo.partner_loan_id || '',
                'Loan id': record.loan_id || '',
                'Installment Number': record.intsalment_num || '',
                'Installment Amount Due': record.amount_due || '',
                'Principal Due': record.prin_due || '',
                'Interest Due': record.int_due || '',
                'LPI Due': record.lpi_due || '',
                'Due Date': record.due_date || '',
                'Principal Paid': record.prin_paid || '',
                'Interest Paid': record.int_paid || '',
                'LPI Paid': record.lpi_paid || '',
                'Paid Date': record.paid_date || '',
                Status: record.status || '',
                Payments: JSON.stringify(record.payments) || '',
              });
            }
          });
        });
        let fields = [
          'Partner loan id',
          'Loan id',
          'Installment Number',
          'Installment Amount Due',
          'Principal Due',
          'Interest Due',
          'LPI Due',
          'Due Date',
          'Principal Paid',
          'Interest Paid',
          'LPI Paid',
          'Paid Date',
          'Status',
          'Payments',
        ];

        // Convert json to excel structure
        const xls = json2xls(reconInstallmentRepaymentFields, {
          fields: fields,
        });

        //Generate file name according to provided filter
        let fileName = `ReconRepayAndInstallments_${req?.company?.code}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date}_${data.to_date}.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        const filePathInS3 = `recon-instalment-repayment/${
          req?.company?.code
        }/${data.product_id ? data.product_id : 'all'}/${data.from_date}_${
          data.to_date
        }.xlsx`;
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
          company_name: req.company.name,
          company_code: req.company.code,
          product_name: data.product_id ? productResp.name : '',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'recon-instalment-repayment',
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
          message: 'Recon installment repayment report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

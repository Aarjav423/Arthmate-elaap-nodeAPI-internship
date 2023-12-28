const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const CPUHelper = require('../util/company-product-user-helper.js');
const moment = require('moment');
const s3helper = require('../util/s3helper');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema');
const ProductSchema = require('../models/product-schema');
const LoanTransactionLedger = require('../models/loan-transaction-ledger-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const LoanRequestSchema = require('../models/loan-request-schema');
const disbursementReportHelper = require('../util/report');
const fs = require('fs').promises;
var json2xls = require('json2xls');
var XLSX = require('xlsx');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/refund-transaction-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;

        const refundReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'refund',
          company_id,
        );
        if (!refundReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for refund reports',
          };
        return res.status(200).send(refundReportsResp);
      } catch (error) {
        console.log('/api/refund-transaction-report/:page/:limit error', error);
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/download-refund-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const refundReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!refundReportResp)
          throw {
            success: false,
            message: 'No record found for disbursement report.',
          };

        const url = refundReportResp.s3_url.substring(
          refundReportResp.s3_url.indexOf('refund'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `refundReport${Date.now()}.xlsx`;
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
        console.log('/api/download-refund-report/:id error', error);
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate report
  app.post(
    '/api/generate-refund-transaction-report',
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
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
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
        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }
        // Fetch refund records according to the filters
        const refundRecords =
          await LoanTransactionLedger.getFilteredRefundRecords(data);
        if (!refundRecords.length)
          throw {
            success: false,
            message: 'No refund records found against provided filter',
          };

        let loanIds = [];
        Array.from(refundRecords).map((item) => {
          loanIds.push(item.loan_id);
        });

        loanIds = [...new Set(loanIds)];

        const borrowerInfos = await BorrowerinfoCommon.findKLIByIds(loanIds);

        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No borrow records found against provided loan ids',
          };

        const leads = await LoanRequestSchema.findByLoanIds(loanIds);
        let leadsObject = {};
        Array.from(leads).forEach((row) => {
          leadsObject[row.loan_id] = row;
        });

        const reportPayload = [];

        Array.from(refundRecords).forEach((refundRecord) => {
          Array.from(borrowerInfos).forEach((borrowerInfo) => {
            if (refundRecord.loan_id === borrowerInfo.loan_id) {
              reportPayload.push({
                'Partner Name': req.companies.filter(
                  (company) => company._id === borrowerInfo.company_id,
                )[0].name,
                'Product Name': req.products.filter(
                  (product) => product._id === borrowerInfo.product_id,
                )[0].name,
                'Loan id': refundRecord.loan_id || '',
                'Customer name':
                  (borrowerInfo.first_name || '') +
                  ' ' +
                  (borrowerInfo.last_name || ''),
                'Refund amount': refundRecord.refund_amount || '',
                'Borrower Bank Account': borrowerInfo.bene_bank_acc_num || '',
                'Borrower Bank IFSC': borrowerInfo.bene_bank_ifsc || '',
                'Refund Initiated on': refundRecord.initiated_at || '',
                'Refund Completed on':
                  refundRecord.disbursement_date_time || '',

                'Refund Type': refundRecord.label_type || '',
              });
            }
          });
        });
        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: [
            'Partner Name',
            'Product Name',
            'Loan id',
            'Customer name',
            'Refund amount',
            'Borrower Bank Account',
            'Borrower Bank IFSC',
            'Refund Initiated on',
            'Refund Completed on',
            'Refund Type',
          ],
        });

        //Generate file name according to provided filter
        let fileName = `RefundConfirmation_${
          req?.company?.code ? req?.company?.code : 'all_partners'
        }_${data.product_id ? data.product_id : 'all_products'}_${
          data.from_date
        }_${data.to_date}.xlsx`;

        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        let filePathInS3;

        if (req?.company?.code) {
          // upload generated report to S3
          filePathInS3 = `refund/${req?.company?.code}/${
            data.product_id ? data.product_id : 'all_products'
          }/${data.from_date}_${data.to_date}.xlsx`;
        } else {
          // upload generated report to S3
          filePathInS3 = `refund/all_products_${
            data.product_id ? data.product_id : 'all_products'
          }_${data.from_date}_${data.to_date}.xlsx`;
        }

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
          company_name: req.company?.name ? req.company?.name : 'All partner',
          company_code: req.company?.code ? req.company?.code : '',
          product_name: data.product_id ? productResp?.name : 'All product',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'refund',
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
          message: 'Refund report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const InsuranceMisSchema = require('../models/insurance-mis-schema.js');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to download generated repayment report
  app.get(
    '/api/download-insurance-billing-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const reportResp = await ReportStorageSchema.findById(req.params.id);
        if (!reportResp)
          throw {
            success: false,
            message: 'No records found for insurance billing reports',
          };
        const url = reportResp.s3_url.substring(
          reportResp.s3_url.indexOf('insurance-billing-records'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `InsuranceBillingReports${Date.now()}.xlsx`;
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

  //Api to fetch generated report records
  app.get(
    '/api/insurance-billing-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const insuranceBillingReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'insurance-billing-records',
            company_id,
          );
        if (!insuranceBillingReportsResp.rows.length)
          throw {
            success: false,
            message: 'No records found for insurance billing reports',
          };
        return res.status(200).send(insuranceBillingReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate report
  app.post(
    '/api/insurance-billing-report',
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
        const insuranceMisResp =
          await InsuranceMisSchema.getFilteredInsuranceMisResp(data);
        if (!insuranceMisResp.length)
          throw {
            success: false,
            message:
              'No insurance billing records found against provided filter',
          };
        let loanIds = [];
        Array.from(insuranceMisResp).map((item) => {
          loanIds.push(item.loan_id);
        });
        loanIds = [...new Set(loanIds)];
        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }

        const insuranceBillingReportFields = [];

        insuranceMisResp.forEach((record) => {
          insuranceBillingReportFields.push({
            'Loan id': record.loan_id || '',
            'Policy Number': record.policy_number || '',
            'Master Policy Number': record.master_policy_number || '',
            'Policy Issuance Date':
              moment(record.policy_issuance_date).format('YYYY-MM-DD') || '',
            'Policy Start Date':
              moment(record.policy_start_date).format('YYYY-MM-DD') || '',
            'Policy End Date':
              moment(record.policy_end_date).format('YYYY-MM-DD') || '',
            'Total Policy Premium': record.policy_premium || '',
            'GST on Premium': record.gst_on_premium || '',
            'Net Policy Premium': record.net_premium || '',
            'Total Policy Premium @ Base Pricing':
              record.total_policy_premium_at_base_pricing || '',
            'GST on Premium @ Base pricing':
              record.gst_on_premium_at_base_pricing || '',
            'Net Policy Premium @ Base Pricing':
              record.net_policy_premium_at_base_pricing || '',
          });
        });

        let fields = [
          'Loan id',
          'Policy Number',
          'Master Policy Number',
          'Policy Issuance Date',
          'Policy Start Date',
          'Policy End Date',
          'Total Policy Premium',
          'GST on Premium',
          'Net Policy Premium',
          'Total Policy Premium @ Base Pricing',
          'GST on Premium @ Base pricing',
          'Net Policy Premium @ Base Pricing',
        ];

        // Convert json to excel structure
        const xls = json2xls(insuranceBillingReportFields, { fields: fields });

        //Generate file name according to provided filter
        let fileName = `InsuranceBillingReport_${req?.company?.code}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date}_${data.to_date}.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        const filePathInS3 = `insurance-billing-records/${req?.company?.code}/${
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
          company_name: req.company.name,
          company_code: req.company.code,
          product_name: data.product_id ? productResp.name : '',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'insurance-billing-records',
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
        if (recordGenereatedReport) {
          return res.status(200).send({
            success: true,
            message: 'insurance billing record report generated successfully.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

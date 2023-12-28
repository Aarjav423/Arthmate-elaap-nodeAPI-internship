const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fecth generated subvention invoice report records
  app.get(
    '/api/subvention-invoice-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const subventionInvoicReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'subvention_invoice',
            company_id,
          );
        if (!subventionInvoicReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for subvention invoice reports',
          };
        return res.status(200).send(subventionInvoicReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated subvention invoice report
  app.get(
    '/api/download-subvention-invoice-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const subventionInvoiceReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!subventionInvoiceReportResp)
          throw {
            success: false,
            message: 'No record found for subvention invoice report.',
          };
        const url = subventionInvoiceReportResp.s3_url.substring(
          subventionInvoiceReportResp.s3_url.indexOf('subvention_invoice'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `subventionInvoiceReport${Date.now()}.xlsx`;
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

  // Api to generate subvention invoice report
  app.post(
    '/api/subvention-invoice-report',
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
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        if (data.company_id && data.company_id != req.company._id)
          throw { success: false, message: 'company_id mismatch' };
        //validate the data in api payload
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
        let date;
        if (data.from_date) {
          date = new Date(data.from_date);
          date = date.setHours(0, 0, 0, 0);
          date = moment(date).format('YYYY-MM-DD HH:mm:ss');
          data.fromDate = date;
        }
        if (data.to_date) {
          date = new Date(data.to_date);
          date = date.setHours(23, 59, 59, 999);
          date = moment(date).format('YYYY-MM-DD HH:mm:ss');
          data.toDate = date;
        }
        // Fetch disbursement records according to the filters
        const subventionInvoiceRecords =
          await BorrowerinfoCommon.getFilteredSubventionInvoiceRecords(data);
        if (!subventionInvoiceRecords.length)
          throw {
            success: false,
            message:
              'No subvention invoice records found against provided filter',
          };

        let loanIds = [];
        Array.from(subventionInvoiceRecords).map((item) => {
          loanIds.push(item.loan_id);
        });
        loanIds = [...new Set(loanIds)];
        const reportPayload = [];
        Array.from(subventionInvoiceRecords).forEach(
          (subventionInvoiceRecord) => {
            reportPayload.push({
              'Loan app id': subventionInvoiceRecord.loan_app_id,
              'Loan id': subventionInvoiceRecord.loan_id,
              'Sanction amount': subventionInvoiceRecord.sanction_amount || '',
              'Subventor name': subventionInvoiceRecord.subventor_name || '',
              'Subventor GST': subventionInvoiceRecord.subventor_gst || '',
              'Subventor address line 1':
                subventionInvoiceRecord.subventor_addr_ln1 || '',
              'Subventor address line 2':
                subventionInvoiceRecord.subventor_addr_ln2 || '',
              'Subventor City':
                subventionInvoiceRecord.subventor_addr_city || '',
              'Subventor state':
                subventionInvoiceRecord.subventor_addr_state || '',
              'Subventor pincode':
                subventionInvoiceRecord.subventor_addr_pincode || '',
              'Subvention fees amount':
                subventionInvoiceRecord.subvention_fees_amount || '',
              'GST on Subvention Fees':
                subventionInvoiceRecord.gst_on_subvention_fees || '',
            });
          },
        );

        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: [
            'Loan app id',
            'Loan id',
            'Sanction amount',
            'Subventor name',
            'Subventor GST',
            'Subventor address line 1',
            'Subventor address line 2',
            'Subventor City',
            'Subventor state',
            'Subventor pincode',
            'Subvention fees amount',
            'GST on Subvention Fees',
          ],
        });

        //Generate file name according to provided filter
        let fileName = `SubventionInvoice_${req?.company?.code}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date}_${data.to_date}.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        const filePathInS3 = `subvention_invoice/${req?.company?.code}/${
          data.product_id ? data.product_id : 'all'
        }/${data.from_date}_${data.to_date}.xlsx`;
        const uploadFileToS3 = await disbursementReportHelper.uploadXlsxToS3(
          localFilePath,
          filePathInS3,
        );

        if (!uploadFileToS3)
          throw {
            success: false,
            message: 'Error while uploading subvention invoice report to s3',
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
          report_name: 'subvention_invoice',
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
          message: 'Subvention invoice report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );
};

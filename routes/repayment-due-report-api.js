const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const RepaymentDueSchema = require('../models/repayment-installment-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fetch generated report records
  app.get(
    '/api/repayment_due_reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const repaymentDueReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'repayment_due',
            company_id,
          );
        if (!repaymentDueReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for repayment due reports',
          };
        return res.status(200).send(repaymentDueReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated due report
  app.get(
    '/api/download-repayment-due-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const repaymentDueReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!repaymentDueReportResp)
          throw {
            success: false,
            message: 'No record found for repayment due report.',
          };
        const url = repaymentDueReportResp.s3_url.substring(
          repaymentDueReportResp.s3_url.indexOf('repayment_due'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `repaymentDueReport${Date.now()}.xlsx`;
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
    '/api/repayment-due-report',
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
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
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
        // Fetch disbursement records according to the filters
        const repaymentDueRecords =
          await RepaymentDueSchema.getFilteredRepaymentDueRecords(data);
        if (!repaymentDueRecords.length)
          throw {
            success: false,
            message: 'No repayment due records found against provided filter',
          };

        let loanIds = [];
        Array.from(repaymentDueRecords).map((item) => {
          loanIds.push(item.loan_id);
        });
        loanIds = [...new Set(loanIds)];

        const borrowerInfos =
          await BorrowerinfoCommon.findActiveLoansByIds(loanIds);
        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No borrow records found against provided loan ids',
          };

        const reportPayload = [];
        Array.from(repaymentDueRecords).forEach((repaymentDueRecord) => {
          Array.from(borrowerInfos).forEach((borrowerInfo) => {
            if (repaymentDueRecord.loan_id === borrowerInfo.loan_id) {
              reportPayload.push({
                'Partner loan id': borrowerInfo.partner_loan_id || '',
                'Loan id': repaymentDueRecord.loan_id || '',
                'Opening principal':
                  repaymentDueRecord.principal_outstanding || '',
                'Installment number': repaymentDueRecord.emi_no || '',
                'Due date':
                  moment(repaymentDueRecord.due_date).format('YYYY-MM-DD') ||
                  '',
                'Due amount': repaymentDueRecord.emi_amount || '',
                Principal: repaymentDueRecord.prin || '',
                Interest: repaymentDueRecord.int_amount || '',
                'Closing principal': repaymentDueRecord.principal_bal || '',
                'Creation date': borrowerInfo.disbursement_date_time || '',
              });
            }
          });
        });

        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: [
            'Partner loan id',
            'Loan id',
            'Opening principal',
            'Installment number',
            'Due date',
            'Due amount',
            'Principal',
            'Interest',
            'Closing principal',
            'Creation date',
          ],
        });

        //Generate file name according to provided filter
        let fileName = `RepaymentDue_${req?.company?.code}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date}_${data.to_date}.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        const filePathInS3 = `repayment_due/${req?.company?.code}/${
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
          report_name: 'repayment_due',
          from_date: data.from_date,
          to_date: data.to_date,
        };
        const recordGenereatedReport =
          await disbursementReportHelper.recordGenereatedReport(reportData);
        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated due report',
          };
        return res.status(200).send({
          message: 'Repayment due report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

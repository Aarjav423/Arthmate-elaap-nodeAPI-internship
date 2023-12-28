const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const CPUHelper = require('../util/company-product-user-helper.js');
const moment = require('moment');
const s3helper = require('../util/s3helper');
const BorrowerInfoCommon = require('../models/borrowerinfo-common-schema');
const ProductSchema = require('../models/product-schema');
const IssuePolicyStagingSchema = require('../models/issue-policy-staging-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const disbursementReportHelper = require('../util/report');
const fs = require('fs').promises;
var json2xls = require('json2xls');
var XLSX = require('xlsx');
const {
  generateInsuranceReportData,
  insuranceReportFields,
} = require('../util/insurance-policy-report-data');
const RepaymentInstallment = require('../models/repayment-installment-schema');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  // Get list of generated reports against report type insurance
  app.get(
    '/api/insurance-transaction-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;

        const insuranceReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'insurance',
          company_id,
        );
        if (!insuranceReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for insurance reports',
          };
        return res.status(200).send(insuranceReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  // Download specific generated report by id
  app.get(
    '/api/download-insurance-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const insuranceReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!insuranceReportResp)
          throw {
            success: false,
            message: 'No record found for insurance report.',
          };
        const url = insuranceReportResp.s3_url.substring(
          insuranceReportResp.s3_url.indexOf('insurance'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `insuranceReport${Date.now()}.xlsx`;
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
    '/api/generate-insurance-transaction-report',
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
            // Validate difference between from_date and to_date should be between seven days
            
            if (data.company_id == "00" && data.product_id == 0 ){
              if (toDate.diff(fromDate, 'days') >= process.env.MAXIMUN_DATE_RANGE_ALL_PRODUCTS_REPORT) {
                throw {
                  success: false,
                  message: `from_date and to_date should be within ${process.env.MAXIMUN_DATE_RANGE_ALL_PRODUCTS_REPORT} days`,
                };
              }
            }
            if (
              toDate.diff(fromDate, 'days') >=
              process.env.MAXIMUM_DATE_RANGE_REPORT_INSURANCE
            ) {
              throw {
                success: false,
                message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT_INSURANCE} days`,
              };
            }
          }
        }
        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }
        let loanIds = [];
        const borrowerInfos =
          await BorrowerInfoCommon.getActiveLoansByDisbursementDateTime({
            from_date: data.from_date,
            to_date: data.to_date,
            company_id: data.company_id,
            product_id: data.product_id,
          });
        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No borrower records found against provided loan ids',
          };
        borrowerInfos.map((item) => {
          loanIds.push(item.loan_id);
        });

        loanIds = [...new Set(loanIds)];
        // Fetch insurance records according to the filters
        const insuranceRecords =
          await IssuePolicyStagingSchema.getRecordsLoanIds(loanIds);
        if (!insuranceRecords.length)
          throw {
            success: false,
            message: 'No insurance records found against provided filter',
          };

        let insuranceRecordsList = JSON.parse(
          JSON.stringify(Array.from(insuranceRecords)),
        );

        // Fetch all repayment installments against fetched unique loanIds in issue policy collection
        const repaymentInstallmentsByLoanIds =
          await RepaymentInstallment.getRecordsLoanIds(loanIds);
        let reportPayload = [];

        // Iterate through received records from issue policy staging collection
        insuranceRecordsList.forEach(async (insuranceRecord) => {
          //Filter out exact matching BIC record to generate the report row
          const BICData = borrowerInfos.filter(
            (bi) => bi.loan_id === insuranceRecord.loan_id,
          )[0];
          // Filter out exact matching EMI installments to generate the report row
          let repaymentInstallmentsData = repaymentInstallmentsByLoanIds
            .filter((item) => item.loan_id === insuranceRecord.loan_id)
            .sort((a, b) => {
              return b.emi_no - a.emi_no;
            });
          // Generate final record to be inserted in object
          if (BICData.stage === 4)
            reportPayload.push(
              generateInsuranceReportData(
                insuranceRecord,
                BICData,
                repaymentInstallmentsData,
              ),
            );
        });
        if (!reportPayload.length)
          throw {
            success: false,
            message:
              'No insurance records found against provided filter with loan status active ',
          };
        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: insuranceReportFields,
        });

        //Generate file name according to provided filter
        let fileName = `Insurance_${
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

        // upload generated report to S3
        filePathInS3 = `insurance/${
          req?.company?.code ? req?.company?.code : 'all_company'
        }/${data.product_id ? data.product_id : 'all_products'}/${
          data.from_date
        }_${data.to_date}.xlsx`;

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
        await fs.unlink(`./${localFilePath}`);
        // Record generated report in report_storage table
        let reportData = {
          file_name: localFilePath,
          requested_by_name: req.user.username,
          requested_by_id: req.user._id,
          s3_url: uploadFileToS3.Location,
          company_name: req.company?.name ? req.company?.name : 'All partner',
          company_code: req.company?.code ? req.company?.code : '',
          product_name: data.product_id ? productResp?.name : 'All product',
          product_id: data.product_id ? data.product_id : '0',
          company_id: data.company_id ? data.company_id : '0',
          report_name: 'insurance',
          from_date: data.from_date || 'NA',
          to_date: data.to_date || 'NA',
        };
        const recordGenereatedReport =
          await disbursementReportHelper.recordGenereatedReport(reportData);
        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated report',
          };
        return res.status(200).send({
          message: 'Insurance report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

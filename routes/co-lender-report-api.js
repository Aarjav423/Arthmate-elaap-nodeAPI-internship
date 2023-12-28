const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const s3helper = require('../util/s3helper');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const ColendLoanTransactionSummary = require('../models/co-lend-transaction-summary-schema.js');
const fs = require('fs').promises;
var XLSX = require('xlsx');
var json2xls = require('json2xls');
/**
 * Exporting Bank File Upload/Download API
 * @param {*} app
 * @param {*} connection
 * @return {*} Report Details
 * @throws {*} No Disbursement Record Found
 */
module.exports = (app, conn) => {
  app.get(
    '/api/co-lender-disbursement-reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const coLenderPreDisbursementReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'co-lender-pre-disbursement',
          );
        if (!coLenderPreDisbursementReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for co-lender pre disbursement reports',
          };
        return res.status(200).send(coLenderPreDisbursementReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  app.get(
    '/api/co-lender-download-disbursement-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const disbursementReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!disbursementReportResp)
          throw {
            success: false,
            message: 'No record found for disbursement report.',
          };
        const url = disbursementReportResp.s3_url.substring(
          disbursementReportResp.s3_url.indexOf(
            'CoLenderDisbursalApprovalLoanData',
          ),
        );
        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `CoLenderDisbursalApprovalLoanData${Date.now()}.xlsx`;
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
  app.post(
    '/api/co-lender-escrow-disbursement-report',
    [
      check('co_lender_id').notEmpty().withMessage('Colender name is required'),
      check('from_date')
        .notEmpty()
        .withMessage('From Date Is Required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid from_date in YYYY-MM-DD format'),
      check('to_date')
        .notEmpty()
        .withMessage('To Date Is Required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid to_date in YYYY-MM-DD format'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        if (!data.from_date || !data.to_date) {
          throw {
            success: false,
            message: 'from_date and to_date are required',
          };
        }
        let fromDate = moment(data.from_date);
        let toDate = moment(data.to_date);
        if (fromDate > toDate) {
          throw {
            success: false,
            message: 'from_date should be less than to_date',
          };
        }
        let days = toDate.diff(fromDate, 'days');
        if (days > process.env.MAXIMUM_DATE_RANGE_REPORT) {
          throw {
            success: false,
            message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT} days`,
          };
        }
        if (data.co_lender_id === '-1') {
          data.co_lender_id = '';
        }
        var originalToDate = data.to_date;
        data.to_date = data.to_date + 'T23:59:59.999+00:00';
        const filteredDateCoLenderDisbursalApprovalData =
          await BorrowerinfoCommon.getFilteredCoLenderDisbursementData(data);
        data.filtered_data = filteredDateCoLenderDisbursalApprovalData;
        data.to_date = originalToDate;
        const coLenderDisbursalApprovalFile =
          await generateCoLenderDisbursalApprovalFile(req, data);
        return res.status(200).send({
          message: 'Co-lender pre disbursement report generated successfully.',
          data: coLenderDisbursalApprovalFile,
        });
      } catch (e) {
        return res.status(400).send(e);
      }
    },
  );

  app.post(
    '/api/co-lender-repayment-list',
    [check('page').notEmpty().withMessage('page is reqquired')],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        let query = {};
        if (data.stage !== '-1') {
          query.stage = data.stage;
        }
        if (data.co_lender_id) {
          query.co_lender_id = data.co_lender_id;
        }
        if (data.from_date && data.to_date) {
          let fromDate = moment(data.from_date);
          let toDate = moment(data.to_date);
          if (fromDate > toDate) {
            throw {
              success: false,
              message: 'from_date should be less than to_date',
            };
          }
          let days = toDate.diff(fromDate, 'days');
          if (days > process.env.MAXIMUM_DATE_RANGE_REPORT) {
            throw {
              success: false,
              message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT} days`,
            };
          }
          data.to_date = data.to_date + 'T23:59:59.999+00:00';
          query.$and = [
            { created_at: { $gte: new Date(data.from_date) } },
            { created_at: { $lte: new Date(data.to_date) } },
          ];
        }
        let rows =
          await ColendLoanTransactionSummary.findAllCoLenderTransactionSummary(
            query,
          );
        const response = {
          rows: rows.slice(
            data.page * (!data.rowPerPage ? 10 : data.rowPerPage),
            (data.page + 1) * (!data.rowPerPage ? 10 : data.rowPerPage),
          ),
          count: rows.length,
        };

        return res.status(200).send(response);
      } catch (e) {
        return res.status(400).send(e);
      }
    },
  );

  app.post(
    '/api/co-lender-repayment-report',
    [
      check('co_lender_id').notEmpty().withMessage('Colender name is required'),
      check('from_date')
        .notEmpty()
        .withMessage('From Date Is Required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid from_date in YYYY-MM-DD format'),
      check('to_date')
        .notEmpty()
        .withMessage('To Date Is Required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid to_date in YYYY-MM-DD format'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        if (!data.from_date || !data.to_date) {
          throw {
            success: false,
            message: 'from_date and to_date are required',
          };
        }
        let fromDate = moment(data.from_date);
        let toDate = moment(data.to_date);
        if (fromDate > toDate) {
          throw {
            success: false,
            message: 'from_date should be less than to_date',
          };
        }
        let days = toDate.diff(fromDate, 'days');
        if (days > process.env.MAXIMUM_DATE_RANGE_REPORT) {
          throw {
            success: false,
            message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT} days`,
          };
        }
        data.to_date = data.to_date + 'T23:59:59.999+00:00';
        toDate = moment(data.to_date);
        const pagingData =
          await ReportStorageSchema.getCoLenderRepaymentReports({
            co_lender_id: data.co_lender_id,
            report_name: 'co-lender-repayment-report',
          });
        let response = [];
        pagingData
          .filter((ele) => {
            return moment(ele.created_at).isBetween(fromDate, toDate);
          })
          .map((ele) => {
            response.push(ele);
          });
        if (response.length === 0) {
          throw {
            success: false,
            message: 'No data found',
          };
        }
        return res.status(200).send(response);
      } catch (err) {
        return res.status(400).send(err);
      }
    },
  );

  app.post(
    '/api/download-co-lender-repayment-summary',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        //Fetch data from S3 by url
        let url = req.body?.s3_url;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const result = url.match(regex);
        const colenderBucketName = result[1];
        if (!result) {
          throw {
            status: false,
            Messgae: 'Bucket name not found',
          };
        }
        const regexUrl = /com\/([^\.]+)\//;
        const output = url.match(regexUrl);
        const urlIndex = output[1];
        let excelFile = await s3helper.fetchDataFromColenderS3(
          url.substring(url.indexOf(urlIndex)),
          colenderBucketName,
        );

        return res.status(200).send(excelFile);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};
async function generateCoLenderDisbursalApprovalFile(req, data) {
  let reportData = [];
  Array.from(data.filtered_data).map(async (data) => {
    let approvalDate = moment(data.final_approve_date, true).format(
      'DD-MMM-YYYY',
    );
    reportData.push({
      'Debit Ac No': new String(process.env.MAMTA_DEBIT_ACCOUNT) || '',
      'Beneficiary Ac No': new String(data.escrow_account_number) || '',
      'Beneficiary Name': data.escrow_account_beneficiary_name || '',
      Amt: data.co_lend_loan_amount || '',
      'Pay Mod': data.pymt_mode || '',
      'Date(DD-MON-YYYY)': approvalDate || '',
      IFSC: data.escrow_account_ifsc_code || '',
      'Payable Location name': '',
      'Print Location': '',
      'Bene Mobile no': '',
      'Ben add1': '',
      'Ben add2': '',
      'Ben add3': '',
      'Ben add4': '',
      'Add details 1': '',
      'Add details 2': '',
      'Add details 3': '',
      'Add details 4': '',
      'Add details 5': '',
      Remarks: data.remarks || '',
    });
  });
  const xlsx = json2xls(reportData, {
    fields: [
      'Debit Ac No',
      'Beneficiary Ac No',
      'Beneficiary Name',
      'Amt',
      'Pay Mode',
      'Date(DD-MON-YYYY)',
      'IFSC',
      'Payable Location name',
      'Print Location',
      'Bene Mobile no',
      'Ben add1',
      'Ben add2',
      'Ben add3',
      'Ben add4',
      'Add details 1',
      'Add details 2',
      'Add details 3',
      'Add details 4',
      'Add details 5',
      'Remarks',
    ],
  });

  let randomNumber = Math.floor(10000 + Math.random() * 99999);
  let colenderName = data.co_lender_id
    ? String(data.filtered_data[0].co_lender_name).replace(/\s+/g, '_')
    : 'Escrow_All_Co-lenders';
  let fileName = `CoLenderDisbursalApprovalLoanData_${data.from_date}_${data.to_date}.xlsx`;
  const localFilePath = await disbursementReportHelper.convertJsonToExcel(
    fileName,
    xlsx,
  );
  // upload generated report to S3
  const filePathInS3 = `CoLenderDisbursalApprovalLoanData/${colenderName}/${randomNumber}/${data.from_date}_${data.to_date}.xlsx`;
  const uploadFileToS3 = await disbursementReportHelper.uploadXlsxToS3(
    localFilePath,
    filePathInS3,
  );
  if (!uploadFileToS3)
    throw { success: false, message: 'Error while uploading report to s3' };
  //Unlink file by file_name very important
  const UnlinkXls = await fs.unlink(`./${localFilePath}`);
  // Record generated report in report_storage table
  let reportDataGenerated = {
    file_name: localFilePath,
    s3_url: uploadFileToS3.Location,
    requested_by_name: req.user.username,
    requested_by_id: req.user._id,
    report_name: 'co-lender-pre-disbursement',
    from_date: data.from_date,
    to_date: data.to_date,
    co_lender_name: data.co_lender_id
      ? `Escrow_${String(data.filtered_data[0].co_lender_name).replace(
          /\s+/g,
          '_',
        )}`
      : 'Escrow_All_Co-lenders',
  };
  const recordGenereatedReport =
    await disbursementReportHelper.recordGenereatedReport(reportDataGenerated);
  if (!recordGenereatedReport)
    throw {
      success: false,
      message: 'Error while recording generated report',
    };
  return recordGenereatedReport;
}

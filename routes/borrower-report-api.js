const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const bankDisbursementRequestSchema = require('../models/bank-disbursement-details-schema');
const colenderProfileSchema = require('../models/co-lender-profile-schema');
const borrowerSchema = require('../models/borrowerinfo-common-schema');

/**
 * Exporting Bank File Upload/Download API
 * @param {*} app
 * @param {*} connection
 * @return {*} Report Details
 * @throws {*} No Disbursement Record Found
 */
module.exports = (app, conn) => {
  app.get(
    '/api/borrower-disbursement-reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const borrowerPreDisbursementReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'borrower-pre-disbursement',
          );
        if (!borrowerPreDisbursementReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for borrower pre disbursement reports',
          };
        return res.status(200).send(borrowerPreDisbursementReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/borrower-download-disbursement-report/:id',
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
            'BorrowerDisbursalApprovalLoanData',
          ),
        );
        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `BorrowerDisbursalApprovalLoanData${Date.now()}.xlsx`;
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
    '/api/borrower-disbursement-report',
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
        const getBorrowerDataFromBankChannel =
          await bankDisbursementRequestSchema.findPendingDisbursements();
        const colenderName = (
          await colenderProfileSchema.findByColenderId(data.co_lender_id)
        )?.co_lender_name;
        const filteredDataByColender = [];
        for await (let ele of getBorrowerDataFromBankChannel) {
          const ifLoanExists = await borrowerSchema.findIfExistsByLCI(
            ele.loan_id,
            data.co_lender_id,
            data.from_date,
            data.to_date,
          );
          if (ifLoanExists.length > 0) {
            filteredDataByColender.push(ele);
          }
        }
        data.filtered_data = filteredDataByColender;
        const borrowerDisbursalApprovalFile =
          await generateBorrowerDisbursalApprovalFile(req, data, colenderName);

        return res.status(200).send({
          message: 'Borrower pre-disbursement report generated successfully.',
          data: borrowerDisbursalApprovalFile,
        });
      } catch (e) {
        return res.status(400).send(e);
      }
    },
  );
};

async function generateBorrowerDisbursalApprovalFile(req, data, colenderName) {
  let reportData = [];
  Array.from(data.filtered_data).forEach((data) => {
    reportData.push({
      'Debit Ac No': new String(data.debit_account_no) || '',
      'Beneficiary Ac No': new String(data.beneficiary_account_no) || '',
      'Beneficiary Name': data.beneficiary_name || '',
      Amt: data.amount || '',
      'Pay Mode': data?.mode_of_pay || '',
      'Date(DD-MON-YYYY)':
        moment(data.approval_date).format('DD-MMM-YYYY') || '',
      IFSC: data.debit_ifsc || '',
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
      Remarks: data?.debit_trn_remarks || '',
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
  let colendName = colenderName ? colenderName : 'Borrower_All_Co-lenders';
  let fileName = `borrowerDisbursalApprovalLoanData_${data.from_date}_${data.to_date}.xlsx`;
  const localFilePath = await disbursementReportHelper.convertJsonToExcel(
    fileName,
    xlsx,
  );
  // upload generated report to S3
  const filePathInS3 = `BorrowerDisbursalApprovalLoanData/${colendName}/${randomNumber}/${data.from_date}_${data.to_date}.xlsx`;
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
    s3_url: uploadFileToS3?.Location,
    requested_by_name: req?.user?.username,
    requested_by_id: req?.user?._id,
    report_name: 'borrower-pre-disbursement',
    from_date: data?.from_date,
    to_date: data?.to_date,
    co_lender_name: colenderName
      ? `Borrower_${colenderName}`
      : 'Borrower_All_Co-lenders',
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

const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../../util/report');
const ReportStorageSchema = require('../../models/report-storage-schema');
const ProductSchema = require('../../models/product-schema');
const s3helper = require('../../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const bankDisbursementRequestSchema = require('../../models/bank-disbursement-details-schema');
const colenderProfileSchema = require('../../models/co-lender-profile-schema');
const borrowerSchema = require('../../models/borrowerinfo-common-schema');
const ColenderCommonDetails = require('../../models/co-lender-common-details-schema');
/**
 * @param {*} app
 * @param {*} connection
 * @return {*} Report Details
 * @throws {*} No P2P Record Found
 */
module.exports = (app, conn) => {
  app.get(
    '/api/p2p-reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const p2pReports = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'co-lender-disbursement',
        );
        if (!p2pReports.rows.length)
          throw {
            success: false,
            message: ' No records found for Co-Lender-Disburement reports',
          };
        return res.status(200).send(p2pReports);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //download report
  app.get(
    '/api/p2p-download-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const p2pReportResp = await ReportStorageSchema.findById(req.params.id);
        if (!p2pReportResp)
          throw {
            success: false,
            message: 'No record found for P2P report.',
          };
        const url = p2pReportResp.s3_url.substring(
          p2pReportResp.s3_url.indexOf('CoLenderDisbursementReport'),
        );
        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `CoLenderDisbursementReport${Date.now()}.xlsx`;
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
          path.join(__dirname, `../../${filename}`),
        );
        return res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //generate p2p report
  app.post(
    '/api/p2p-report',
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
        const colenderData = await colenderProfileSchema.findByColenderId(
          data.co_lender_id,
        );
        let coLenderName = colenderData['co_lender_name'] || '';
        let requestData = await ColenderCommonDetails.p2pReport(
          fromDate,
          toDate,
          colenderData?.co_lender_shortcode || 'PEER',
        );
        if (requestData.length == 0) {
          throw {
            success: false,
            message: `No Record found for the given conditions`,
          };
        }

        if (requestData.length == 0) {
          throw {
            success: false,
            message: `No Record found for the given conditions`,
          };
        }
        data.filtered_data = requestData;
        const borrowerDisbursalApprovalFile = await generateP2pFile(
          req,
          data,
          coLenderName,
        );
        return res.status(200).send({
          message: 'Co Lender Disbursement report generated successfully.',
          data: borrowerDisbursalApprovalFile,
        });
      } catch (e) {
        return res.status(400).send(e);
      }
    },
  );
};

async function generateP2pFile(req, data, colenderName) {
  colenderName = colenderName.replace(/ /g, '_');
  let reportData = [];
  Array.from(data.filtered_data).forEach((data) => {
    reportData.push({
      'Loan ID': data['Loan ID'] || '',
      'Sanction amount': parseFloat(data['Sanction amount']) || 0,
      'Company code': data['Company code'] || '',
      'Company name': data['Company name'] || '',
      'Co-lender status': data['Co-lender status'] || '',
      'Creation date': data['Creation date'] || '',
      'Loan stage': data['Loan stage'] || '',
      'Co-lender UTR No': data['Co-lender UTR No'] || '',
      'Disbursal date': data['Disbursal date'] || '',
      'Net disbursal amount': data['Net disbursal amount'] || '',
      PF: data['PF'] || '',
      'GST on PF': data['GST on PF'] || '',
      'Conv Fees': data['Conv Fees'] || '',
      'GST on cnv fees': data['GST on cnv fees'] || '',
      Inusrance: data['Inusrance'] || '',
      'Broken period': data['Broken period'] || '',
    });
  });
  const xlsx = json2xls(reportData, {
    fields: [
      'Loan ID',
      'Sanction amount',
      'Company code',
      'Company name',
      'Co-lender status',
      'Creation date',
      'Loan stage',
      'Co-lender UTR No',
      'Disbursal date',
      'Net disbursal amount',
      'PF',
      'GST on PF',
      'Conv Fees',
      'GST on cnv fees',
      'Inusrance',
      'Broken period',
    ],
  });
  let randomNumber = Math.floor(10000 + Math.random() * 99999);
  let colendName = colenderName ? colenderName : 'Borrower_All_Co-lenders';
  let fileName = `coLenderDisbursementReport_${data.from_date}_${data.to_date}.xlsx`;
  const localFilePath = await disbursementReportHelper.convertJsonToExcel(
    fileName,
    xlsx,
  );
  // upload generated report to S3
  const filePathInS3 = `CoLenderDisbursementReport/${colendName}/${randomNumber}/${data.from_date}_${data.to_date}.xlsx`;
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
    report_name: 'co-lender-disbursement',
    from_date: data?.from_date,
    to_date: data?.to_date,
    co_lender_name: colenderName
      ? `CoLenderDisbursementReport_${colenderName}`
      : 'CoLenderDisbursementReport_All_Co-lenders',
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

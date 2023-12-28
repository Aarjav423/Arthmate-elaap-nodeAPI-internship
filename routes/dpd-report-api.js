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
const LoanRequestSchema = require('../models/loan-request-schema');
const ChargesSchema = require('../models/charges-schema');
const LoanStateSchema = require('../models/loan-state-schema');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fetch generated dpd report records
  app.get(
    '/api/dpd-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const dpdReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'dpd',
          company_id,
        );
        if (!dpdReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for dpd reports',
          };
        return res.status(200).send(dpdReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated dpd report
  app.get(
    '/api/download-dpd-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const dpdReportResp = await ReportStorageSchema.findById(req.params.id);
        if (!dpdReportResp)
          throw {
            success: false,
            message: 'No record found for dpd report.',
          };
        const url = dpdReportResp.s3_url.substring(
          dpdReportResp.s3_url.indexOf('dpd'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `dpdReport${Date.now()}.xlsx`;
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
  // Api to generate dpd report
  app.post(
    '/api/dpd-report',
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('product_id').notEmpty().withMessage('product_id is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        const regex= /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;

        if (data.from_date&&!(data.from_date).match(regex))
        {
          throw {
            success: false,
            message: 'Please enter valid from_date in YYYY-MM-DD format',
          };
        }
        if (data.to_date&&!(data.to_date).match(regex))
        {
          throw {
            success: false,
            message: 'Please enter valid to_date in YYYY-MM-DD format',
          };
        }
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
        // Fetch data against filter
        const borrowerInfos = await BorrowerinfoCommon.getRecordsOnFilter(data);
        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No dpd records found against provided filter',
          };

        // get unique loan_ids
        let loanIds = [];
        Array.from(borrowerInfos).map((item) => {
          loanIds.push(item.loan_id);
        });
        loanIds = [...new Set(loanIds)];

        const leads = await LoanRequestSchema.findByLoanIds(loanIds);
        let leadsObject = {};
        Array.from(leads).forEach((row) => {
          leadsObject[row.loan_id] = row;
        });

        const loanStates = await LoanStateSchema.getByLoanIds(loanIds);
        let loanStatesObject = {};
        Array.from(loanStates).forEach((row) => {
          loanStatesObject[row.loan_id] = row;
        });

        const ChargeRecords =
          await ChargesSchema.findAllChargeWithKlid(loanIds);

        const ChargeRecordsBounceCharges = ChargeRecords.filter(
          (item) => item.charge_id === 1,
        );

        const disbursementAndTopupRecords =
          await DisbursementAndTopupSchema.getByLoanIds(loanIds);
        let disbursementandTopupObject = {};
        Array.from(disbursementAndTopupRecords).forEach((row) => {
          disbursementandTopupObject[row.loan_id] = row;
        });

        const getVal = (value) => {
          if (value?.$numberDecimal !== undefined) {
            return parseFloat(value.$numberDecimal.toString());
          } else if (typeof value === 'object') {
            return parseFloat(value.toString());
          }
          return value;
        };

        const reportPayload = [];
        Array.from(borrowerInfos).forEach((borrowerInfo) => {
          const loanId = borrowerInfo.loan_id;
          let range = loanStatesObject[loanId]?.dpd;
          if (loanStatesObject[loanId]?.dpd){
          let dpdRange = '1-30';
          // Filter our bounce charges of loanId
          const loanBounceChargesById = ChargeRecordsBounceCharges.filter(
            (item) => item.loan_id === loanId,
          );
          let bounceChargesDue = 0;
          //loop all bounce charges find for this loan id and sum it up in one variable with formula

          loanBounceChargesById.forEach((charge) => {
            let chargeAmount = charge.charge_amount * 1 + charge.gst * 1;
            let deductions =
              charge.total_amount_paid * 1 +
              charge.total_amount_waived * 1 +
              charge.total_gst_paid * 1 +
              charge.total_gst_reversed * 1;
            let bounce_charge_due_current = chargeAmount - deductions;

            bounceChargesDue += bounce_charge_due_current;
          });

          if (range > 30 && range <= 60) dpdRange = '30-60';
          else if (range > 60 && range <= 90) dpdRange = '60-90';
          else if (range > 90 && range <= 120) dpdRange = '90-120';

          reportPayload.push({
            'Partner loan id': borrowerInfo.partner_loan_id,
            'Loan id': borrowerInfo.loan_id,
            'Customer name':
              (leadsObject[loanId]?.first_name || '') +
                ' ' +
                (leadsObject[loanId]?.last_name || '') || '',
            'Residential state': leadsObject[loanId]?.state || '',
            'Interest rate': borrowerInfo.loan_int_rate || '',
            'Loan amount': borrowerInfo.sanction_amount || '',
            Tenure: borrowerInfo.tenure || '',
            'Processing fees including GST':
              Number(borrowerInfo.processing_fees_amt || 0) +
              Number(borrowerInfo.gst_on_pf_amt || 0),
            CGST: borrowerInfo.cgst_amount || '',
            SGST: borrowerInfo.sgst_amount || '',
            IGST: borrowerInfo.igst_amount || '',
            'Net disbursement amount': borrowerInfo.net_disbur_amt || '',
            'Disbursement date': borrowerInfo.disbursement_date_time || '',
            'Disbursement UTRn':
              disbursementandTopupObject[loanId]?.utrn_number || '',
            'Principal due till date':
              Number(loanStatesObject[loanId]?.current_prin_due) +
              Number(loanStatesObject[loanId]?.total_prin_paid || ''),
            'Interest due till date':
              Number(loanStatesObject[loanId]?.current_int_due) +
              Number(loanStatesObject[loanId]?.total_int_paid || ''),
            'Principal paid': loanStatesObject[loanId]?.total_prin_paid || '',
            'Interest paid': loanStatesObject[loanId]?.total_int_paid || '',
            'EMI overdue':
              loanStatesObject[loanId]?.prin_overdue +
                loanStatesObject[loanId]?.int_overdue || '',
            'Principal O/S':
              loanStatesObject[loanId]?.prin_os?.toString() || '',
            'Interest O/S': loanStatesObject[loanId]?.int_os?.toString() || '',
            'Principal overdue': loanStatesObject[loanId]?.prin_overdue || '',
            'Interest overdue': loanStatesObject[loanId]?.int_overdue || '',
            'LPI Due': getVal(loanStatesObject[loanId]?.current_lpi_due) || '',
            'LPI Paid': getVal(loanStatesObject[loanId]?.total_lpi_paid) || '',
            'Bounce Charges Due': bounceChargesDue,
            DPD: loanStatesObject[loanId]?.dpd || '',
            'DPD range': loanStatesObject[loanId]?.dpd_range || '',
          });
      }});
      if (!reportPayload.length)
      {
        throw {
          success: false,
          message: 'No dpd records found against provided filter',
        }; 
      }

        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: [
            'Partner loan id',
            'Loan id',
            'Customer name',
            'Residential state',
            'Interest rate',
            'Loan amount',
            'Tenure',
            'Processing fees including GST',
            'CGST',
            'SGST',
            'IGST',
            'Net disbursement amount',
            'Disbursement date',
            'Disbursement UTRn',
            'Principal due till date',
            'Interest due till date',
            'Principal paid',
            'Interest paid',
            'EMI overdue',
            'Principal O/S',
            'Interest O/S',
            'Principal overdue',
            'Interest overdue',
            'LPI Due',
            'LPI Paid',
            'Bounce Charges Due',
            'DPD',
            'DPD range',
          ],
        });
        //Generate file name according to provided filter
        let fileName;
        if (data.from_date)
        {
          fileName = `DPD_${req?.company?.code}_${
            data.product_id ? data.product_id : 'all'
          }_${data.from_date}_${data.to_date}.xlsx`;
        }
        else
        {
          var todayDate = new Date().toISOString().slice(0, 10);
          fileName = `DPD_${req?.company?.code}_${
            data.product_id ? data.product_id : 'all'
          }_${todayDate}.xlsx`;
        }
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3
        let filePathInS3;
        if (data.from_date)
        {
          filePathInS3 = `dpd/${req?.company?.code}/${
            data.product_id ? data.product_id : 'all'
          }/${data.from_date}_${data.to_date}.xlsx`;
        }
        else
        { 
          var todayDate = new Date().toISOString().slice(0, 10);
          filePathInS3 = `dpd/${req?.company?.code}/${
            data.product_id ? data.product_id : 'all'
          }/${todayDate}.xlsx`;
        }
        const uploadFileToS3 = await disbursementReportHelper.uploadXlsxToS3(
          localFilePath,
          filePathInS3,
        );

        if (!uploadFileToS3)
          throw {
            success: false,
            message: 'Error while uploading dpd report to s3',
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
          report_name: 'dpd',
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
          message: 'DPD report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

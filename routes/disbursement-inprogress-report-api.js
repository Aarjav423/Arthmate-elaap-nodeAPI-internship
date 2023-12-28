const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const CPUHelper = require('../util/company-product-user-helper.js');
const disbursementReportHelper = require('../util/report');
const DisbursementAndTopupSchema = require('../models/disbursement-ledger-schema');
const LoanTransactionLedger = require('../models/loan-transaction-ledger-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const LoanRequestSchema = require('../models/loan-request-schema');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fetch generated report records
  app.get(
    '/api/disbursement-inprogress-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const disbursementInprogressReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'disbursement_inprogress',
            company_id,
          );
        if (!disbursementInprogressReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for disbursement inprogress reports',
          };
        return res.status(200).send(disbursementInprogressReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated disbursement inprogress report
  app.get(
    '/api/download-disbursement-inprogress-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const disbursementInprogressReportResp =
          await ReportStorageSchema.findById(req.params.id);
        if (!disbursementInprogressReportResp)
          throw {
            success: false,
            message: 'No record found for disbursement inprogress report.',
          };
        const url = disbursementInprogressReportResp.s3_url.substring(
          disbursementInprogressReportResp.s3_url.indexOf(
            'disbursement_inprogress',
          ),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `disbursementInprogressReport${Date.now()}.xlsx`;
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
        console.log('error download disbursement inprogress ', error);
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate disbursement inprogress report
  app.post(
    '/api/generate-disbursement-inprogress-report',
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
            let Days = toDate.diff(fromDate, 'days');
            if (
              Days >=
              process.env.MAXIMUM_DATE_RANGE_REPORT_DISBURSEMENT_INPROGRESS
            ) {
              throw {
                success: false,
                message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT_DISBURSEMENT_INPROGRESS} days`,
              };
            }
          }
        }
        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }
        // Fetch disbursement inprogress records according to the filters
        data.status = 'inprogress';
        const disbursementInprogressRecordsDNT =
          await DisbursementAndTopupSchema.getFilteredDisbursementInprogressRecords(
            data,
          );
        if (!disbursementInprogressRecordsDNT.length)
          throw {
            success: false,
            message: 'No disbursement records found against provided filter',
          };

        let loanIds = [];
        Array.from(disbursementInprogressRecordsDNT).map((item) => {
          loanIds.push(item.loan_id);
        });

        loanIds = [...new Set(loanIds)];
        const borrowerInfos = await BorrowerinfoCommon.findKLIByIds(loanIds);
        if (!borrowerInfos.length)
          throw {
            success: false,
            message: 'No borrower records found against provided loan ids',
          };

        const leads = await LoanRequestSchema.findByLoanIds(loanIds);
        if (!leads.length)
          throw {
            success: false,
            message: 'No lead records found against provided loan ids',
          };
        let leadsObject = {};
        Array.from(leads).forEach((row) => {
          leadsObject[row.loan_id] = row;
        });

        const reportPayload = [];

        // iterate and generate rows for report of in progress records from DNT
        Array.from(disbursementInprogressRecordsDNT).forEach((item) => {
          Array.from(borrowerInfos).forEach((borrowerInfo) => {
            if (item.loan_id === borrowerInfo.loan_id) {
              reportPayload.push({
                'Partner borrower id': item.partner_borrower_id || '',
                'Borrower id': item.borrower_id || '',
                'Partner loan id': item.partner_loan_id || '',
                'Partner Name': req.companies.filter(
                  (company) => company._id === borrowerInfo.company_id,
                )[0].name,
                'Product Name': req.products.filter(
                  (product) => product._id === borrowerInfo.product_id,
                )[0].name,
                'Loan id': item.loan_id || '',
                'Disbursement status': item.status || 'initiated',
                'Disbursement Initiated on':
                  moment(item.created_at).format('YYYY-MM-DD HH:MM:SS') || '',
                'Transaction amount': item.amount || '',
                'Customer name':
                  (borrowerInfo?.first_name || '') +
                  ' ' +
                  (borrowerInfo?.last_name || ''),
                State: leadsObject[borrowerInfo?.loan_id]?.state || '',
                'GST Number': borrowerInfo?.gst_number || '',
                'Other Business Reg No':
                  borrowerInfo?.other_business_reg_no || '',
                UMRN: borrowerInfo?.umrn || '',
                'Beneficiary Name':
                  borrowerInfo?.bene_bank_account_holder_name || '',
                'Beneficiary bank name': borrowerInfo?.bene_bank_name || '',
                'Beneficiary bank account number':
                  borrowerInfo?.bene_bank_acc_num || '',
                'Beneficiary bank IFSC': borrowerInfo?.bene_bank_ifsc || '',
                'Requested loan amount': borrowerInfo?.sanction_amount || '',
                'Sanction amount': borrowerInfo?.sanction_amount || '',
                'Subvention fees amount':
                  borrowerInfo?.subvention_fees_amount || '',
                'GST on subvention fees':
                  borrowerInfo?.gst_on_subvention_fees || '',
                'SGST on Subvention Fees':
                  borrowerInfo?.sgst_on_subvention_fees || '',
                'CGST on Subvention Fees':
                  borrowerInfo?.cgst_on_subvention_fees || '',
                'IGST on Subvention Fees':
                  borrowerInfo?.igst_on_subvention_fees || '',
                'Processing fees': borrowerInfo?.processing_fees_amt || '',
                'CGST on PF': borrowerInfo?.cgst_amount || '',
                'SGST on PF': borrowerInfo?.sgst_amount || '',
                'IGST on PF': borrowerInfo?.igst_amount || '',
                'GST on Processing Fees': borrowerInfo?.gst_on_pf_amt || '',
                'Application Fees':
                  borrowerInfo?.application_fees_excluding_gst || '',
                'GST on Application Fees':
                  borrowerInfo?.gst_on_application_fees || '',
                'SGST on Application Fees':
                  borrowerInfo?.sgst_on_application_fees || '',
                'CGST on Application Fees':
                  borrowerInfo?.cgst_on_application_fees || '',
                'IGST on Application Fees':
                  borrowerInfo?.igst_on_application_fees || '',
                'Convenience Fees': borrowerInfo?.conv_fees_excluding_gst || '',
                'GST on Convenience Fees': borrowerInfo?.gst_on_conv_fees || '',
                'SGST on Convenience Fees':
                  borrowerInfo?.sgst_on_conv_fees || '',
                'CGST on Convenience Fees':
                  borrowerInfo?.cgst_on_conv_fees || '',
                'IGST on Convenience Fees':
                  borrowerInfo?.igst_on_conv_fees || '',
                'Insurance Amount': borrowerInfo?.insurance_amount || '',
                'Broken interest': borrowerInfo?.broken_interest || '',
                'Upfront Interest': borrowerInfo?.upfront_interest || '',
              });
            }
          });
        });

        // Convert json to excel structure
        const xls = json2xls(reportPayload, {
          fields: [
            'Partner borrower id',
            'Borrower id',
            'Partner loan id',
            'Partner Name',
            'Product Name',
            'Loan id',
            'Disbursement status',
            'Disbursement Initiated on',
            'Transaction amount',
            'Customer name',
            'State',
            'GST Number',
            'Other Business Reg No',
            'UMRN',
            'Beneficiary Name',
            'Beneficiary bank name',
            'Beneficiary bank account number',
            'Beneficiary bank IFSC',
            'Requested loan amount',
            'Sanction amount',
            'Subvention fees amount',
            'GST on subvention fees',
            'SGST on Subvention Fees',
            'CGST on Subvention Fees',
            'IGST on Subvention Fees',
            'Processing fees',
            'CGST on PF',
            'SGST on PF',
            'IGST on PF',
            'GST on Processing Fees',
            'Application Fees',
            'GST on Application Fees',
            'SGST on Application Fees',
            'CGST on Application Fees',
            'IGST on Application Fees',
            'Convenience Fees',
            'GST on Convenience Fees',
            'SGST on Convenience Fees',
            'CGST on Convenience Fees',
            'IGST on Convenience Fees',
            'Insurance Amount',
            'Broken interest',
            'Upfront Interest',
          ],
        });

        //Generate file name according to provided filter
        let fileName = `DisbursementInprogressConfirmation_${
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
          filePathInS3 = `disbursement_inprogress/${req?.company?.code}/${
            data.product_id ? data.product_id : 'all_products'
          }/${data.from_date}_${data.to_date}.xlsx`;
        } else {
          // upload generated report to S3
          filePathInS3 = `disbursement_inprogress/all_products_${
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
          report_name: 'disbursement_inprogress',
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
          message: 'Disbursement inprogress report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

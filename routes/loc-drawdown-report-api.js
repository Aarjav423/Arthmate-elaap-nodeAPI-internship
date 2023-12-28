const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const dradownReportHelper = require('../util/report');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const loan_transaction_ledgers = require('../models/loan-transaction-ledger-schema.js');
const loc_batch_drawdown = require('../models/loc-batch-drawdown-schema');
const moment = require('moment');
const fs = require('fs').promises;
const s3helper = require('../util/s3helper');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fetch generated Loc drawdown report records
  app.get(
    '/api/loc-drawdown-reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const drawdownLocReportResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'loc_drawdown_report',
            company_id,
          );
        if (!drawdownLocReportResp.rows.length)
          throw {
            success: false,
            message: ' No records found for Loc Drawdown reports',
          };
        return res.status(200).send(drawdownLocReportResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated Loc drawdown report
  app.get(
    '/api/download-loc-drawdown-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const drawdownLocReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!drawdownLocReportResp)
          throw {
            success: false,
            message: 'No record found for dpd report.',
          };
        const url = drawdownLocReportResp.s3_url.substring(
          drawdownLocReportResp.s3_url.indexOf('loc_drawdown_report'),
        );
        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `loc_drawdown_report${Date.now()}.xlsx`;
        await fs.writeFile(filename, reportFromS3Resp);
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
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate drawdown report
  app.post(
    '/api/loc-drawdown-report',
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
        let { company_id, product_id, from_date, to_date } = data;
        //Check for the Company ID

        if (company_id && company_id != req.company._id)
          throw { success: false, message: 'company_id mismatch' };

        //validate the data in api payload

        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        if (from_date || to_date) {
          let fromDate = moment(from_date, 'YYYY-MM-DD');
          let toDate = moment(to_date, 'YYYY-MM-DD');
          if (from_date && to_date) {
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
        if (product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(product_id);
        }

        let { allow_loc } = productResp;
        if (!allow_loc) {
          throw {
            success: false,
            message:
              'Report cannot be generated because the product is not LOC',
          };
        }
        let fromDate = new Date(from_date);
        fromDate.setHours(0, 0, 0, 0);
        let toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        let disbursmentDrawDownData = await loc_batch_drawdown.aggregate([
          {
            $match: {
              product_id: parseInt(product_id),
              company_id: parseInt(company_id),
              drawadown_request_date: { $gte: fromDate, $lte: toDate },
            },
          },
          {
            $lookup: {
              from: 'loan_transaction_ledgers',
              localField: '_id',
              foreignField: 'request_id',
              as: 'loan_transaction_ledger',
            },
          },
          {
            $lookup: {
              from: 'borrowerinfo_commons',
              localField: 'loan_id',
              foreignField: 'loan_id',
              as: 'borrower_info',
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: 'product_id',
              foreignField: '_id',
              as: 'productData',
            },
          },
          {
            $lookup: {
              from: 'master_bank_details',
              localField: 'beneficiary_bank_details_id',
              foreignField: '_id',
              as: 'masterBankDetailsData',
            },
          },
          {
            $lookup: {
              from: 'product_scheme_mappings',
              localField: 'product_scheme_id',
              foreignField: '_id',
              as: 'productSchemeMappingsData',
            },
          },
          {
            $lookup: {
              from: 'schemes',
              localField: 'productSchemeMappingsData.scheme_id',
              foreignField: '_id',
              as: 'schemesData',
            },
          },
        ]);

        const reportPayload = [];
        if (disbursmentDrawDownData.length == 0) {
          throw {
            success: false,
            message: 'Report cannot be generated as No Disbursment Data Found',
          };
        }

        if (disbursmentDrawDownData.length >= 5000) {
          throw {
            success: false,
            message: 'Report cannot be generated as No Disbursment Data Found',
          };
        }
        Array.from(disbursmentDrawDownData).forEach((drawDownData) => {
          reportPayload.push({
            'Loan App Id': drawDownData.loan_app_id,
            'Loan Id': drawDownData.loan_id,
            'Borrower Id': drawDownData.borrower_id,
            'Partner Loan App Id':
              drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].partner_loan_app_id
                : 'NA',
            'Partner Loan Id':
              drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].partner_loan_id
                : 'NA',
            'Partner Borrower Id': drawDownData?.partner_borrower_id || 'NA',
            'Usage Id':
              drawDownData?.loan_transaction_ledger?.length > 0 &&
              drawDownData?.loan_transaction_ledger[0]?._id
                ? drawDownData?.loan_transaction_ledger[0]?._id
                : 'NA',
            Status:
              drawDownData?.loan_transaction_ledger.length > 0 &&
              drawDownData.loan_transaction_ledger[0].disbursement_status
                ? drawDownData.loan_transaction_ledger[0].disbursement_status
                : 'NA',
            'Drawdown Request Date': drawDownData.drawdown_request_creation_date
              ? drawDownData.drawdown_request_creation_date
              : drawDownData.loan_transaction_ledger[0]?.created_at,
            'Drawdown Amount':
              drawDownData?.loan_transaction_ledger[0]?.txn_amount,
            'Net Drawdown Amount':
              drawDownData?.loan_transaction_ledger[0]?.final_disburse_amt,
            'Usage Fees Including Gst':
              drawDownData?.loan_transaction_ledger[0]
                ?.usage_fees_including_gst,
            'Usage Fees':
              drawDownData?.loan_transaction_ledger[0]?.upfront_usage_fee,
            'Gst Usage Fees':
              drawDownData?.loan_transaction_ledger[0]?.gst_on_usage_fee,
            'Cgst Usage Fees':
              drawDownData?.loan_transaction_ledger[0]?.cgst_on_usage_fee,
            'Sgst Usage Fees':
              drawDownData?.loan_transaction_ledger[0]?.sgst_on_usage_fee,
            'Igst Usage Fees':
              drawDownData?.loan_transaction_ledger[0]?.igst_on_usage_fee,
            'Upfront Int':
              drawDownData?.loan_transaction_ledger[0]?.upfront_interest,
            'Interest Rate':
              drawDownData.schemesData.length > 0
                ? drawDownData.schemesData[0].interest_rate
                : productResp?.int_value.length > 0
                  ? productResp?.int_value.replace(/[a-zA-Z]/, '')
                  : "NA",
            bene_bank_name:
              drawDownData?.masterBankDetailsData.length > 0
                ? drawDownData?.masterBankDetailsData[0]?.bene_bank_name
                : drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].bene_bank_name
                : '',
            bene_bank_acc_num:
              drawDownData?.masterBankDetailsData.length > 0
                ? drawDownData?.masterBankDetailsData[0]?.bene_bank_acc_num
                : drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].bene_bank_acc_num
                : '',
            bene_bank_ifsc:
              drawDownData?.masterBankDetailsData.length > 0
                ? drawDownData?.masterBankDetailsData[0]?.bene_bank_ifsc
                : drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].bene_bank_ifsc
                : '',
            bene_bank_account_holder_name:
              drawDownData?.masterBankDetailsData.length > 0
                ? drawDownData?.masterBankDetailsData[0]
                    ?.bene_bank_account_holder_name
                : drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].bene_bank_account_holder_name
                : '',
            bene_bank_account_type:
              drawDownData?.masterBankDetailsData.length > 0
                ? drawDownData?.masterBankDetailsData[0]?.bene_bank_account_type
                : drawDownData.borrower_info.length > 0
                ? drawDownData.borrower_info[0].bene_bank_account_type
                : '',
            int_type:
              drawDownData?.schemesData.length > 0 &&
              drawDownData?.schemesData[0]?.interest_type
                ? drawDownData?.schemesData[0]?.interest_type
                : drawDownData?.productData.length > 0 &&
                  drawDownData.productData[0].interest_type
                ? drawDownData.productData[0].interest_type
                : 'NA',
            penal:
              drawDownData?.schemesData.length > 0 &&
              drawDownData.schemesData[0].penal_rate
                ? drawDownData?.schemesData[0]?.penal_rate
                : drawDownData.productData.length > 0 &&
                  drawDownData.productData[0]?.penal_interest
                ? drawDownData.productData[0]?.penal_interest
                : 'NA',
            'Bounce charge':
              drawDownData?.schemesData.length > 0 &&
              drawDownData?.schemesData[0]?.bounce_charge
                ? drawDownData?.schemesData[0]?.bounce_charge
                : drawDownData.productData.length > 0 &&
                  drawDownData.productData[0].bounce_charges
                ? drawDownData.productData[0].bounce_charges
                : 'NA',
            invoice_number: drawDownData?.invoice_number || 'NA',
            'Repayment Due Date':
              drawDownData?.loan_transaction_ledger.length > 0 &&
              drawDownData.loan_transaction_ledger[0].repayment_due_date
                ? drawDownData.loan_transaction_ledger[0].repayment_due_date
                : 'NA',
            'Disbursement Date':
              drawDownData?.loan_transaction_ledger.length > 0 &&
              drawDownData.loan_transaction_ledger[0].utr_date_time_stamp
                ? drawDownData.loan_transaction_ledger[0].utr_date_time_stamp
                : 'NA',
            "UTR Num": drawDownData?.utrn_number || "NA",
            Remarks: drawDownData?.remarks ? drawDownData.remarks : 'NA',
          });
        });
        const xls = json2xls(reportPayload, {
          fields: [
            'Loan App Id',
            'Loan Id',
            'Borrower Id',
            'Partner Loan App Id',
            'Partner Loan Id',
            'Partner Borrower Id',
            'Usage Id',
            'Status',
            'Drawdown Request Date',
            'Drawdown Amount',
            'Net Drawdown Amount',
            'Usage Fees Including Gst',
            'Usage Fees',
            'Gst Usage Fees',
            'Cgst Usage Fees',
            'Sgst Usage Fees',
            'Igst Usage Fees',
            'Upfront Int',
            'Interest Rate',
            'bene_bank_name',
            'bene_bank_acc_num',
            'bene_bank_ifsc',
            'bene_bank_account_holder_name',
            'bene_bank_account_type',
            'int_type',
            'penal',
            'Bounce charge',
            'invoice_number',
            'Repayment Due Date',
            'Disbursement Date',
            'UTR Num',
            'Remarks',
          ],
        });
        //Generate file name according to provided filter

        let fileName = `LOC_drawdown_${
          req?.company?.code ? req?.company?.code : 'all_partners'
        }_${data.product_id ? data.product_id : 'all_products'}_${
          data.from_date
        }_${data.to_date}.xlsx`;

        // Convert json to xlsx format
        const localFilePath = await dradownReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );

        const uploadFileToS3 = await dradownReportHelper.uploadXlsxToS3(
          localFilePath,
          `loc_drawdown_report/${fileName}`,
        );

        if (!uploadFileToS3)
          throw {
            success: false,
            message: 'Error while uploading report to s3',
          };

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
          report_name: 'loc_drawdown_report',
          from_date: data.from_date,
          to_date: data.to_date,
        };

        const recordGenereatedReport =
          await dradownReportHelper.recordGenereatedReport(reportData);

        const UnlinkXls = await fs.unlink(`./${localFilePath}`);
        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated report',
          };

        return res.status(200).send({
          message: 'Loc Drawdown report generated successfully.',
          data: {},
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );
};

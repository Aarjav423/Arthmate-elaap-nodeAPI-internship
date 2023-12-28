const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');
const disbursementReportHelper = require('../util/report');
const ComplianceSchema = require('../models/compliance-schema');
const ReportStorageSchema = require('../models/report-storage-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const LoanRequestSchema = require('../models/loan-request-schema');
const BorrowerInfoSchema = require('../models/borrowerinfo-common-schema');
const { typeOf } = require('mathjs');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fecth screen_reports
  app.get(
    '/api/screen-reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const screenReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'screen_report',
          company_id,
        );
        if (!screenReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for screen reports',
          };
        return res.status(200).send(screenReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download screen_reports
  app.get(
    '/api/download-screen-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const kycComplianceReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!kycComplianceReportResp)
          throw {
            success: false,
            message: 'No record found for KYC Compliance report.',
          };
        const url = kycComplianceReportResp.s3_url.substring(
          kycComplianceReportResp.s3_url.indexOf('screen_report'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `screenReport${Date.now()}.xlsx`;
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

  // Api to generate screen report
  app.post(
    '/api/screen-report',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const data = req.body;
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
        } else {
          productResp = await ProductSchema.findAllActive();
        }

        ///Fetch loan request records according to the filters
        const loanRequestRecords =
          await LoanRequestSchema.findAllByFilterRecords(data);

        if (!loanRequestRecords.length)
          throw {
            success: false,
            message: 'No screen records found against provided filter',
          };

        let loanIds = [];
        loanRequestRecords.forEach((record) => {
          loanIds.push(record.loan_id);
        });

        //fetch all borrower with loan ids
        let borrowerData = await BorrowerInfoSchema.findKLIByIds(loanIds);

        let screenReportData = [];

        loanRequestRecords.forEach((lead) => {
          //check for lead if borrower info is present
          const borrower = borrowerData.find((loan) => {
            if (loan.loan_app_id === lead.loan_app_id) return loan;
          });

          //get party type for the products
          if (typeOf(productResp) != 'Object') {
            var product = productResp.find((product) => {
              if (product._id === lead.product_id) return product.party_type;
            });
          }

          if (
            lead.scr_match_result == 'Error' ||
            lead.scr_match_result == 'Probable' ||
            lead.scr_match_result == 'Confirmed'
          ) {
            ///prepare data for screen report
            screenReportData.push({
              company_id: lead.company_id ? lead.company_id : '',
              company_name: lead.company_name ? lead.company_name : '',
              product_id: lead.product_id ? lead.product_id : '',
              loan_app_id: lead.loan_app_id ? lead.loan_app_id : '',
              party_type: product
                ? lead.company_id == product.company_id
                  ? product.party_type
                  : ''
                : productResp
                ? productResp.party_type
                : borrower
                ? borrower.party_type
                : '',
              first_name: lead.first_name ? lead.first_name : '',
              middle_name: lead.middle_name ? lead.middle_name : '',
              last_name: lead.last_name ? lead.last_name : '',
              gender: lead.gender ? lead.gender : '',
              appl_pan: lead.appl_pan ? lead.appl_pan : '',
              dob: lead.dob ? lead.dob : '',
              resi_addr_ln1: lead.resi_addr_ln1 ? lead.resi_addr_ln1 : '',
              resi_addr_ln2: lead.resi_addr_ln2 ? lead.resi_addr_ln2 : '',
              city: lead.city ? lead.city : '',
              state: lead.state ? lead.state : '',
              pincode: lead.pincode ? lead.pincode : '',
              per_addr_ln1: lead.per_addr_ln1 ? lead.per_addr_ln1 : '',
              per_addr_ln2: lead.per_addr_ln2 ? lead.per_addr_ln2 : '',
              per_city: lead.per_city ? lead.per_city : '',
              per_state: lead.per_state ? lead.per_state : '',
              per_pincode: lead.per_pincode ? lead.per_pincode : '',
              appl_phone: lead.appl_phone ? lead.appl_phone : '',
              email_id: lead.email_id ? lead.email_id : '',
              scr_match_result: lead.scr_match_result
                ? lead.scr_match_result
                : '',
              scr_match_count: lead.scr_match_count ? lead.scr_match_count : '',
              scr_status: borrower ? borrower.scr_status : '',
              reason: borrower
                ? borrower.reason == 'I09'
                  ? 'Screening failed'
                  : ''
                : lead.reason == 'I09'
                ? 'Screening failed'
                : '',
              created_date: moment(lead.created_at).format('YYYY-MM-DD'),
              updated_date: borrower
                ? moment(borrower.updated_at).format('YYYY-MM-DD')
                : '',
              approved_or_rejected_by:
                borrower && borrower?.scr_approved_by
                  ? borrower?.scr_approved_by
                  : borrower?.rejected_by
                  ? borrower?.rejected_by
                  : '',
            });
          }
        });

        if (!screenReportData.length)
          throw {
            success: false,
            message: 'No screen records found against provided filter',
          };

        // Convert json to excel structure
        var xls = json2xls(screenReportData, {
          fields: [
            'company_id',
            'company_name',
            'product_id',
            'loan_app_id',
            'party_type',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'appl_pan',
            'dob',
            'resi_addr_ln1',
            'resi_addr_ln2',
            'city',
            'state',
            'pincode',
            'per_addr_ln1',
            'per_addr_ln2',
            'per_city',
            'per_state',
            'per_pincode',
            'appl_phone',
            'email_id',
            'scr_match_result',
            'scr_match_count',
            'scr_status',
            'reason',
            'created_date',
            'updated_date',
            'approved_or_rejected_by',
          ],
        });

        //Generate file name according to provided filter
        let fileName = `screen_report_${req.user ? req.user._id : ''}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date ? data.from_date : ''}_${
          data.to_date ? data.to_date : ''
        }.xlsx`;
        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );

        // upload generated report to S3
        const filePathInS3 = `screen_report_/${req.user ? req.user._id : ''}/${
          data.product_id ? data.product_id : 'all'
        }/${data.from_date ? data.from_date : ''}_${
          data.to_date ? data.to_date : ''
        }.xlsx`;
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
          company_name: req.company ? req.company.name : '',
          company_code: req.company ? req.company.code : '',
          product_name: data.product_id ? productResp.name : '',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'screen_report',
          from_date: data.from_date ? data.from_date : '',
          to_date: data.to_date ? data.to_date : '',
        };

        //record the reports generated in report schemas
        const recordGenereatedReport =
          await disbursementReportHelper.recordGenereatedReport(reportData);
        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated report',
          };

        return res.status(200).send({
          message: 'Screen report generated successfully.',
          data: reportData,
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );
};

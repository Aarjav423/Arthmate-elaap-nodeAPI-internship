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

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //Api to fecth kyc-compliance_reports
  app.get(
    '/api/kyc_compliance_reports/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const kycComplianceReportsResp =
          await ReportStorageSchema.getPaginatedData(
            req.params.page,
            req.params.limit,
            'kyc_compliance',
            company_id,
          );
        if (!kycComplianceReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for kyc compliance reports',
          };
        return res.status(200).send(kycComplianceReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download kyc-compliance_reports
  app.get(
    '/api/download-kyc-compliance-report/:id',
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
          kycComplianceReportResp.s3_url.indexOf('kyc_compliance'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);
        res.attachment(url);
        let filename = `kycComplianceReport${Date.now()}.xlsx`;
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

  // Api to generate kyc-compliance_report
  app.post(
    '/api/kyc-compliance-report',

    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res) => {
      try {
        const data = req.body;
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

        // Fetch kyc compliance records according to the filters
        const kycComplianceRecords =
          await ComplianceSchema.getFilteredKycComplianceRecords(data);

        let productResp = {};
        if (data.product_id) {
          // Fetch product details
          productResp = await ProductSchema.findById(data.product_id);
        }
        // productResp = aw
        let productIds = [];
        kycComplianceRecords.forEach((record) => {
          productIds.push(record.product_id);
        });

        let productData = await ProductSchema.findKLIByIds(productIds);

        let reportPayload = [];

        const loanAppIds = [];

        kycComplianceRecords.forEach((record) => {
          loanAppIds.push(record.loan_app_id);
        });

        const leads = await LoanRequestSchema.getByLAIds(loanAppIds);

        let leadsObject = {};

        Array.from(leads).forEach((row) => {
          leadsObject[row.loan_app_id] = row;
        });

        Array.from(kycComplianceRecords).forEach((row) => {
          var product = productData.find((product) => {
            if (product._id === row.product_id) return product.party_type;
          });

          reportPayload.push({
            company_id: row?.company_id || '',
            product_id: row?.product_id || '',
            loan_app_id: row?.loan_app_id || '',
            loan_id: leadsObject[row?.loan_app_id]?.loan_id || '',
            ckyc_status: row?.ckyc_status || '',
            pan_status: row?.pan_status || '',
            bureau_status: row?.bureau_status || '',
            pan: row?.pan || '',
            dob: row?.dob || '',
            first_name: leadsObject[row?.loan_app_id]?.first_name || '',
            user_id: row?.user_id || '',
            cust_id: row?.cust_id || '',
            ckyc_search: row?.ckyc_search || '',
            ckyc_number: row?.ckyc_number || '',
            name_match: row?.name_match || '',
            name_match_conf: row?.name_match_conf || '',
            pincode_match: row?.pincode_match || '',
            party_type: product?.party_type || '',
            pincode_match_add_type: row?.pincode_match_add_type || '',
            ckyc_match: row?.ckyc_match || '',
            selfie_received: row?.selfie_received || '',
            pan_received: row?.pan_received || '',
            pan_verified: row?.pan_verified || '',
            parsed_pan_number: row?.parsed_pan_number || '',
            aadhaar_received: row?.aadhaar_received || '',
            aadhaar_verified: row?.aadhaar_verified || '',
            parsed_aadhaar_number: row?.parsed_aadhaar_number || '',
            aadhaar_match: row?.aadhaar_match || '',
            pan_match: row?.pan_match || '',
            okyc_required: row?.okyc_required || '',
            okyc_completed: row?.okyc_completed || '',
            download_ckyc: row?.download_ckyc || '',
            ckyc_required: row?.ckyc_required || '',
            loan_created_at: row.loan_created_at
              ? moment(row.loan_created_at).format('YYYY-MM-DD HH:mm:ss')
              : '',
            created_at: row.created_at
              ? moment(row.created_at).format('YYYY-MM-DD HH:mm:ss')
              : '',
            created_by: row?.created_by || '',
            updated_at: row.updated_at
              ? moment(row?.updated_at).format('YYYY-MM-DD HH:mm:ss')
              : '',
            updated_by: row?.updated_by || '',
            ckyc_updated_at: row.ckyc_updated_at
              ? moment(row.ckyc_updated_at).format('YYYY-MM-DD HH:mm:ss')
              : '',
            ckyc_uploaded_at: row.ckyc_uploaded_at
              ? moment(row.ckyc_uploaded_at).format('YYYY-MM-DD HH:mm:ss')
              : '',
            manual_kyc: row?.manual_kyc || '',
          });
        });

        if (!kycComplianceRecords.length)
          throw {
            success: false,
            message: 'No KYC Compliance records found against provided filter',
          };
        // Convert json to excel structure
        var xls = json2xls(reportPayload, {
          fields: [
            'company_id',
            'product_id',
            'loan_app_id',
            'loan_id',
            'ckyc_status',
            'pan_status',
            'bureau_status',
            'pan',
            'dob',
            'first_name',
            'resi_addr_ln1',
            'resi_addr_ln2',
            'user_id',
            'cust_id',
            'party_type',
            'ckyc_search',
            'ckyc_number',
            'name_match',
            'name_match_conf',
            'pincode_match',
            'pincode_match_add_type',
            'ckyc_match',
            'selfie_received',
            'pan_received',
            'pan_verified',
            'parsed_pan_number',
            'aadhaar_received',
            'aadhaar_verified',
            'parsed_aadhaar_number',
            'aadhaar_match',
            'pan_match',
            'okyc_required',
            'okyc_completed',
            'download_ckyc',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
            'ckyc_updated_at',
            'ckyc_uploaded_at',
            'loan_created_at',
            'ckyc_required',
            'manual_kyc',
          ],
        });

        let company_code_name = '';
        let randomNumber = Math.floor(10000 + Math.random() * 99999);
        if (req?.company?.code) {
          //company_code_name = `/${req.company.code}`
          company_code_name = `${
            req?.company?.code ? req?.company?.code : 'all_partners'
          }`;
        }

        //Generate file name according to provided filter
        let fileName = `kycComplianceConfirmation_${company_code_name}_${
          data.product_id ? data.product_id : 'all'
        }_${data.from_date ? data.from_date : randomNumber}_${
          data.to_date ? data.to_date : ''
        }.xlsx`;

        // Convert json to xlsx format
        const localFilePath = await disbursementReportHelper.convertJsonToExcel(
          fileName,
          xls,
        );
        // upload generated report to S3

        const filePathInS3 = `kyc_compliance${company_code_name}/${
          data.product_id ? data.product_id : 'all'
        }/${data.from_date ? data.from_date : randomNumber}_${
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
          company_name: req.company?.name || '',
          company_code: req.company?.code || '',
          product_name: data.product_id ? productResp.name : '',
          product_id: data.product_id ? data.product_id : '',
          company_id: data.company_id ? data.company_id : '',
          report_name: 'kyc_compliance',
          from_date: data.from_date ? data.from_date : '',
          to_date: data.to_date ? data.to_date : '',
        };

        const recordGenereatedReport =
          await disbursementReportHelper.recordGenereatedReport(reportData);

        if (!recordGenereatedReport)
          throw {
            success: false,
            message: 'Error while recording generated report',
          };
        return res.status(200).send({
          message: 'KYC Compliance report generated successfully.',
          data: recordGenereatedReport,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

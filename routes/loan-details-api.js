bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const LoanTypeSchema = require('../models/loan-default-types-schema.js');
const EkycProcessStoreSchema = require('../models/ekyc_process_store_schema.js');
const Company = require('../models/company-schema');
const LoanValidationSchema = require('../models/loan-validation-records-schema.js');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const DefaultServices = require('../models/services-schema');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const jwt = require('../util/jwt');
const validate = require('../util/validate-req-body.js');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const asyncLib = require('async');
const service = require('../services/mail/mail.js');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
const services = require('../util/service');
const repayment = require('../util/repayment');
const middlewares = require('../utils/middlewares.js');
const intrestDpdConfigRevision = require('../models/intrest-dpd-config-revision-schema.js');
const mails = require('../services/mail/genericMails.js');
const LOCCreditlimitSchema = require('../models/loc-credit-limit-schema');
const LoanStateSchema = require('../models/loan-state-schema');
const CollateralSchema = require('../models/collateral-schema');
const InsuranceMisSchema = require('../models/insurance-mis-schema');
const ComplianceSchema = require('../models/compliance-schema');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/loandetails/:loan_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const loanResponseData = await BorrowerinfoCommon.findOneWithKBIORKLI(
          req.params.loan_id,
        );
        if (!loanResponseData)
          throw {
            message: 'No records found for loan id or borrower id',
          };
        if (req.company._id !== loanResponseData.company_id)
          throw {
            message: 'Loan id is not associated with company',
          };
        if (req.product._id !== loanResponseData.product_id)
          throw {
            message: 'Loan id is not associated with product',
          };

        const leadResponseData = await LoanRequestSchema.findIfExists(
          loanResponseData.loan_app_id,
        );
        if (!leadResponseData)
          throw {
            message: 'No records found',
          };
        if (req.company._id !== leadResponseData.company_id)
          throw {
            message: 'Lead is not associated with company',
          };
        if (req.product._id !== leadResponseData.product_id)
          throw {
            message: 'Lead is not associated with product',
          };

        let creditLimitData = {};
        if (req?.product?.allow_loc) {
          creditLimitData = await LOCCreditlimitSchema.checkCreditLimit(
            loanResponseData.loan_id,
          );
          if (!creditLimitData) creditLimitData = null;
          else creditLimitData = creditLimitData.toObject();
        }

        let collateralData = {};

        collateralData = await CollateralSchema.findOneWithKLID(
          loanResponseData.loan_id,
        );
        if (collateralData) collateralData = collateralData.toObject();

        let loanStateData = await LoanStateSchema.findOne({
          loan_id: loanResponseData.loan_id,
        });
        if (loanStateData) loanStateData = loanStateData.toObject();

        let insuranceDetails = await InsuranceMisSchema.findByLoanId(
          req.params.loan_id,
        );

        let complianceDetails = await ComplianceSchema.findByLoanAppId(
          loanResponseData.loan_app_id,
        );

        if (insuranceDetails) insuranceDetails = insuranceDetails.toObject();
        const responseData = Object.assign(
          {},
          loanStateData,
          leadResponseData.toObject(),
          loanResponseData.toObject(),
          creditLimitData,
          collateralData,
          insuranceDetails,
        );
        responseData.prin_os = responseData?.prin_os?.toString();
        responseData.int_os = responseData?.int_os?.toString();

        responseData.CKYC_NUMBER =
          complianceDetails.length != 0
            ? complianceDetails[0].ckyc_number
            : 'NA';
        responseData.CKYC_MATCH =
          complianceDetails.length != 0 && complianceDetails[0].ckyc_match
            ? complianceDetails[0].ckyc_match == 'Y'
              ? 'YES'
              : 'NO'
            : 'NA';

        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'loan',
        );
        if (!loanTemplate)
          throw {
            message: 'No records found',
          };

        const leadTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'lead',
        );
        if (!leadTemplate)
          throw {
            message: 'No records found',
          };
        //fetch the custom template json data from s3 by path
        const loanResultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        const leadResultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(leadTemplate.path.indexOf('templates')),
        );

        let customer_information = {};
        if (req?.product?.party_type === 'Non Individual') {
          customer_information = {
            fields: [
              'bus_name',
              'bus_pan',
              'doi',
              'bus_entity_type',
              'bus_add_corr_line1',
              'bus_add_corr_line2',
              'bus_add_corr_city',
              'bus_add_corr_state',
              'bus_add_corr_pincode',
              'bus_add_per_line1',
              'bus_add_per_line2',
              'bus_add_per_city',
              'bus_add_per_state',
              'bus_add_per_pincode',
            ],
          };
        } else {
          customer_information = {
            fields: [
              'first_name',
              'last_name',
              'type_of_addr',
              'resi_addr_ln1',
              'city',
              'state',
              'pincode',
              'appl_pan',
              'dob',
              'CKYC_NUMBER',
              'CKYC_MATCH',
              'sanction_match_status',
              'sanction_match_count',
            ],
          };
        }
        const loanSummaryFields = [
          'loan_id',
          'sanction_amount',
          ...(req?.product?.allow_loc === 1 ? [] : ['net_disbur_amt']),
          'final_approve_date',
          'status',
          'dpd',
          'prin_overdue',
          'int_overdue',
          'late_payment_penalty',
          'bounce_charges',
          'additional_charges',
          'available_balance',
          'prin_os',
          'int_os',
          'upi_handle',
        ];

        const collateral_details = {
          fields: [
            'vehicle_brand',
            'vehicle_model',
            'vehicle_sub_model',
            'vehicle_type',
            'invoice_number',
            'invoice_date',
            'invoice_amount',
            'engine_number',
            'chassis_number',
            'insurance_partner_name',
            'policy_number',
            'policy_issuance_date',
            'policy_expiry_date',
            'vehicle_registration_number',
          ],
        };

        if (req.product.subvention_based) {
          loanSummaryFields.push(
            'subvention_fees_amount',
            'gst_on_subvention_fees',
          );
        }

        const insurance_details = {
          fields: [
            'master_policy_number',
            'policy_number',
            'policy_status',
            'insurance_provider',
            'policy_start_date',
            'policy_end_date',
            'policy_issuance_date',
            'policy_premium',
            'net_premium',
            'cgst',
            'sgst',
            'igst',
            'ugst',
          ],
        };

        const other = {
          fields: ['scr_match_result', 'scr_match_count'],
        };

        const loan_summary = {
          fields: loanSummaryFields,
        };
        let fieldDepartmentMapper = {};
        Object.assign(fieldDepartmentMapper, {
          customer_information,
          loan_summary,
        });
        const resultJson = [...loanResultJson, ...leadResultJson];
        resultJson
          .filter(
            (i) =>
              i.checked.toLowerCase() === 'true' ||
              (i.hasOwnProperty('displayOnUI') &&
                i.displayOnUI.toLowerCase() === 'true' &&
                responseData[i.field] !== '' &&
                responseData[i.field] !== null &&
                responseData[i.field] !== 'null' &&
                responseData[i.field] !== 'undefined' &&
                responseData[i.field] !== undefined),
          )
          .forEach((item) => {
            if (!fieldDepartmentMapper[item.dept]) {
              fieldDepartmentMapper[item.dept] = {};
              fieldDepartmentMapper[item.dept]['fields'] = [];
            }
            if (!fieldDepartmentMapper[item.dept].fields.includes(item.field)) {
              fieldDepartmentMapper[item.dept].fields.push(item.field);
            }
          });
        if (collateralData)
          fieldDepartmentMapper.collateral_details = collateral_details;

        if (insuranceDetails)
          fieldDepartmentMapper.insurance_details = insurance_details;
        
        if (responseData?.subscription_id &&
            responseData?.subscription_status &&
            responseData?.subscription_amount &&
            responseData?.subscription_start_date &&
            responseData?.subscription_customer_name)
        {
            let nach_fields = [
              'nach_registration_id',
              'nach_registration_status',
              'nach_amount',
              'nach_start_date',
              'nach_end_date',
              'nach_account_number',
              'nach_account_holder_name'
            ];

            responseData.nach_registration_id = responseData.subscription_id;
            responseData.nach_amount = responseData.subscription_amount;
            responseData.nach_account_holder_name = responseData.subscription_customer_name;
            responseData.nach_start_date = moment(responseData.subscription_start_date).format('YYYY-MM-DD');
            responseData.nach_end_date = responseData?.subscription_end_date?moment(responseData.subscription_end_date).format('YYYY-MM-DD'):"NA";
            responseData.nach_account_number = responseData?.subscription_account_no||"NA";
            responseData.nach_registration_status = responseData.subscription_status[0].toUpperCase()+responseData.subscription_status.slice(1);

            if (responseData?.subscription_umrn) {
              nach_fields.push('umrn');
              responseData.umrn = responseData?.subscription_umrn;
            }

            if (responseData?.subscription_remarks) {
              nach_fields.push('nach_remarks');
              responseData.nach_remarks = responseData?.subscription_remarks;
            }

            const NACH_details={
              fields: nach_fields,
            };
            fieldDepartmentMapper.NACH_details = NACH_details;
        }

        return res.send({
          data: responseData,
          resultJson,
          fieldDepartmentMapper,
          allowLoc: req?.product?.allow_loc,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

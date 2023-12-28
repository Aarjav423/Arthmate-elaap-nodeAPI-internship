bodyParser = require('body-parser');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const validateLoanFlow = require('../util/validate-loan-flow.js');
const helper = require('../util/helper');
const disbursementChannel = require('../models/disbursement-channel-config-schema.js');
const s3helper = require('../util/s3helper');
const validate = require('../util/validate-req-body');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const kycValidation = require('../util/kyc-validation');
const cacheUtils = require('../util/cache');
let reqUtils = require('../util/req.js');
const ekycDataFields = require('../models/ekyc_data_fields_schema');
const ekycProcess = require('../models/ekyc_process_store_schema');
const loanedits = require('../util/loanedits.js');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const middlewares = require('../utils/middlewares.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //create loan process flow
  app.post(
    '/api/loan_process_flow',
    [check('loan_id').notEmpty().withMessage('loan id is required')],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const borrowerResp = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (
          borrowerResp.status !== 'open' ||
          borrowerResp.status !== 'kyc_data_approved' ||
          borrowerResp.status !== 'credit_approved' ||
          borrowerResp.status !== 'disbursal_approved'
        )
          throw {
            message: `Unable to change loan status as loan is already in ${borrowerResp.status} status`,
          };
        const lrData = await LoanRequestSchema.findIfExists(data.loan_id);
        if (loanedits.mappingStatuses[data.status] !== borrowerResp.status)
          throw {
            message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
          };
        data.stage = loanedits.mappingStages[data.status];
        //Case 1
        if (data.stage == ' kyc_data_approved') {
          if (data.pan_kyc_id == '' || data.ckyc_id == '')
            throw {
              message: 'pan_kyc_id or ckyc_id is required.',
            };
          if (borrowerResp.status !== 'open')
            throw {
              message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
            };
          const docResp = await kycValidation.CheckMandatoryDocUpload(
            req.loanSchema._id,
            data.loan_id,
          );
          if (!docResp.success)
            throw {
              message: docResp,
            };
          if (borrowerResp.status !== 'open' && reqData.pan_kyc_id) {
            var panPath = `${s3_url}/PAN-BOOKING/${process.env.SERVICE_BOOKING_PAN_KYC_ID}/${req.company._id}/${req.company.code}/success/${data.pan_kyc_id}.json`;
            const panResp = await kycValidation.verifyPanKyc(panPath, lrData);
            if (!panResp)
              throw {
                message: 'Error while validating pan id',
              };
          }
          if (borrowerResp.status !== 'open' && reqData.ckyc_id) {
            var ckycPath = `${s3_url}/BOOKING-CKYC-SEARCH/${process.env.SERVICE_BOOKING_CKYC_SEARCH_JSON}/${req.company._id}/${req.company.code}/success/${data.ckyc_id}.json`;
            const ckycResp = await kycValidation.verifyCkyc(ckycPath, lrData);
            if (!ckycResp)
              throw {
                message: 'Error while validating ckyc id',
              };
          }
          data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
          data.stage = loanedits.mappingStages['kyc_data_approved'];
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            data,
            data.loan_id,
          );
          if (!updateStatusResp)
            throw {
              message: 'Failed to update loan status',
            };
          return {
            message: `Loan status updated to ${data.status} successfully.`,
            updateResp: updateStatusResp,
          };
        }
        //Case 2
        if (data.stage == ' credit_approved') {
          if (data.bureau_id == '')
            throw {
              message: 'Bureau id  is required.',
            };
          if (borrowerResp.status !== 'kyc_data_approved')
            throw {
              message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
            };
          const checkApprAmount = await helper.checkApprovalAmountThreshold(
            user,
            data.sanction_amount,
          );
          if (!checkApprAmount)
            throw {
              message: 'Insufficient previlages to perform this action',
            };
          var pennydropPath = `${s3_url}/GRID-BUREAU-DETAILS/${process.env.SERVICE_BUREAU_ID}/${req.company._id}/${req.company.code}/success/${data.pennydrop_id}.json`;
          const getBureauDetailsFromS3 =
            await validateLoanFlow.fetchBureauDetailsFromS3(
              pennydropPath,
              data.bureau_id,
            );
          if (!getBureauDetailsFromS3)
            throw {
              message: 'Error while fetching bureau details',
            };
          const checkCreditGrid = await creditGridSchema.getActiveGrid(
            product._id,
          );
          if (checkCreditGrid) {
            const creditGridReport = validateLoanFlow.processCreditGridData(
              checkCreditGrid,
              getBureauDetailsFromS3,
            );
            if (!creditGridReport)
              throw {
                message: 'Error while matching credit grid',
              };
          }
          data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
          data.stage = loanedits.mappingStages['credit_approved'];
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            data,
            data.loan_id,
          );
          if (!updateStatusResp)
            throw {
              message: 'Failed to update loan status',
            };
          return {
            message: `Loan status updated to ${data.status} successfully.`,
            updateResp: updateStatusResp,
          };
        }
        //Case 3
        if (data.stage == 'disbursal_approved') {
          if (data.pennydrop_id == '')
            throw {
              message: 'Penny drop id  is required.',
            };
          if (borrowerResp.status !== 'credit_approved')
            throw {
              message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
            };
          var pennydropPath = `${s3_url}/BANK-ACC-NUM-KYC/${process.env.SERVICE_BANK_ACC_NUMBER_KYC_ID}/${req.company._id}/${req.company.code}/success/${data.pennydrop_id}.json`;
          const pennyDropDetailsResp =
            await kycValidation.verifyBankAcctAndIFSCCode(
              pennydropPath,
              lrData,
            );
          if (!pennyDropDetailsResp)
            throw {
              message: 'Error while fetching penny drop details',
            };
          const fldgBalanceResp = await validateLoanFlow.checkPoolFLDGBalance();
          if (!fldgBalanceResp)
            throw {
              message: 'Error while checking balance details',
            };
          data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
          data.disbursal_approve_date = moment().format('YYYY-MM-DD');
          data.stage = loanedits.mappingStages['disbursal_approved'];
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            data,
            data.loan_id,
          );
          if (!updateStatusResp)
            throw {
              message: 'Failed to update loan status',
            };
          return {
            message: `Loan status updated to ${data.status} successfully.`,
            updateResp: updateStatusResp,
          };
        }
        //Case 4
        if (data.stage == 'disbursed') {
          if (borrowerResp.status !== 'disbursal_approved')
            throw {
              message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
            };
          if (borrowerDetails.status == 'disbursed' && !borrowerDetails.UTR) {
            throw {
              message: 'something went wrong, please contact system admin',
            };
          }
          const dibursementChannelConfig =
            disbursementChannel.findByCompanyAndProductId(
              company._id,
              product._id,
            );
          if (!dibursementChannelConfig)
            throw {
              message:
                'Disbursement channel is not configured for the selected product',
            };
          //1. Check for the type of beneficiary
          //2. Send money to beneficiary based on disbursement channel configured.
          data.disburse_date = moment().format('YYYY-MM-DD');
          data.stage = loanedits.mappingStages['disbursed'];
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            data,
            data.loan_id,
          );
          if (!updateStatusResp)
            throw {
              message: 'Failed to update loan status',
            };
          return {
            message: `Loan status updated to ${data.status} successfully.`,
            updateResp: updateStatusResp,
          };
        }
        //Case 5
        if (data.stage == 'end_to_end') {
          if (data.pan_kyc_id == '' || data.ckyc_id == '')
            throw {
              message: 'Pan or Ckyc id is required.',
            };
          if (data.bureau_id == '')
            throw {
              message: 'Bureau id  is required.',
            };
          if (data.pennydrop_id == '')
            throw {
              message: 'Penny drop id  is required.',
            };
          if (borrowerDetails.status !== 'open')
            throw {
              message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
            };
          const docResp = await kycValidation.CheckMandatoryDocUpload(
            req.loanSchema._id,
            data.loan_id,
          );
          if (!docResp.success)
            throw {
              message: docResp,
            };
          if (reqData.pan_kyc_id) {
            var panPath = `${s3_url}/PAN-BOOKING/${process.env.SERVICE_BOOKING_PAN_KYC_ID}/${req.company._id}/${req.company.code}/success/${data.pan_kyc_id}.json`;
            const panResp = await kycValidation.verifyPanKyc(panPath, lrData);
            if (!panResp)
              throw {
                message: 'Error while validating pan id',
              };
          }
          if (reqData.ckyc_id) {
            var ckycPath = `${s3_url}/BOOKING-CKYC-SEARCH/${process.env.SERVICE_BOOKING_CKYC_SEARCH_JSON}/${req.company._id}/${req.company.code}/success/${data.ckyc_id}.json`;
            const ckycResp = await kycValidation.verifyCkyc(ckycPath, lrData);
            if (!ckycResp)
              throw {
                message: 'Error while validating ckyc id',
              };
          }
          //fetching bureau details.
          const checkApprAmount = await helper.checkApprovalAmountThreshold(
            user,
            data.sanction_amount,
          );
          if (!checkApprAmount)
            throw {
              message: 'Insufficient previlages to perform this action',
            };
          const getBureauDetailsFromS3 =
            await validateLoanFlow.fetchBureauDetailsFromS3(
              pennydropPath,
              data.bureau_id,
            );
          if (!getBureauDetailsFromS3)
            throw {
              message: 'Error while fetching bureau details',
            };
          const checkCreditGrid = await creditGridSchema.getActiveGrid(
            product._id,
          );
          if (checkCreditGrid) {
            const creditGridReport = validateLoanFlow.processCreditGridData(
              checkCreditGrid,
              getBureauDetailsFromS3,
            );
            if (!creditGridReport)
              throw {
                message: 'error file processing credit grid report',
              };
          }
          //fetching penny drop details.
          const pennyDropDetailsResp =
            await validateLoanFlow.fetchingPennyDropDetailsFromS3(
              data.pennydrop_id,
            );
          if (!pennyDropDetailsResp)
            throw {
              message: 'Error while fetching penny drop details',
            };
          const fldgBalanceResp = await validateLoanFlow.checkPoolFLDGBalance();
          if (!fldgBalanceResp)
            throw {
              message: 'Error while checking balance details',
            };
          //Disbursed details
          const dibursementChannelConfig =
            await disbursementChannel.findByCompanyAndProductId(
              company._id,
              product._id,
            );
          if (!dibursementChannelConfig)
            throw {
              message:
                'Disbursement channel is not configured for the selected product',
            };
          //1. Check for the type of beneficiary
          //2. Send money to beneficiary based on disbursement channel configured.
          data.disburse_date = moment().format('YYYY-MM-DD');
          data.stage = loanedits.mappingStages['disbursed'];
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            data,
            data.loan_id,
          );
          if (!updateStatusResp)
            throw {
              message: 'Failed to update loan status',
            };
          return {
            message: `Loan status updated to ${data.status} successfully.`,
            updateResp: updateStatusResp,
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );
};

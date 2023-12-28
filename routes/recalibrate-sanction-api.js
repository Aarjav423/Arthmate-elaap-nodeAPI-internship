module.exports = (app, connection) => {
  app.use(bodyParser.json());
  const jwt = require('../util/jwt');
  const moment = require('moment');
  const { getAge } = require('../utils/kyc-services.js');
  const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
  const LoanRequestSchema = require('../models/loan-request-schema.js');
  const BorrowerInsuranceSchema = require('../models/borrower-insurance-details-schema.js');
  const InsurancePricingSchema = require('../models/insurance-pricing-schema.js');
  const { check, validationResult } = require('express-validator');
  const borrowerHelper = require('../util/borrower-helper.js');
  const recalibrateHelper = require('../util/recalibrate-sanction-helper.js');
  const insuranceHelper = require('../util/insurance-policy-helper.js');
  const validate = require('../util/validate-req-body.js');
  const calculation = require('../util/calculation');
  const repayment = require('../util/repayment');
  const chargesHelper = require('../util/charges.js');
  const ChargesSchema = require('../models/charges-schema.js');
  const IssuePolicyStagingSchema = require('../models/issue-policy-staging-schema.js');
  const PolicyPremiumRateSchema = require('../models/insurance-base-policy-premium-rate-schema.js');

  const validateLoanPatchSanctionTenureData = async (req, res, next) => {
    try {
      const template = [
        {
          field: 'sanction_amount',
          type: 'float',
          checked: 'TRUE',
          validationmsg: 'Please enter valid sanction_amount.',
        },
        {
          field: 'tenure',
          type: 'number',
          checked: 'TRUE',
          validationmsg: 'Please enter valid tenure',
        },
        {
          field: 'gst_on_pf_amt',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid gst_on_pf_amount',
        },
        {
          field: 'processing_fees_amt',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid processing_fee_amount',
        },
        {
          field: 'total_charges',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid total_charges',
        },
        {
          field: 'net_disbur_amt',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid net_disbur_amt',
        },
        {
          field: 'fees',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid fees',
        },
        {
          field: 'subvention_fees',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid subvention_fees',
        },
        {
          field: 'subvention_fee_per',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid subvention_fee_per',
        },
        {
          field: 'usage_fee',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid usage_fee',
        },
        {
          field: 'upfront_interest',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid upfront_interest',
        },
        {
          field: 'insurance_amount',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid upfront_interest',
        },
        {
          field: 'processing_fees_perc',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid processing_fees_perc',
        },
        {
          field: 'conv_fees',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid conv_fees',
        },

        {
          field: 'application_fees',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid application_fees',
        },
        {
          field: 'invoice_amount',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid invoice_amount',
        },
        {
          field: 'emi_amount',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid emi_amount',
        },
        {
          field: 'emi_count',
          type: 'number',
          checked: 'FALSE',
          validationmsg: 'Please enter valid emi_count',
        },
        {
          field: 'broken_period_int_amt',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid broken_period_int_amt',
        },
        {
          field: 'loan_int_amt',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid loan_int_amt',
        },
        {
          field: 'first_inst_date',
          type: 'date',
          checked: 'FALSE',
          validationmsg: 'Please enter valid first_inst_date',
        },
        {
          field: 'loan_int_rate',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'Please enter valid loan_int_rate',
        },
        {
          field: 'final_approve_date',
          type: 'date',
          checked: 'FALSE',
          validationmsg: 'Please enter valid final_approve_date',
        },
      ];
      //validate request data with above data
      const result = await validate.validateDataWithTemplate(template, [
        req.body,
      ]);
      if (!result)
        throw {
          success: false,
          message: 'Error while validating data with template.',
        };
      if (result.unknownColumns.length)
        throw {
          success: false,
          message: 'Few columns are unknown',
          data: {
            unknownColumns: result.unknownColumns,
          },
        };
      if (result.missingColumns.length)
        throw {
          success: false,
          message: 'Few columns are missing',
          data: {
            missingColumns: result.missingColumns,
          },
        };
      if (result.errorRows.length)
        throw {
          success: false,
          message: 'Few fields have invalid data',
          data: {
            exactErrorRows: result.exactErrorColumns,
            errorRows: result.errorRows,
          },
        };
      if (result.exactEnumErrorColumns.length)
        throw {
          success: false,
          message: `${result.exactEnumErrorColumns[0]}`,
          errorCode: '02',
          data: {
            exactEnumErrorColumns: result.exactEnumErrorColumns,
          },
        };
      next();
    } catch (error) {
      return res.status(400).send(error);
    }
  };

  app.patch(
    '/api/recalibrate-sanction/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    validateLoanPatchSanctionTenureData,
    [
      check('sanction_amount')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('sanction_amount is required'),
      check('tenure')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('tenure is required'),
      check('gst_on_pf_amt')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('gst_on_pf_amt is required'),
      check('total_charges')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('total_charges is required'),
      check('net_disbur_amt')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('net_disbur_amt is required'),
      check('fees')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('fees is required'),
      check('subvention_fees')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('subvention_fees is required'),
      check('subvention_fee_per')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('subvention_fee_per is required'),
      check('usage_fee')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('usage_fee is required'),
      check('upfront_interest')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('upfront_interest is required'),
      check('insurance_amount')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('insurance_amount is required'),
      check('processing_fees_perc')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('processing_fees_perc is required'),
      check('processing_fee_amount')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('processing_fee_amount is required'),
      check('conv_fees')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('conv_fees is required'),
      check('application_fees')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('application_fees is required'),
      check('invoice_amount')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('invoice_amount is required'),
      check('emi_amount')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('emi_amount is required'),
      check('emi_count')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('emi_count is required'),
      check('broken_period_int_amt')
        .optional({ checkFalsy: false })
        .isNumeric()

        .withMessage('broken_period_int_amt is required'),
      check('loan_int_amt')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('loan_int_amt is required'),
      check('first_inst_date')
        .optional({ checkFalsy: false })
        .isDate()
        .withMessage('first_inst_date is required'),
      check('loan_int_rate')
        .optional({ checkFalsy: false })
        .isNumeric()
        .withMessage('loan_int_rate is required'),
      check('final_approve_date')
        .optional({ checkFalsy: false })
        .isDate()
        .withMessage('final_approve_date is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        let IssuePolicyStagingData = null;
        // Validate the input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });

        // Validate the input data
        const validatePayload =
          await recalibrateHelper.validateRecalibratePayload(req, res);
        if (!validatePayload.success) throw validatePayload;

        const leadResp = await LoanRequestSchema.findIfExists(
          req.loanData.loan_app_id,
        );
        if (!leadResp)
          throw {
            success: false,
            message: 'No lead found against provided loan_app_id.',
          };
        let leadsData = JSON.parse(JSON.stringify(leadResp));
        let borrowerData = JSON.parse(JSON.stringify(req.loanData));
        req.lmsPostData = Object.assign(leadsData, borrowerData);
        //Validate if broken_period_int_amt is passed in payload if calculate_broken_interest flag is on
        if (
          req.product.calculate_broken_interest &&
          !data.broken_period_int_amt.toString()
        )
          throw {
            success: false,
            message: 'broken_period_int_amt is required.',
          };

        //Prepare the data to update
        let updateObj = {
          sanction_amount: data.sanction_amount
            ? Number(data.sanction_amount)
            : 0,
          tenure: data.tenure ? Number(data.tenure) : 0,
          gst_on_pf_amt: data.gst_on_pf_amt ? Number(data.gst_on_pf_amt) : 0,
          total_charges: data.total_charges ? Number(data.total_charges) : 0,
          net_disbur_amt: data.net_disbur_amt ? Number(data.net_disbur_amt) : 0,
          fees: data.fees ? Number(data.fees) : 0,
          subvention_fees: data.subvention_fees
            ? Number(data.subvention_fees)
            : 0,
          subvention_fee_per: data.subvention_fee_per
            ? Number(data.subvention_fee_per)
            : 0,
          usage_fee: data.usage_fee ? Number(data.usage_fee) : 0,
          upfront_interest: data.upfront_interest
            ? Number(data.upfront_interest)
            : 0,
          insurance_amount: data.insurance_amount
            ? Number(data.insurance_amount)
            : 0,
          processing_fees_perc: data.processing_fees_perc
            ? Number(data.processing_fees_perc)
            : 0,
          processing_fees_amt: data.processing_fees_amt
            ? Number(data.processing_fees_amt)
            : 0,
          conv_fees: data.conv_fees ? Number(data.conv_fees) : 0,
          application_fees: data.application_fees
            ? Number(data.application_fees)
            : 0,
          invoice_amount: data.invoice_amount ? Number(data.invoice_amount) : 0,
          emi_amount: data.emi_amount ? Number(data.emi_amount) : 0,
          emi_count: data.emi_count ? Number(data.emi_count) : 0,
          broken_interest: data.broken_period_int_amt
            ? Number(data.broken_period_int_amt)
            : 0,
          broken_period_int_amt: data.broken_period_int_amt
            ? Number(data.broken_period_int_amt)
            : 0,
          loan_int_amt: data.loan_int_amt ? Number(data.loan_int_amt) : 0,
        };
        //Add first_inst_date and loan_int_rate to updateObj, only if received from payload.
        if (
          data.first_inst_date &&
          data['first_inst_date'] != undefined &&
          data['first_inst_date'] != null
        ) {
          //Add first_inst_date to updateObj.
          updateObj['first_inst_date'] = moment(data.first_inst_date).format(
            'YYYY-MM-DD',
          );
        }

        //Add final_approve_date and loan_int_rate to updateObj, only if received from payload.
        if (
          data.final_approve_date &&
          data['final_approve_date'] != undefined &&
          data['final_approve_date'] != null
        ) {
          //Add final_approve_date to updateObj.
          updateObj['final_approve_date'] = moment(
            data.final_approve_date,
          ).format('YYYY-MM-DD');
        }
        if (
          data.loan_int_rate &&
          data['loan_int_rate'] !== undefined &&
          data['loan_int_rate'] !== null
        ) {
          //Add loan_int_rate to updateObj.
          updateObj['loan_int_rate'] = data.loan_int_rate
            ? data.loan_int_rate
            : 0;
        }

        req.lmsPostData.net_disbur_amt = updateObj.net_disbur_amt;
        req.lmsPostData.sanction_amount = updateObj.sanction_amount;
        req.lmsPostData.tenure = updateObj.tenure;
        req.lmsPostData.gst_on_pf_amt = updateObj.gst_on_pf_amt;
        req.lmsPostData.total_charges = updateObj.total_charges;
        req.lmsPostData.fees = updateObj.fees;
        req.lmsPostData.subvention_fees = updateObj.subvention_fees;
        req.lmsPostData.usage_fee = updateObj.usage_fee;
        req.lmsPostData.upfront_interest = updateObj.upfront_interest;
        req.lmsPostData.insurance_amount = updateObj.insurance_amount;
        req.lmsPostData.processing_fees_perc = updateObj.processing_fees_perc;
        req.lmsPostData.processing_fees_amt = updateObj.processing_fees_amt;
        req.lmsPostData.conv_fees = updateObj.conv_fees;
        req.lmsPostData.application_fees = updateObj.application_fees;
        req.lmsPostData.emi_count = updateObj.emi_count;
        req.lmsPostData.loan_int_amt = updateObj.loan_int_amt;
        req.lmsPostData.upfront_interest = updateObj.upfront_interest;
        req.lmsPostData.invoice_amount = updateObj.invoice_amount;
        req.lmsPostData.emi_amount = updateObj.emi_amount;
        req.lmsPostData.broken_period_int_amt = updateObj.broken_period_int_amt;
        req.lmsPostData.first_inst_date = updateObj.first_inst_date;
        req.lmsPostData.final_approve_date = updateObj.final_approve_date;
        // handle modification in gst_on_pf_amount
        const gstOnPfAmount = await recalibrateHelper.processGstOnPfAmount(
          req,
          res,
        );
        if (!gstOnPfAmount.success) throw gstOnPfAmount;
        updateObj.gst_on_pf_amt = req.lmsPostData.gst_on_pf_amt;
        updateObj.cgst_amount = req.lmsPostData.cgst_amount;
        updateObj.sgst_amount = req.lmsPostData.sgst_amount;
        updateObj.igst_amount = req.lmsPostData.igst_amount;

        // handle modification in subvention_fees
        const subventionFees = await recalibrateHelper.processSubventionFees(
          req,
          res,
        );
        if (!subventionFees.success) throw subventionFees;
        updateObj.subvention_fees_amount =
          req.lmsPostData.subvention_fees_amount;
        updateObj.gst_on_subvention_fees =
          req.lmsPostData.gst_on_subvention_fees;
        updateObj.cgst_on_subvention_fees =
          req.lmsPostData.cgst_on_subvention_fees;
        updateObj.sgst_on_subvention_fees =
          req.lmsPostData.sgst_on_subvention_fees;
        updateObj.igst_on_subvention_fees =
          req.lmsPostData.igst_on_subvention_fees;

        // handle modification in upfront_interest
        //req.body["repayment_type"] = req.lmsPostData.repayment_type;
        const upfrontInterest = await recalibrateHelper.processUpfrontInterest(
          req,
          res,
        );
        if (!upfrontInterest.success) throw upfrontInterest;
        updateObj.upfront_interest = req.lmsPostData.upfront_interest
          ? req.lmsPostData.upfront_interest
          : 0;

        // Process insurance_amount
        if (
          req.product.insurance_charges &&
          req.body.insurance_amount != null &&
          req.body.insurance_amount > 0
        ) {
          processInsurance = await insuranceHelper.loanInsuranceValidations(
            req,
            res,
            req.lmsPostData,
          );
          if (!processInsurance.success) {
            throw { success: false, message: processInsurance.message };
          }
        }

        // Record borrower insurance details
        if (
          req.body.insurance_amount != null &&
          req.body.insurance_amount > 0
        ) {
          //Check entry in insurance pricing table by company_id and product_id
          const insurancePricingRecord =
            await InsurancePricingSchema.findByCIDPID(
              req.company._id,
              req.product._id,
            );
          // Check if borrower insurance details already exist.
          const borrowerInsuranceDeatilsExist =
            await BorrowerInsuranceSchema.findByLID(req.params.loan_id);
          if (borrowerInsuranceDeatilsExist) {
            const borrowerInsuranceDetailsUpdate =
              await insuranceHelper.updateBorrowerInsuranceDetails(
                req,
                req.lmsPostData,
                req.insuranceResponse,
              );
            if (!borrowerInsuranceDetailsUpdate.success) {
              throw borrowerInsuranceDetailsUpdate;
            }
          } else {
            if (insurancePricingRecord) {
              const borrowerInsuranceData =
                await insuranceHelper.recordBorrowerInsuranceDetails(
                  req,
                  req.lmsPostData,
                  req.insuranceResponse,
                );
              if (!borrowerInsuranceData.success) {
                throw borrowerInsuranceData;
              }
            }
          }
        }

        // handle modification in conv_fees
        const convenienceFees = await recalibrateHelper.processConvenienceFees(
          req,
          res,
        );
        if (!convenienceFees.success) throw convenienceFees;
        updateObj.conv_fees = req.lmsPostData.conv_fees;
        updateObj.gst_on_conv_fees = req.lmsPostData.gst_on_conv_fees;
        updateObj.conv_fees_excluding_gst =
          req.lmsPostData.conv_fees_excluding_gst;
        updateObj.cgst_on_conv_fees = req.lmsPostData.cgst_on_conv_fees;
        updateObj.sgst_on_conv_fees = req.lmsPostData.sgst_on_conv_fees;
        updateObj.igst_on_conv_fees = req.lmsPostData.igst_on_conv_fees;

        // handle modification in application_fees
        req.lmsPostData.application_fees = req.body.application_fees;
        const applicationFees = await recalibrateHelper.processApplicationFees(
          req,
          res,
        );
        if (!applicationFees.success) throw applicationFees;
        updateObj.application_fees = req.lmsPostData.application_fees;
        updateObj.gst_on_application_fees =
          req.lmsPostData.gst_on_application_fees;
        updateObj.application_fees_excluding_gst =
          req.lmsPostData.application_fees_excluding_gst;
        updateObj.cgst_on_application_fees =
          req.lmsPostData.cgst_on_application_fees;
        updateObj.sgst_on_application_fees =
          req.lmsPostData.sgst_on_application_fees;
        updateObj.igst_on_application_fees =
          req.lmsPostData.igst_on_application_fees;
        //Pass loan id in update obj
        updateObj.loan_id = req.params.loan_id;

        // Handle charges update in charges collection.
        let charge_types = [];
        let chargesItems = [];
        if (updateObj?.processing_fees_amt * 1 >= 0) {
          charge_types.push(
            chargesHelper.createCharge(
              'Processing Fees',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );
        }

        // Add subvention fees charge
        if (updateObj?.subvention_fees * 1 >= 0) {
          charge_types.push(
            chargesHelper.createCharge(
              'Subvention Fees',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );
        }

        // Add Convenience fees charge
        if (updateObj?.conv_fees * 1 >= 0)
          charge_types.push(
            chargesHelper.createCharge(
              'Convenience Fees',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );

        // Add usage fees charge
        if (updateObj?.usage_fee * 1 >= 0)
          charge_types.push(
            chargesHelper.createCharge(
              'Usage Fees',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );

        // Add insurance amount charge
        if (updateObj?.insurance_amount * 1 >= 0)
          charge_types.push(
            chargesHelper.createCharge(
              'Insurance Amount',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );

        // Add application charge
        if (updateObj.application_fees * 1 >= 0) {
          charge_types.push(
            chargesHelper.createCharge(
              'Application Fees',
              updateObj,
              req.company._id,
              req.product._id,
            ),
          );
        }

        if (charge_types.length)
          chargesItems = [...chargesItems, ...charge_types];
        
        charge_types.forEach((chargesItems) => {
          chargesItems.updated_by = req.user.email;
        });

        //Calculate broken period amount
        const calculateBrokenInterest =
          await recalibrateHelper.processBrokenInterest(req);
        if (!calculateBrokenInterest.success) throw calculateBrokenInterest;
        if (
          req.product.calculate_broken_interest &&
          req.lmsPostData.broken_interest * 1 !== data.broken_period_int_amt * 1
        ) {
          throw {
            success: false,
            message: `Incorrect broken_period_int_amt, value should be ${req.lmsPostData.broken_interest}.`,
          };
        }
        // Calculate net diabursement amount
        const netDisbAmount = await recalibrateHelper.processNetDisbAmount(req);
        if (!netDisbAmount.success) throw netDisbAmount;

        // Generate repayment schedule
        const repaymentScheduleData = {
          repayment_type: req.lmsPostData.repayment_type,
          int_type:
            req.product.interest_type === 'upfront'
              ? 'flat'
              : req.lmsPostData.int_type
              ? req.lmsPostData.int_type
              : req.product.interest_rate_type,
          emi_count: req.lmsPostData.emi_count,
          sanction_amount: req.body.sanction_amount,
          intr_rate: req.body.loan_int_rate
            ? Number(req.body.loan_int_rate)
            : String(req.product.int_value).replace(/[a-zA-Z]+/g, '') * 1,
          first_inst_date: moment(req.body.first_inst_date).format(
            'YYYY-MM-DD',
          ),
        };

        //Update first_inst_date and intr_rate in repayment schedule data, only if we receive these attributes from payload.
        if (
          data.first_inst_date &&
          data['first_inst_date'] != undefined &&
          data['first_inst_date'] != null
        ) {
          //Update first_inst_date in repaymentScheduleData.
          repaymentScheduleData['first_inst_date'] = moment(
            data.first_inst_date,
          ).format('YYYY-MM-DD');
        } else if (
          data.loan_int_rate &&
          data['loan_int_rate'] != undefined &&
          data['loan_int_rate'] != null
        ) {
          //Update loan_int_rate in repaymentScheduleData.
          repaymentScheduleData['intr_rate'] = data.loan_int_rate;
        }

        if (
          !req.product.allow_loc &&
          req.product.repayment_schedule === 'custom'
        ) {
          const repaymentSchedule = await calculation.generateRepaySch(
            repaymentScheduleData,
            req.product,
          );
          if (!repaymentSchedule.success) {
            throw {
              ...repaymentSchedule,
            };
          }
          if (repaymentSchedule) {
            const uploadRepaymentSchedule =
              await repayment.storeRepaymentSchedule(
                req,
                req.lmsPostData,
                repaymentSchedule.repaymentScheduleGenerated,
                res,
              );
            if (
              repaymentSchedule &&
              (repaymentSchedule.repaymentScheduleGenerated || []).length > 0
            ) {
              updateObj.emi_amount = Number(
                repaymentSchedule.repaymentScheduleGenerated[0].emi_amount,
              );
            }
          }
        }
        //Update necessary data in borrower info common table
        updateObj.status = 'open';
        updateObj.stage = 0;
        const loanDataUpdate = await BorrowerinfoCommon.updateBI(
          updateObj,
          req.params.loan_id,
        );
        if (!loanDataUpdate)
          throw { success: false, message: 'Error while updating loan data' };
        //Record loan status change logs
        const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
          req,
          req.params.loan_id,
          req.loanData.status,
          updateObj.status,
          'system',
        );
        if (!maintainStatusLogs.success) throw maintainStatusLogs;

        // Update charges in charges collection.
        const chargesUpdateResp =
          await ChargesSchema.updateByIdBulk(chargesItems);
        if (!chargesUpdateResp)
          throw { success: false, message: 'Error while updating charges.' };
        //
        //Update insurance details in issue policy staging collection

        if (
          req.product.insurance_charges &&
          req.body.insurance_amount != null &&
          req.body.insurance_amount > 0
        ) {
          let policyPremium = 0;
          let gstOnPolicyPremium = 0;
          let policyPremiumIncGST = 0;
          let basePolicyPremiumIncGST = 0;
          let basePolicyPremium = 0;
          let loanTenureInMonths = 0;
          let coBorrowerPremium = 0;
          const insurancePricingRecords =
            (await InsurancePricingSchema.findByCIDPID(
              req.company._id,
              req.product._id,
            )) || {};
          IssuePolicyStagingData = await IssuePolicyStagingSchema.findIfExist(
            req.params.loan_id,
          );
          let premiumMultiplier = insurancePricingRecords.premium_multiplier;
          // get tenure from the loan api convert it to the months
          if (
            req.lmsPostData.tenure_type.toLowerCase() === 'month' &&
            req.lmsPostData.tenure
          ) {
            loanTenureInMonths = req.lmsPostData.tenure * 1;
          } else if (
            req.lmsPostData.tenure_type.toLowerCase() === 'week' &&
            req.lmsPostData.tenure
          ) {
            let loanTenureInDays = req.lmsPostData.tenure * 1 * 7;
            loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
          } else if (
            req.lmsPostData.tenure_type.toLowerCase() === 'fortnight' &&
            req.lmsPostData.tenure
          ) {
            loanTenureInMonths = Math.ceil(
              req.lmsPostData.tenure * 0.4602739726,
            );
          } else {
            let loanTenureInDays = req.lmsPostData.tenure;
            loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
          }
          if (req.insuranceStagingData) {
            req.insuranceStagingData.loanTenureInMonths = loanTenureInMonths;
          }
          const borrowerAge = await getAge(
            new Date(req.lmsPostData.dob).getFullYear(),
          );
          //Using age and tenure determine the policy premium using Base Policy Premium Rate Sheet
          const policyPremiumByAge =
            await PolicyPremiumRateSchema.findByAge(borrowerAge);
          if (!policyPremiumByAge)
            throw {
              success: false,
              message: 'Exception: Requested policy configuration not found',
            };
          const policyPremiumObj = JSON.parse(
            JSON.stringify(policyPremiumByAge),
          );
          delete policyPremiumObj.max_age;
          delete policyPremiumObj.min_age;
          const keys = Object.keys(policyPremiumObj);
          let tenureArray = [];
          keys.forEach((key) => {
            if (loanTenureInMonths == key * 1 || loanTenureInMonths < key * 1) {
              tenureArray.push(key);
            }
          });
          if (!tenureArray.length)
            throw {
              success: false,
              message: 'Exception: Requested policy configuration not found',
            };
          const policyPremiumByTenure = policyPremiumByAge[`${tenureArray[0]}`];
          //Calculate coborrower premium
          if (req.lmsPostData.coborr_dob && premiumMultiplier != undefined) {
            const coBorrowerAge = await getAge(
              new Date(req.lmsPostData.coborr_dob).getFullYear(),
            );
            const calculateCoBorroPremium =
              await insuranceHelper.calculatePremium(
                coBorrowerAge,
                loanTenureInMonths,
                req.lmsPostData.sanction_amount,
                premiumMultiplier,
              );
            if (!calculateCoBorroPremium.success) throw calculateCoBorroPremium;
            coBorrowerPremium = calculateCoBorroPremium.policyPremiumIncGST;
          }
          //Calculate policy premium

          if (IssuePolicyStagingData && premiumMultiplier != undefined) {
            policyPremium =
              ((req.body.sanction_amount * 1) / 1000) *
              policyPremiumByTenure *
              Number(premiumMultiplier);
            //18% of GST should be applied on the above calculated policy premium amount to arrive at the Total premium inclusive of GST
            gstOnPolicyPremium = policyPremium * 0.18;
            policyPremiumIncGST =
              policyPremium + gstOnPolicyPremium + coBorrowerPremium;
            policyPremiumIncGST =
              Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) /
              100;
            basePolicyPremium = Number(
              ((data.sanction_amount * 1) / 1000) * policyPremiumByTenure,
            );
            basePolicyPremiumIncGST =
              basePolicyPremium + Number(basePolicyPremium) * 0.18;
            IssuePolicyStagingData.loan_amount = req.body.sanction_amount;
            IssuePolicyStagingData.loan_tenure = req.body.tenure;

            (IssuePolicyStagingData.total_collected_premium =
              Math.round(
                ((req.body.insurance_amount / 1.18) * 1 + Number.EPSILON) * 100,
              ) / 100),
              (IssuePolicyStagingData.contract_coverages[0].value =
                req.body.sanction_amount);
            IssuePolicyStagingData.contract_coverages[1].value =
              req.body.sanction_amount;
            IssuePolicyStagingData.contract_coverages[2].value =
              req.body.sanction_amount;
            IssuePolicyStagingData.insured_persons[0].sum_insured =
              req.body.sanction_amount;
            IssuePolicyStagingData.insured_persons[0].premium =
              Math.round(
                (((policyPremiumIncGST - coBorrowerPremium) / 1.18) * 1 +
                  Number.EPSILON) *
                  100,
              ) / 100;

            //Check if IssuePolicyStagingData have coborrower
            if (IssuePolicyStagingData.insured_persons.length > 1) {
              IssuePolicyStagingData.insured_persons[1].premium =
                Math.round(
                  ((coBorrowerPremium / 1.18) * 1 + Number.EPSILON) * 100,
                ) / 100;
            }
            delete IssuePolicyStagingData._id;
            await IssuePolicyStagingSchema.updateExisting(
              req.params.loan_id,
              IssuePolicyStagingData,
            );
          }
        }
        //

        if (loanDataUpdate)
          return res.status(200).send({
            success: true,
            message: 'Loan data updated successfully.',
            data: loanDataUpdate,
          });
      } catch (error) {
        console.log('error-----', error);
        return res.status(400).send(error);
      }
    },
  );
};

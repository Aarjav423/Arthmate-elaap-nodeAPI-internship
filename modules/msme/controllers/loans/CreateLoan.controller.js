const { query, check, validationResult } = require('express-validator');
const { BorrowerInfoCommonService, LoanRequestService } = require('../../services');
const customLoanId = require('../../../../util/customLoanIdHelper.js');
const { BaseController } = require('../../common');
const { leadStatus } = require('../../constants/lead.constant.js');
const { calculateGSTOnApplicationFeesForMSME, calculateGSTOnPF, calculateGSTOnConvFees, calculateBrokenInterest, calculateNetDisbursementAmountForMsme, generateRepaySch } = require('../../../../util/calculation.js');
const OfferDetails = require('../../../../models/offer-details-schema.js');
const BorrowerinfoCommon = require('../../../../models/borrowerinfo-common-schema.js');
const ChargesSchema = require('../../../../models/charges-schema.js');
const axios = require('axios');
const moment = require('moment');
const UTIL = require('../../utils/functions.js');
const chargesHelper = require('../../../../util/charges.js');
const { storeRepaymentSchedule } = require('../../../../util/repayment.js');

class BorrowerInfoCommonCreateController extends BaseController {
  constructor(request, response, borrowerInfoCommonService, loanRequestService) {
    super(request, response);
    this.borrowerInfoCommonService = borrowerInfoCommonService;
    this.loanRequestService = loanRequestService;
  }
  async validate() {
    await Promise.all([
      check('loan_app_id').notEmpty().withMessage('Please provide loan_app_id').isString().withMessage('Please provide a valid loan_app_id').run(this.request),
      check('borrower_id').notEmpty().withMessage('Please provide borrower_id').isString().withMessage('Please provide a valid borrower_id').run(this.request),
      check('partner_loan_app_id').notEmpty().withMessage('Please provide partner_loan_app_id').isString().withMessage('Please provide a valid partner_loan_app_id').run(this.request),
      check('partner_loan_id').notEmpty().withMessage('Please provide partner_loan_id').isString().withMessage('Please provide a valid partner_loan_id').run(this.request),
      check('partner_borrower_id').notEmpty().withMessage('Please provide partner_borrower_id').isString().withMessage('Please provide a valid partner_borrower_id').run(this.request),
      check('sanction_amount').notEmpty().withMessage('Please provide sanction_amount').isString().withMessage('Please provide a valid sanction_amount').run(this.request),
      check('gst_on_pf_amt').notEmpty().withMessage('Please provide gst_on_pf_amt').isString().withMessage('Please provide a valid gst_on_pf_amt').run(this.request),
      check('first_inst_date')
        .notEmpty()
        .withMessage('first_inst_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid first_inst_date in YYYY-MM-DD format')
        .run(this.request),
      check('final_approve_date')
        .notEmpty()
        .withMessage('final_approve_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid final_approve_date in YYYY-MM-DD format')
        .run(this.request),
      check('loan_app_date')
        .notEmpty()
        .withMessage('loan_app_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid loan_app_date in YYYY-MM-DD format')
        .run(this.request),
      check('net_disbur_amt').notEmpty().withMessage('Please provide net_disbur_amt').isString().withMessage('Please provide a valid net_disbur_amt').run(this.request),
      check('loan_int_rate').notEmpty().withMessage('Please provide loan_int_rate').isString().withMessage('Please provide a valid loan_int_rate').run(this.request),
      check('processing_fees_amt').notEmpty().withMessage('Please provide processing_fees_amt').isString().withMessage('Please provide a valid processing_fees_amt').run(this.request),
      check('processing_fees_perc').notEmpty().withMessage('Please provide processing_fees_perc').isString().withMessage('Please provide a valid processing_fees_perc').run(this.request),
      check('application_fee_perc').notEmpty().withMessage('Please provide application_fee_perc').isString().withMessage('Please provide a valid application_fee_perc').run(this.request),
      check('tenure').notEmpty().withMessage('Please provide tenure').isString().withMessage('Please provide a valid tenure').run(this.request),
      check('igst_amount').notEmpty().withMessage('Please provide igst_amount').isString().withMessage('Please provide a valid igst_amount').run(this.request),
      check('cgst_amount').notEmpty().withMessage('Please provide cgst_amount').isString().withMessage('Please provide a valid cgst_amount').run(this.request),
      check('sgst_amount').notEmpty().withMessage('Please provide sgst_amount').isString().withMessage('Please provide a valid sgst_amount').run(this.request),
      check('bene_bank_name').notEmpty().withMessage('Please provide beneficiary bank name').isString().withMessage('Please provide valid beneficiary bank name').run(this.request),
      check('bene_bank_acc_num').notEmpty().withMessage('Please provide beneficiary bank account number').isString().withMessage('Please provide valid beneficiary bank account number').run(this.request),
      check('bene_bank_ifsc').notEmpty().withMessage('Please provide beneficiary bank ifsc number').isString().withMessage('Please provide valid beneficiary bank ifsc number').run(this.request),
      check('bene_bank_account_holder_name').notEmpty().isIn(['Current', 'Savings', 'Others']).withMessage('Please provide beneficiary bank account holder name').isString().withMessage('Please provide valid beneficiary bank account holder name').run(this.request),
      check('bene_bank_account_type').notEmpty().isIn(['Current', 'Savings', 'Others']).withMessage('Please provide beneficiary bank account type').isString().withMessage('Please provide valid beneficiary bank account type').run(this.request),
      check('borro_bank_account_type').notEmpty().withMessage('Please provide borrower bank account type').isString().withMessage('Please provide valid borrower bank account type').run(this.request),
      check('borro_bank_account_holder_name').notEmpty().withMessage('Please provide borrower bank account holder name').isString().withMessage('Please provide valid borrower bank account holder name').run(this.request),
      check('borro_bank_ifsc').notEmpty().withMessage('Please provide borrower bank ifsc number').isString().withMessage('Please provide valid borrower bank ifsc numbe').run(this.request),
      check('borro_bank_acc_num').notEmpty().withMessage('Please provide borrower bank account number').isString().withMessage('Please provide valid borrower bank account number').run(this.request),
      check('borro_bank_name').notEmpty().withMessage('Please provide borrower bank name').isString().withMessage('Please provide valid borrower bank name').run(this.request),
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async isLoanExistByLoanAppId() {
    try {
      const loan_app_id = this.request.body.loan_app_id ? this.request.body.loan_app_id : this.request.params.loan_app_id;

      // Validate if loan_app_id exists in borrower_info table, if not throw error "loan_app_id does not exist."
      const isLoanExist = await BorrowerinfoCommon.findByCondition({
        loan_app_id,
      });

      if (!isLoanExist) {
        throw {
          success: false,
          message: 'Loan does not exist for loan_app_id ' + loan_app_id,
        };
      } else {
        // If loan exists, retrieve the loan ID from BorrowerinfoCommon
        const loanInfo = await BorrowerinfoCommon.findOne({ loan_app_id });

        if (loanInfo) {
          const loan_id = loanInfo.loan_id;

          // Return success with the loan ID
          return this.response.status(200).json({
            success: true,
            message: 'Loan exists for loan_app_id ' + loan_app_id,
            loan_id: loan_id,
          });
        } else {
          throw {
            success: false,
            message: 'Loan ID not found for loan_app_id ' + loan_app_id,
          };
        }
      }
    } catch (error) {
      return this.response.status(400).send(error);
    }
  }

  async calculateCharges() {
    try {
      let conv_fees = 0; //This has to be calculated
      let application_fees = 0; //This has to be calculated
      let processing_fees_amt = 0; //This has to ba calculated
      let broken_period_int_amt = 0; //This has to be calculated
      let loan_app_date = moment().format('YYYY-MM-DD');
      let reqBody = this.request.body;
      //Check lead status
      if (this.request.lead.lead_status.toLowerCase() != 'new') {
        throw { message: 'Lead is not in new state ', success: false };
      }
      //Fetch offer against the loan app id
      let offer = await OfferDetails.getByLoanAppId(this.request.body.loan_app_id);
      if (!offer) {
        throw { message: 'No offer found against the provided loan app ID', success: false };
      }
      let { sanction_amount = offer.offered_amount, processing_fees_perc, loan_int_rate = offer.offered_int_rate, tenure = offer.tenure, application_fee_perc, insurance_amount = 0 } = reqBody;

      if (sanction_amount > offer.offered_amount) {
        throw { message: 'Loan amount should be less than offered amount', success: false };
      }

      if (loan_int_rate != offer.offered_int_rate) {
        throw { message: 'Loan interest rate provided doesnot match with offered interest rate', success: false };
      }

      if (tenure != offer.tenure) {
        throw { message: 'Loan tenure doesnot match with offered tenure', success: false };
      }

      //Check for absolute value is configured in the product or not
      if (this.request.product.processing_fees.indexOf('A') > -1) {
        throw { message: 'Product is configured with absolute value ', success: false };
      }

      //Processing fee percentage
      let product_processing_fees_perc = Math.min(this.request.product.processing_fees.replace(/[a-zA-Z]+/g, ''), process.env.MSME_PROCESSING_FEES_UPPERLIMIT_PERCENTAGE);

      if (processing_fees_perc === null || processing_fees_perc === undefined) {
        processing_fees_perc = product_processing_fees_perc;
      } else if (processing_fees_perc > product_processing_fees_perc) {
        throw { message: `Processing fee percentage should be less than or equal to ${product_processing_fees_perc}`, success: false };
      }
      processing_fees_amt = (((processing_fees_perc * 1) / 100) * Number(sanction_amount)).toFixed(2);
      const gstCalculation = await calculateGSTOnPF({ processing_fees_amt, state: this.request.lead.state }, this.request.product);

      if (!gstCalculation.success) {
        throw {
          success: false,
          message: 'Issue occured in GST calculation for PF ',
          gstCalculation,
        };
      }

      let data = {
        loan_app_date,
        final_approve_date: loan_app_date,
        sanction_amount,
        processing_fees_perc,
        processing_fees_amt,
        insurance_amount,
        gstCalculationOnPF: gstCalculation,
        loan_int_rate,
        tenure,
        state: this.request.lead.state,
        isApplicationFeeApplicable: false,
        isConvFeeApplicable: false,
      };
      if (this.request.product.application_fee >= 1) {
        data['isApplicationFeeApplicable'] = true;
        if (application_fee_perc === null || application_fee_perc === undefined) {
          application_fee_perc = 5;
        } else if (application_fee_perc > 5) {
          throw { message: `Application fee percentage should be less than or equal to 5`, success: false };
        }

        application_fees = (((application_fee_perc * 1) / 100) * Number(sanction_amount)).toFixed(2);
        const applicationFeesPercentage = (application_fees * 18) / 100;
        data['application_fees'] = parseFloat(Number(application_fees) + Number(applicationFeesPercentage));
        data['application_fee_perc'] = application_fee_perc;
        //Calculate Gst on application fees
        let gstOnApplicationFees = await calculateGSTOnApplicationFeesForMSME(data, this.request.lead, this.request.product);
        data['gstOnApplicationFees'] = gstOnApplicationFees;
      }

      if (this.request.product.convenience_fees >= 1) {
        data['isConvFeeApplicable'] = true;
        if (!this.request.lead.entity_details) {
          throw { message: 'Entity details in lead details doesnot exist', success: false };
        }

        if (!this.request.lead.entity_details.entity_type) {
          throw { message: 'Entity type in lead details doesnot exist', success: false };
        }

        if (this.request.lead.entity_details && this.request.lead.entity_details.entity_type == 'Proprietor') {
          conv_fees = sanction_amount > 500000 ? process.env.MSME_CONV_FEES_FOR_PROPRIETOR_ENTITY : 0;
        } else {
          conv_fees = process.env.MSME_CONV_FEES_FOR_OTHER_ENTITY;
        }
        data['conv_fees'] = conv_fees;
        let gstOnConvFees = await calculateGSTOnConvFees(data, this.request.lead);
        data['gstOnConvFees'] = gstOnConvFees;
      }
      data['first_inst_date'] = await this.calculateInstalmentDate(loan_app_date);

      if (this.request.product.calculate_broken_interest >= 1) {
        let brokenInterestResp = await calculateBrokenInterest(data, this.request.product);
        if (!brokenInterestResp.success) {
          throw {
            success: false,
            message: 'Issue in calculating broken interest',
            brokenInterestResp,
          };
        }
        let brokenInterest = brokenInterestResp.brokenInterestAmount;
        data['broken_interest'] = brokenInterest;
        data['isBrokenInterestApplicable'] = true;
      }

      let gstAmount = gstCalculation?.calculatedGstAmt;
      const netDisbursementAmount = await calculateNetDisbursementAmountForMsme(data['broken_interest'] || 0, gstAmount, data, this.request.product);
      if (!netDisbursementAmount.success) {
        throw {
          success: false,
          message: 'Error in calculating net disbursment',
          netDisbursementAmount,
        };
      }
      data['net_disbursement_amount'] = netDisbursementAmount.netDisbursementAmount;
      data['offered_amount'] = offer.offered_amount;
      return UTIL.okResponse(this.response, data, 'Charges and Fees Fetched Successfully');
    } catch (error) {
      return UTIL.errorResponse(this.response, error, 'Error Occured While fetching charges and Fees', 400);
    }
  }

  async calculateInstalmentDate(applicationDate) {
    const appDate = moment(applicationDate);
    const dayOfMonth = appDate.date();
    let firstInstalmentDate;
    if (dayOfMonth >= 5 && dayOfMonth <= 20) {
      if (appDate.month() === 11) {
        firstInstalmentDate = moment([appDate.year() + 1, 0, 5]);
      } else {
        firstInstalmentDate = moment([appDate.year(), appDate.month() + 1, 5]);
      }
    } else {
      if (appDate.month() === 10 || appDate.month() === 11) {
        firstInstalmentDate = moment([appDate.year() + 1, (appDate.month() + 2) % 12, 5]);
      } else {
        firstInstalmentDate = moment([appDate.year(), appDate.month() + 2, 5]);
      }
    }

    return firstInstalmentDate.format('YYYY-MM-DD');
  }

  async execute() {
    try {
      // await this.validate();

      const customCodeDefault = this.request.company.custom_code ? this.request.company.custom_code : 'UND';
      const customCode = customCodeDefault.toUpperCase();
      const generatedLoanKey = this.request.product.loan_key ? this.request.product.loan_key : customLoanId.generateRandomString(3, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
      const loanKey = generatedLoanKey.toUpperCase();
      if (!this.request.product.loan_key) {
        const updateLoanKey = await Product.updateData(
          {
            loan_key: loanKey,
          },
          {
            _id: this.request.product._id,
          },
        );
      }
      const generatedLoanId = await customLoanId.generatedLoanId(customCode, loanKey, {});

      if (generatedLoanId.errorData) {
        let errorData = {};
        errorData.message = generatedLoanId.errorData?.errorData ?? 'Error recording Loan_id.';

        throw {
          success: false,
          errorData: errorData,
        };
      }

      const borrowerInfoCommon = await this.borrowerInfoCommonService.create({
        ...this.request.body,
        loan_id: generatedLoanId.loan_id,
        company_id: this.request.company._id,
        product_id: this.request.product._id,
      });

      await this.loanRequestService.updateByLoanAppId(this.request.body.loan_app_id, { lead_status: leadStatus.Approved });
      return { message: 'Loan created Successfully', data: borrowerInfoCommon };
    } catch (error) {
      throw error;
    }
  }

  async createLoan() {
    try {
      this.validate();
      //Check for offer
      let offer = await OfferDetails.getByLoanAppId(this.request.body.loan_app_id);
      if (!offer) {
        throw { message: 'Loan cannot be generated as no offer found against the provided loan app id', success: false };
      }

      if (this.request.lead.lead_status.toLowerCase() != 'new') {
        throw { message: 'Lead is not in new state ', success: false };
      }
      if (!this.request.product.interest_type || this.request.product.interest_type != 'rearended') {
        throw {
          success: false,
          message: 'Cannot apply for loan as interest type is not rearended',
        };
      }
      if (!this.request.product.repayment_type || this.request.product.repayment_type.toLowerCase() != 'monthly') {
        throw {
          success: false,
          message: 'Repayment type should be Monthly',
        };
      }
      let reqBody = this.request.body;
      let { bene_bank_acc_num, bene_bank_ifsc, bene_bank_account_holder_name, loan_app_id, tenure, sanction_amount, loan_int_rate, first_inst_date } = reqBody;

      if (sanction_amount > offer.offered_amount) {
        throw { message: 'Loan amount should be less than offered amount', success: false };
      }

      let bankDetails = {
        bene_bank_acc_num,
        bene_bank_ifsc,
        bene_bank_account_holder_name,
      };
      //Penny drop intergration

      let pennyDropResponse = await this.pennyDropStatus(bankDetails, loan_app_id);
      if (!pennyDropResponse.success) {
      const updates = {
      penny_drop_result: pennyDropResponse.penny_drop_result,
      name_match_result: pennyDropResponse.name_match_result,
      updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      throw {
      success: false,
      message: pennyDropResponse.message,
      };
      }
      reqBody.penny_drop_result = pennyDropResponse.penny_drop_result;
      reqBody.name_match_result = pennyDropResponse.name_match_result;

      //Generate Loan ID

      const customCodeDefault = this.request.company.custom_code ? this.request.company.custom_code : 'UND';
      const customCode = customCodeDefault.toUpperCase();
      const generatedLoanKey = this.request.product.loan_key ? this.request.product.loan_key : customLoanId.generateRandomString(3, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
      const loanKey = generatedLoanKey.toUpperCase();
      if (!this.request.product.loan_key) {
        await Product.updateData(
          {
            loan_key: loanKey,
          },
          {
            _id: this.request.product._id,
          },
        );
      }
      const generatedLoanId = await customLoanId.generatedLoanId(customCode, loanKey, { loan_app_id });
      if (generatedLoanId.errorData) {
        let errorData = {};
        errorData.message = generatedLoanId.errorData?.errorData ?? 'Error recording Loan_id.';

        throw {
          success: false,
          errorData: errorData,
        };
      }
      if (this.request.body.conv_fees == null || this.request.body.conv_fees == undefined || this.request.body.conv_fees == '') {
        reqBody.conv_fees = null;
        reqBody.gst_on_conv_fees = null;
        reqBody.cgst_on_conv_fees = null;
        reqBody.sgst_on_conv_fees = null;
        reqBody.igst_on_conv_fees = null;
        reqBody.conv_fees_excluding_gst = null;
      } else if (this.request.body.conv_fees == 0) {
        reqBody.conv_fees = 0;
        reqBody.gst_on_conv_fees = 0;
        reqBody.cgst_on_conv_fees = 0;
        reqBody.sgst_on_conv_fees = 0;
        reqBody.igst_on_conv_fees = 0;
        reqBody.conv_fees_excluding_gst = 0;
      }

      if (this.request.body.application_fees == null || this.request.body.application_fees == undefined || this.request.body.application_fees == '') {
        reqBody.application_fees = null;
        reqBody.gst_on_application_fees = null;
        reqBody.cgst_on_application_fees = null;
        reqBody.sgst_on_application_fees = null;
        reqBody.igst_on_application_fees = null;
        reqBody.application_fees_excluding_gst = null;
      } else if (this.request.body.application_fees == 0) {
        reqBody.application_fees = 0;
        reqBody.gst_on_application_fees = 0;
        reqBody.cgst_on_application_fees = 0;
        reqBody.sgst_on_application_fees = 0;
        reqBody.igst_on_application_fees = 0;
        reqBody.application_fees_excluding_gst = 0;
      }

      if (this.request.body.broken_interest == null || this.request.body.broken_interest == undefined || this.request.body.broken_interest == '') {
        reqBody.broken_interest = null;
        reqBody.broken_period_int_amt = null;
      } else if (this.request.body.broken_interest == 0) {
        reqBody.broken_interest = '0';
        reqBody.broken_period_int_amt = 0;
      } else {
        let floatValue = parseFloat(reqBody.broken_interest);
        let fixedDecimal = parseFloat(floatValue.toFixed(2)); //convert to float
        reqBody.broken_period_int_amt = fixedDecimal;
      }

      reqBody.loan_id = generatedLoanId.loan_id;
      reqBody.status = 'open';
      reqBody.created_by = this.request.user.email;
      reqBody.updated_by = this.request.user.email;
      reqBody.int_type = this.request.product.interest_rate_type ? (this.request.product.interest_rate_type.toLowerCase() == 'reducing' ? 'Reducing' : 'Flat') : null;
      reqBody.tenure_type = 'Month';
      reqBody.first_name = this.request.lead.first_name;
      reqBody.last_name = this.request.lead.last_name;
      reqBody.emi_count = this.request.body.tenure;
      reqBody.stage = 0;
      reqBody.upfront_interest = '0';
      reqBody.exclude_interest_till_grace_period = '0';
      reqBody.purpose_of_loan = this.request.body.purpose_of_loan ? this.request.body.purpose_of_loan : 'Working Capital';
      reqBody.interest_type = this.request.product.interest_type;
      reqBody.gst_on_pf_perc = '18';
      reqBody.repayment_type = this.request.product.repayment_type;
      reqBody.offered_amount = offer.offered_amount;
      reqBody.offered_int_rate = offer.offered_int_rate;

      //insert in BIC
      const borrowerInfoCommon = await this.borrowerInfoCommonService.create({
        ...reqBody,
        loan_id: reqBody.loan_id,
        company_id: this.request.company._id,
        product_id: this.request.product._id,
      });
      if (!borrowerInfoCommon) {
        throw {
          success: false,
          message: 'Failed to apply loan',
        };
      }

      //Update lead status to approved and add loan_id
      await this.loanRequestService.updateByLoanAppId(this.request.body.loan_app_id, { lead_status: leadStatus.Approved, loan_id: reqBody.loan_id });

      //Generate Repayment Schedule for Loan
      const repaymentScheduleData = {
        repayment_type: this.request.product.repayment_type,
        int_type: this.request.product.interest_rate_type,
        emi_count: tenure,
        sanction_amount: sanction_amount,
        intr_rate: loan_int_rate,
        first_inst_date: first_inst_date,
      };

      const repaymentSchedule = await generateRepaySch(repaymentScheduleData, this.request.product);
      if (!repaymentSchedule.success) {
        throw {
          ...repaymentSchedule,
        };
      }
      if (repaymentSchedule) {
        const uploadRepaymentSchedule = await storeRepaymentSchedule(this.request, { loan_id: reqBody.loan_id }, repaymentSchedule.repaymentScheduleGenerated, this.response);
        if (!uploadRepaymentSchedule)
          throw {
            uploadRepaymentSchedule,
          };
      }
      // Store charges
      let charge_types = [];
      if (reqBody.processing_fees_amt) {
        charge_types.push(chargesHelper.createCharge('Processing Fees', reqBody, this.request.company._id, this.request.product._id));
      }

      // Add Convenience fees charge
      if (reqBody.conv_fees) charge_types.push(chargesHelper.createCharge('Convenience Fees', reqBody, this.request.company._id, this.request.product._id));

      // Add insurance amount charge
      if (reqBody.insurance_amount) charge_types.push(chargesHelper.createCharge('Insurance Amount', reqBody, this.request.company._id, this.request.product._id));

      // Add application charge
      if (reqBody.application_fees) charge_types.push(chargesHelper.createCharge('Application Fees', reqBody, this.request.company._id, this.request.product._id));

      // Make db insertion call to charges collection
      if (charge_types.length) await ChargesSchema.addMultipleRecords(charge_types);

      try {
        borrowerInfoCommon.lba_req_sent = await this.makeEsignRequest(borrowerInfoCommon, process.env.LBA_DOC_CODE);
        borrowerInfoCommon.sl_req_sent = await this.makeEsignRequest(borrowerInfoCommon, process.env.SANCTION_LETTER_DOC_CODE);
        // Update SL and LBA flags in borrowerInfoCommons
        await BorrowerinfoCommon.updateSLandLBAflags(borrowerInfoCommon);
      } catch (error) {
        console.log('Error in creating e-sgin requests');
      }

      return UTIL.okResponse(this.response, borrowerInfoCommon, 'Loan created Successfully');
    } catch (error) {
      return UTIL.errorResponse(this.response, error, error?.errorData?.message || 'Loan cannot be generated', 400);
    }
  }

  async makeEsignRequest(borrowerInfoCommons, docCode) {
    try {
      const baseUrl = process.env.SERVICE_MS_URL;
      const esignRequestUrl = process.env.INTERNAL_ESIGN_REQUEST_URL;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.request.headers.authorization,
        },
      };
      const payload = {
        loan_app_id: borrowerInfoCommons.loan_app_id,
        doc_code: docCode,
      };
      const response = await axios.post(`${baseUrl}${esignRequestUrl}`, payload, config);
      const { data } = response;
      return data && data.success;
    } catch (error) {
      return false;
    }
  }

  async createSLandLBAesignRequest() {
    try {
      const borrowerInfoCommon = this.request.loanData;
      const docCode = this.request.body.doc_code;

      let isSuccess = false;

      const makeEsignAndUpdateFlags = async (docCodeKey, flagKey) => {
        if (docCode === process.env[docCodeKey] && !borrowerInfoCommon[flagKey]) {
          isSuccess = await this.makeEsignRequest(borrowerInfoCommon, docCode);
          borrowerInfoCommon[flagKey] = isSuccess;
          await BorrowerinfoCommon.updateSLandLBAflags(borrowerInfoCommon);
        }
      };

      await makeEsignAndUpdateFlags('SANCTION_LETTER_DOC_CODE', 'sl_req_sent');
      await makeEsignAndUpdateFlags('LBA_DOC_CODE', 'lba_req_sent');

      return isSuccess ? UTIL.okResponse(this.response, null, 'E-Sign request successful') : UTIL.errorResponse(this.response, null, 'E-sign request failed!', 400);
    } catch (error) {
      return UTIL.errorResponse(this.response, error, error?.errorData?.message, 400);
    }
  }

  async pennyDropStatus(bankDetails, loan_app_id) {
    let pennyDropName = 'Penny drop failed';
    let nameMatchScore = undefined;
    try {
      const payload = {
        ifsc: bankDetails.bene_bank_ifsc,
        account_number: bankDetails.bene_bank_acc_num,
        loan_app_id: loan_app_id,
      };
      const responsePD = await axios.post(`${process.env.SERVICE_MS_URL + process.env.SERVICE_MASTER_BANK_PENNY_URL}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.SERVICE_MS_TOKEN,
        },
      });
      if (!responsePD)
        throw {
          success: false,
          message: 'System is not able to perform Penny drop at the moment, please try again after sometime.',
        };
      pennyDropName = responsePD.data?.data?.result?.accountName;
      if (!responsePD.data.success)
        throw {
          success: false,
          message: 'Penny drop failed, please check & update the beneficiary details and try again.',
        };
      //Call name match API on successfull penny drop
      let nameToPass = bankDetails.bene_bank_account_holder_name;
      let nameMatchResult = await axios.post(
        `${process.env.SERVICE_MS_URL + process.env.NAME_URL}`,
        {
          input_name: nameToPass === ' ' ? '' : nameToPass,
          kyc_name: responsePD.data.data.result.accountName,
          type: 'individual',
          loan_app_id: loan_app_id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.SERVICE_MS_TOKEN,
          },
        },
      );
      if (!nameMatchResult)
        throw {
          success: false,
          message: 'System is not able to perform Penny drop name match at the moment, please try again after sometime.',
        };
      nameMatchScore = nameMatchResult.data.data.result.score * 1;
      if (nameMatchResult.data.data.result.score * 1 < 0.6)
        throw {
          success: false,
          message: 'Penny drop name match failed, please check & update the beneficiary details and try again.’',
        };
      return {
        success: true,
        message: 'Name matched successfully',
        penny_drop_result: pennyDropName,
        name_match_result: nameMatchScore,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Penny drop failed, please check & update the beneficiary details and try again.',
        penny_drop_result: pennyDropName,
        name_match_result: nameMatchScore,
      };
    }
  }

  static create(request, response) {
    let borrowerInfoCommonCreateController = new BorrowerInfoCommonCreateController(request, response, new BorrowerInfoCommonService(), new LoanRequestService());
    return borrowerInfoCommonCreateController;
  }
}

module.exports = BorrowerInfoCommonCreateController;

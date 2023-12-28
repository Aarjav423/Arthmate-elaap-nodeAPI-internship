const { check, validationResult } = require('express-validator');
const dateRegex = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
const moment = require('moment');
const LoanTransactions = require('../models/loan-transaction-ledger-schema.js');
const CreditLimit = require('../models/loc-credit-limit-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema');
const LineStateSchema = require('../models/line-state-schema');
const LocBatchDrawdownDataSchema = require('../models/loc-batch-drawdown-schema');
const ProductSchemeMapping = require('../models/product-scheme-mapping-schema.js');
const ChargesSchema = require('../models/charges-schema.js');
const chargesHelper = require('../util/charges.js');
const chargesCalculationHelper = require('../util/charges-calculation-helper.js');
const { getEPSILON, numberDecimalGetVal } = require('./math-ops');
const AnchorSchema = require('../models/anchor-schema.js');

const checkIfPFPassed = (req) => {
  if (
    req.body.processing_fees_including_gst &&
    req.body.processing_fees_including_gst !== ''
  )
    return true;
  return false;
};
const checkDDRecordExists = async (req, res, next) => {
  try {
    const reqData = req.body;

    let existingDrawDowns = [];
    if (checkIfPFPassed(req)) {
      existingDrawDowns = await LoanTransactions.findRecordExistsByLoanIdLabel(
        reqData,
        'disbursement',
      );
      if (existingDrawDowns?.processing_fees_including_gst)
        throw {
          success: false,
          message: 'Only 1st drawdown can record processing fees',
        };
    }
    req['existingDrawdonList'] = existingDrawDowns;
    return next();
  } catch (error) {
    console.log('error', error);
    return res.status(400).send(err);
  }
};

const recordPFinCharges = async (req, res, next) => {
  try {
    if (checkIfPFPassed(req)) {
      let loanItem = req.body;
      let charge_types = [];
      let leadData = req.leadData;
      let gstAmount = getEPSILON(
        loanItem.processing_fees_including_gst -
        loanItem.processing_fees_including_gst / 1.18,
      );

      loanItem['gst_on_pf_amt'] = gstAmount;
      loanItem['cgst_amount'] =
        leadData.state === 'Haryana' ? gstAmount / 2 : 0;
      loanItem['sgst_amount'] =
        leadData.state === 'Haryana' ? gstAmount / 2 : 0;
      loanItem['igst_amount'] = leadData.state === 'Haryana' ? 0 : gstAmount;
      loanItem['processing_fees_amt'] =
        loanItem.processing_fees_including_gst - gstAmount;

      charge_types.push(
        chargesHelper.createCharge(
          'Processing Fees',
          loanItem,
          req.company._id,
          req.product._id,
        ),
      );
      await ChargesSchema.addMultipleRecords(chargesItems);
    }
    return next();
  } catch (error) {
    return res.status(400).send(err);
  }
};

const validateDDRPFEntry = async (req, res, next) => {
  try {
    if (checkIfPFPassed(req)) {
      if (req.body.processing_fees_including_gst < 1)
        throw {
          success: false,
          message:
            'processing fees including gst amount needs to be greater that 0',
        };
      // check if drawdown already exists with PF
      const existingDDRPFEntry =
        await LocBatchDrawdownDataSchema.findByLoanIdWithPF(req.body.loan_id);
      if (existingDDRPFEntry?.processing_fees_including_gst)
        throw {
          success: false,
          message:
            'processing fee is already recorded in another drawdown request.',
        };
    }
    return next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const validatePFAMount = async (req, res, next) => {
  try {
    // check if processing_fees_including_gst ia passed in post data
    if (checkIfPFPassed(req)) {
      // check if drawdown_amount > processing_fees_including_gst
      if (
        req.product.line_pf &&
        req.product.line_pf === 'drawdown' &&
        req.body.processing_fees_including_gst >= req.body.drawdown_amount
      )
        throw {
          success: false,
          message: 'processing fees cannot be greater than drawdown amount.',
        };

      pfAmount = verifyPFCalculationByConfig(req, req.loanData);
      pfAmountIncGST = getEPSILON(pfAmount * 1.18);
      // calculated processing fees and checked against passed processing_fees_including_gst
      if (req.body.processing_fees_including_gst != pfAmountIncGST)
        throw {
          success: false,
          message: `processing fees set in product is set to - ${pfAmountIncGST}`,
        };
    }
    return next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
// Check existing Proccesing fee in charge table with charge_id
const checkExistingPFCharges = async (req, res, next) => {
  try {
    if (
      req.body.processing_fees_including_gst &&
      req.body.processing_fees_including_gst !== '' &&
      req.body.processing_fees_including_gst > 0
    ) {
      // Fetch charges data against loan id
      const chargesData = await ChargesSchema.findAllCharge(
        req.body.loan_id,
        2,
      );
      if (chargesData.length)
        throw {
          success: false,
          message: 'Processing fee already recorded in charges.',
        };
      req.chargesData = chargesData;
    }

    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

// Check wether scheme mapped to product or not
const checkProductMappedtoScheme = async (req, res, next) => {
  try {
    if (req.product?.recon_type == 'Invoice' && !req.body?.product_scheme_id) {
      throw {
        success: false,
        message: 'Scheme is mandatory',
      };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
const checkIfDDRRequestDisbursmentIntiated = async (req, res, next) => {
  try {
    if (req.body._id) {
      let drawdownRequestData = await LocBatchDrawdownDataSchema.findOne(
        {
          _id: req.body._id,
        },
        { status: 1 },
      );
      console.log(drawdownRequestData);
      if (drawdownRequestData && drawdownRequestData.status != 0) {
        throw { success: false, message: 'Drawdown Request Already Initiated' };
      }
      next();
    } else {
      throw { success: false, message: 'Please provide drawdown Request ID' };
    }
  } catch (error) {
    return res.status(400).send(error);
  }
};

var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

var txnAmountSum = function (object, attr) {
  let keys = Object.keys(object);
  let txnArray = [];
  let txnObject = {};
  for (let i = 0; i < keys.length; i++) {
    let sum = 0;
    object[keys[i]].map((ele) => (sum = sum + parseFloat(ele[attr])));
    txnArray.push(sum);
    txnObject[keys[i]] = sum;
  }
  return txnObject;
};

const isLineInDPD = async (req, res, next) => {
  try {
    if (req.lineStateData?.dpd > 0)
      throw {
        success: false,
        message: 'Drawdown not allowed, as last repayment is pending.',
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const calculateAvailableLimit = async (req, res, next) => {
  try {
    //Validate if amount passed in payload shpuld not be 0 or negative
    if (req.body.drawdown_amount <= 0)
      throw {
        success: false,
        message: 'drawdown_amount should be greater than 0.',
      };
    // Available balance from table
    const availableBalance = req.limitBalance;
    if (req.body.drawdown_amount > availableBalance)
      // Validate if drawdown amount is less than or equal to available limit, if not throw error “Request amount is greater than Available limit”.
      throw {
        success: false,
        message: `Requested drawdown amount is greater than available limit. available limit is ${availableBalance}`,
      };
    req.availableBalance = availableBalance;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const checkLineExpiry = async (req, res, next) => {
  try {
    if (!req.loanData.expiry_date)
      throw {
        success: false,
        message: 'expiry_date is not present in loan records.',
      };
    if (!req.product.repayment_days && !req.loanData.repayment_days)
      throw {
        success: false,
        message: 'repayment_days are not configured .',
      };
    const expiryDate = moment(req.loanData.expiry_date).format('YYYY-MM-DD');
    let formattedExpiryDate = moment(expiryDate, 'YYYY-MM-DD');
    let drawdownDate = moment(req.body.drawadown_request_date, 'YYYY-MM-DD');
    const repaymentDays = req.body.repayment_days
      ? req.body.repayment_days
      : req.loanData.repayment_days
        ? req.loanData.repayment_days
        : req.product.repayment_days
          ? req.product.repayment_days
          : 0;
    let daysDifference = formattedExpiryDate.diff(drawdownDate, 'days');
    if (daysDifference <= repaymentDays)
      throw {
        success: false,
        message:
          'Drawdown is not allowed as drawdown tenure exceeds line tenure',
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const updatePFBIC = async (req, res, next) => {
  try {
    const data = req.body;
    const leadDataState = req.leadData.state;
    if (data.hasOwnProperty('processing_fees_including_gst')) {
      const gst_amount =
        getEPSILON(
          data.processing_fees_including_gst -
          (data.processing_fees_including_gst * 1) / 1.18,
        ) || '';
      await BorrowerinfoCommon.updatePFOnDrawDownCompositeDrawdown(
        {
          processing_fees_amt: getEPSILON(
            data.processing_fees_including_gst - gst_amount,
          ),
          gst_on_pf_amt: getEPSILON(gst_amount),
          cgst_amount:
            leadDataState.toLowerCase() === 'haryana'
              ? getEPSILON(gst_amount / 2)
              : 0,
          sgst_amount:
            leadDataState.toLowerCase() === 'haryana'
              ? getEPSILON(gst_amount / 2)
              : 0,
          igst_amount:
            leadDataState.toLowerCase() !== 'haryana'
              ? getEPSILON(gst_amount)
              : 0,
        },
        data.loan_id,
      );
      req.processing_fees = getEPSILON(
        data.processing_fees_including_gst - gst_amount,
      );
      next();
    } else {
      req.processing_fees = 0;
      next();
    }
  } catch (error) {
    console.log('error', error);
    return res.status(400).send(err);
  }
};

const recordCharge = async (req, res, next) => {
  try {
    const data = req.body;
    let loanItem = null;

    let chargesItems = [];
    if (data.hasOwnProperty('processing_fees_including_gst')) {
      const leadDataState = req.leadData.state;

      const gst_amount =
        getEPSILON(
          data.processing_fees_including_gst -
          (data.processing_fees_including_gst * 1) / 1.18,
        ) || '';

      loanItem = {
        loan_id: data.loan_id,
        gst_on_pf_amt: gst_amount,
        cgst_amount:
          leadDataState.toLowerCase() === 'haryana'
            ? getEPSILON(gst_amount / 2)
            : 0,
        sgst_amount:
          leadDataState.toLowerCase() === 'haryana'
            ? getEPSILON(gst_amount / 2)
            : 0,
        igst_amount:
          leadDataState.toLowerCase() !== 'haryana'
            ? getEPSILON(gst_amount)
            : 0,
        processing_fees_amt: getEPSILON(
          data.processing_fees_including_gst - gst_amount,
        ),
        charge_application_date: moment(),
        created_by: req.user.email,
        updated_by: req.user.email,
      };
      chargesItems.push(
        chargesHelper.createCharge(
          'Processing Fees',
          loanItem,
          req.company._id,
          req.product._id,
        ),
      );
    }
    if (data.usage_fees_including_gst > 0) {
      const leadDataState = req.leadData.state;
      const gst_amount =
        getEPSILON(
          data.usage_fees_including_gst -
          (data.usage_fees_including_gst * 1) / 1.18,
        ) || '';

      loanItem = {
        loan_id: data.loan_id,
        gst_amt: gst_amount,
        cgst_amount:
          leadDataState.toLowerCase() === 'haryana'
            ? getEPSILON(gst_amount / 2)
            : 0,
        sgst_amount:
          leadDataState.toLowerCase() === 'haryana'
            ? getEPSILON(gst_amount / 2)
            : 0,
        igst_amount:
          leadDataState.toLowerCase() !== 'haryana'
            ? getEPSILON(gst_amount)
            : 0,
        usage_fees_amt: getEPSILON(data.usage_fees_including_gst - gst_amount),
        charge_application_date: moment(),
        usage_id: req.drawdownRecord._id,
        created_by: req.user.email,
        updated_by: req.user.email,
      };
      chargesItems.push(
        chargesHelper.createCharge(
          'Usage Fees',
          loanItem,
          req.company._id,
          req.product._id,
        ),
      );
    }
    if (chargesItems.length > 0) {
      await ChargesSchema.addMultipleRecords(chargesItems);
    }
    next();
  } catch (error) {
    console.log('error', error);
    return res.status(400).send(error);
  }
};

const calculateNetDrawDownAmount = async (req, res, next) => {
  try {
    const repaymentDays = req.body.repayment_days
      ? req.body.repayment_days
      : req.loanData.repayment_days
        ? req.loanData.repayment_days
        : req.product.repayment_days
          ? req.product.repayment_days
          : 0;
    // Throw error if int_value configured in product is absolute

    if (!req.loanData.loan_int_rate && req.product.int_value.indexOf('A'))
      throw {
        success: false,
        message: 'int_value configured in product should be in percentage',
      };
    let netDrawdownAmount = 0;
    let upfrontInterest = 0;
    let rearEndedInterest = 0;
    const processingFees = req.loanData.processing_fees_amt
      ? Number(req.loanData.processing_fees_amt)
      : 0;
    if (!req.product.interest_type)
      throw {
        success: false,
        message: 'interest_type should be configured in product',
      };
    const interestType = req.product.interest_type;
    const interestRate = req.loanData.loan_int_rate
      ? ((req.loanData.loan_int_rate * 1) / 100 / 365) *
      req.body.drawdown_amount
      : req.product.int_value.indexOf('P') > -1
        ? ((req.product.int_value.replace(/[a-zA-Z]+/g, '') * 1) / 100 / 365) *
        Number(req.body.drawdown_amount)
        : 0;
    if (interestType === 'upfront') {
      if (req.product.force_usage_convert_to_emi == 1) {
        upfrontInterest = interestRate * (req.body.no_of_emi * 30);
      } else {
        upfrontInterest = interestRate * repaymentDays;
      }
      netDrawdownAmount =
        req.body.usage_fees * 1 >= 0
          ? req.body.drawdown_amount -
          upfrontInterest -
          req.body.usage_fees * 1.18
          : req.body.drawdown_amount -
          upfrontInterest -
          req.usage_fees -
          req.gst_on_usage_fee;
    } else if (interestType === 'rearended') {
      rearEndedInterest = 0;
      netDrawdownAmount =
        req.body?.usage_fees * 1 >= 0
          ? req.body.drawdown_amount - req.body.usage_fees * 1.18
          : req.body.drawdown_amount - req.usage_fees - req.gst_on_usage_fee;
    }
    if (req.body.hasOwnProperty('processing_fees_including_gst')) {
      netDrawdownAmount =
        netDrawdownAmount - req.body.processing_fees_including_gst;
    }
    if (req.product.cash_collateral && req.product.allow_loc) {
      if (!req.body.hasOwnProperty('withheld_amount')) {
        throw {
          success: false,
          message:
            'Please provide withheld amount as product is cash Collateral',
        };
      }
      netDrawdownAmount = netDrawdownAmount - req.body.withheld_amount;
    }
    req.net_drawdown_amount =
      Math.round((netDrawdownAmount * 1 + Number.EPSILON) * 100) / 100;
    req.upfront_interest =
      Math.round((upfrontInterest * 1 + Number.EPSILON) * 100) / 100;
    req.rearended_interest =
      Math.round((rearEndedInterest * 1 + Number.EPSILON) * 100) / 100;
    req.processing_fees =
      Math.round((processingFees * 1 + Number.EPSILON) * 100) / 100;
    if (
      req.body.net_drawdown_amount &&
      Math.round(
        Math.round((req.net_drawdown_amount * 1 + Number.EPSILON) * 100) / 100 -
        Math.round(
          (req.body.net_drawdown_amount * 1 + Number.EPSILON) * 100,
        ) /
        100,
      ) >= 1
    )
      throw {
        success: false,
        message: `net_drawdown_amount mismatch it should be ${req.net_drawdown_amount}`,
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const updateAvailableLimit = async (req, res, next) => {
  try {
    const existingLimit = req.line_limit_amount;
    const limitToUpdate =
      req.availableBalance - Number(req.body.drawdown_amount);
    // Update the available limit
    const updateLimitResp = await CreditLimit.updateAvailableLimit(
      req.loanData.loan_id,
      limitToUpdate,
    );
    if (!updateLimitResp)
      throw { success: false, message: 'Error while updating credit limit' };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const recordTransaction = async (req, res, next) => {
  try {
    const repaymentDays = req.body.repayment_days
      ? req.body.repayment_days
      : req.loanData.repayment_days
        ? req.loanData.repayment_days
        : req.product.repayment_days
          ? req.product.repayment_days
          : 0;
    // Make entry in transaction table

    const drawdownData = {
      company_id: req.company._id,
      company_name: req.company.name,
      product_id: req.product._id,
      product_name: req.product.name,
      loan_id: req.body.loan_id,
      loan_app_id: req.body.loan_app_id,
      borrower_id: req.body.borrower_id,
      partner_borrower_id: req.body.partner_borrower_id,
      borrower_name: req.body.borrower_name,
      txn_id: req?.disbursementResponse?.txn_id,
      txn_amount: req.body.drawdown_amount,
      txn_date: req.body.drawadown_request_date,
      txn_entry: 'dr',
      label: 'disbursement',
      upfront_usage_fee: req.usage_fees,
      usage_fees_including_gst: req.body.usage_fees_including_gst,
      upfront_interest: req.upfront_interest,
      interest_payable: req.rearended_interest,
      final_disburse_amt: req.net_drawdown_amount,
      gst_on_usage_fee: req.gst_on_usage_fee,
      cgst_on_usage_fee: req.cgst_on_usage_fee,
      sgst_on_usage_fee: req.sgst_on_usage_fee,
      igst_on_usage_fee: req.igst_on_usage_fee,
      no_of_emi: req.body.no_of_emi ? req.body.no_of_emi : 0,
      converted_to_emi:
        req.product.force_usage_convert_to_emi && req.body.no_of_emi
          ? 'Yes'
          : 'No',
      prin_os: req.prin_os ? req.prin_os : 0,
      int_os: req.int_os ? req.int_os : 0,
      repayment_days: repaymentDays,
      label_type: req.body.label_type,
      beneficiary_bank_details_id: req?.bankDetails_master_id,
      invoice_number: req?.invoice_number,
      product_scheme_id: req?.product_scheme_id,
    };
    if (req.body._id) {
      drawdownData.request_id = req.body._id;
    }
    const recordDrawdown = await LoanTransactions.addNew(drawdownData);
    if (!recordDrawdown)
      throw {
        success: false,
        message: 'Error while adding drawdown data in loan transaction ledger',
      };

    // update txn_id in loc_batch_drawdown
    if (req.body._id) {
      const locBatchData = await LocBatchDrawdownDataSchema.updateByLid(
        { _id: req.body._id, loan_id: req.body.loan_id },
        {
          txn_id: recordDrawdown.txn_id,
          status: 2,
          drawadown_request_date: req.body.drawadown_request_date,
        },
      );
      if (!locBatchData)
        throw {
          success: false,
          message: 'Error while updating txn_id in loc batch drawdown',
        };
    }

    req.drawdownRecord = recordDrawdown;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const validDrawdownPayload = [
  check('loan_id').notEmpty().withMessage('loan_id is required'),
  check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
  check('borrower_id').notEmpty().withMessage('borrower_id is required'),
  check('partner_loan_id')
    .notEmpty()
    .withMessage('partner_loan_id is required'),
  check('partner_borrower_id')
    .notEmpty()
    .withMessage('partner_borrower_id is required'),
  check('borrower_mobile')
    .notEmpty()
    .withMessage('borrower_mobile is required')
    .isLength({
      min: 10,
      max: 10,
    })
    .withMessage('Please enter valid 10 digit borrower_mobile')
    .isNumeric()
    .withMessage('borrower_mobile should be numeric'),
  check('drawadown_request_date')
    .notEmpty()
    .withMessage('drawadown_request_date is required')
    .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
    .withMessage(
      'Please enter valid drawadown_request_date in YYYY-MM-DD format',
    ),
  check('drawdown_amount')
    .notEmpty()
    .withMessage('drawdown_amount is required')
    .isLength({
      min: 2,
      max: 30,
    })
    .withMessage('Please enter valid drawdown_amount')
    .isNumeric()
    .withMessage('drawdown_amount should be numeric'),
  check('net_drawdown_amount')
    .notEmpty()
    .withMessage('net_drawdown_amount is required')
    .isLength({
      min: 2,
      max: 30,
    })
    .withMessage('Please enter valid net_drawdown_amount')
    .isNumeric()
    .withMessage('net_drawdown_amount should be numeric'),
];

const validateDrawdownData = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw { success: false, message: errors.errors[0]['msg'] };
    }
    if (
      req.product.recon_type &&
      req.product.recon_type.toLowerCase() == 'invoice'
    ) {
      if (!req.body.invoice_number) {
        throw {
          success: false,
          message:
            'Please provide Invoice Number as product recon_type is invoice',
        };
      }
    }
    // Validate no_of_emi if force_usage_convert_to_emi is checked in product
    if (req.product.force_usage_convert_to_emi) {
      if (!req.body.no_of_emi || typeof req.body.no_of_emi !== 'number')
        throw {
          success: false,
          message: 'Please enter no_of_emi in numeric format.',
        };
      // Validate no_of_emi against maximum_number_of_emi
      if (
        req.product.maximum_number_of_emi &&
        req.body.no_of_emi > req.product.maximum_number_of_emi
      )
        throw {
          success: false,
          message: 'Exceeds maximum number of Instalment allowed.',
        };
    }
    // Validate the type of repayment_days should be number.
    if (req.body.repayment_days && !Number.isInteger(req.body.repayment_days))
      throw {
        success: false,
        message: 'Please enter repayment_days in numeric format.',
      };

    if (
      req.body.repayment_days === '' ||
      (req.body.repayment_days && Number(req.body.repayment_days) == 0)
    )
      throw {
        success: false,
        message: 'Please enter repayment_days in numeric format.',
      };
    // Validate the  repayment_days passed in payload with the repayment_days from product config.
    if (
      req.product.repayment_days &&
      Number(req.body.repayment_days) > Number(req.product.repayment_days)
    )
      throw {
        success: false,
        message: 'Entered repayment period is not allowed for this product',
      };

    //At the time of first drawdown “processing_fees_including_gst” is mandatory.
    if (!req.drawdownRequestExist && req.product.line_pf === 'drawdown') {
      if (!req.body.processing_fees_including_gst) {
        throw {
          success: false,
          message: 'Processing fee including gst is required.',
        };
      }
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const isProductTypeLoc = (req, res, next) => {
  try {
    // If allow_loc flag in product is not 1 throw error "Unable to call loc_withdraw api as product not comes under loc."
    if (!req.product.allow_loc)
      throw {
        success: false,
        message:
          'Unable to call loc_withdraw api as product not comes under loc.',
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const isCreditLimitSet = async (req, res, next) => {
  try {
    // Check if limit is already set for given loan_id
    const limitRecord = await CreditLimit.checkCreditLimit(req.body.loan_id);
    if (!limitRecord)
      throw {
        success: false,
        message: `Credit limit is not set for this ${req.body.loan_id}. Please first set limit.`,
      };
    req.line_limit_amount = Number(limitRecord.limit_amount);
    req.limitBalance = Number(limitRecord.available_balance);
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const gstCalculation = async (req, res, next) => {
  try {
    const loan_app_id = req.loanData.loan_app_id;
    const leadData = await LoanRequestSchema.findByLId(loan_app_id);
    const usage_fee = req.usage_fees;
    const gstPercentage =
      leadData.state.toUpperCase() === 'HARYANA'
        ? req.product.cgst_on_pf_perc * 1 + req.product.sgst_on_pf_perc * 1
        : req.product.igst_on_pf_perc;

    const calculatedGst = (gstPercentage / 100) * usage_fee;
    let calculatedCgst = ((req.product.cgst_on_pf_perc || 0) / 100) * usage_fee;
    let calculatedSgst = ((req.product.sgst_on_pf_perc || 0) / 100) * usage_fee;
    let calculatedIgst = ((req.product.igst_on_pf_perc || 0) / 100) * usage_fee;
    if (leadData.state.toUpperCase() === 'HARYANA') {
      calculatedIgst = 0;
    } else {
      calculatedCgst = 0;
      calculatedSgst = 0;
    }
    req.gst_on_usage_fee =
      Math.round((calculatedGst * 1 + Number.EPSILON) * 100) / 100;
    req.cgst_on_usage_fee =
      Math.round((calculatedCgst * 1 + Number.EPSILON) * 100) / 100;
    req.sgst_on_usage_fee =
      Math.round((calculatedSgst * 1 + Number.EPSILON) * 100) / 100;
    req.igst_on_usage_fee =
      Math.round((calculatedIgst * 1 + Number.EPSILON) * 100) / 100;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const calculateUsageFees = async (req, res, next) => {
  try {
    const usageFees =
      req.product.usage_fee.indexOf('A') > -1
        ? req.product.usage_fee.replace(/[a-zA-Z]+/g, '') * 1
        : req.product.usage_fee.indexOf('P') > -1
          ? ((req.product.usage_fee.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
          Number(req.body.drawdown_amount)
          : 0;
    req.usage_fees =
      req.body?.usage_fees * 1 >= 0
        ? req.body.usage_fees
        : Math.round((usageFees * 1 + Number.EPSILON) * 100) / 100;
    next();
  } catch (error) {
    return res.status(400).send(err);
  }
};

const fetchLineStateData = async (req, res, next) => {
  try {
    // Fetch line state data against loan id
    const lineStateData = await LineStateSchema.findByLoanId(req.body.loan_id);
    req.lineStateData = lineStateData;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const calculateUsageFeesBatch = async (req, res, next) => {
  try {
    req.usage_fees = req.body.usage_fees_including_gst
      ? (req.body.usage_fees_including_gst * 1) / 1.18
      : 0;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const recordDrawdownRequest = async (req, res, next) => {
  try {
    const data = req.body;
    let drawdownRequestData = {
      company_id: req.company._id,
      product_id: req.product._id,
      company_name: req.company.name,
      product_name: req.product.name,
      loan_id: data.loan_id,
      loan_app_id: req.loanData.loan_app_id,
      borrower_id: req.loanData.borrower_id,
      partner_loan_id: req.loanData.partner_loan_id,
      first_name: req.loanData.first_name,
      last_name: req.loanData?.last_name,
      borrower_mobile: req.leadData.appl_phone,
      partner_loan_app_id: req.loanData.partner_loan_app_id,
      partner_borrower_id: req.loanData.partner_borrower_id,
      no_of_emi: data.no_of_emi,
      status: 0,
      drawdown_amount: data.drawdown_amount,
      upfront_int: req.upfront_interest ? req.upfront_interest : 0,
      net_drawdown_amount: data.net_drawdown_amount,
      usage_fees: Math.round((req.usage_fees + Number.EPSILON) * 100) / 100,
      usage_fees_including_gst: data.usage_fees_including_gst,
      gst_usage_fees: req.gst_on_usage_fee,
      cgst_usage_fees: req.cgst_on_usage_fee,
      sgst_usage_fees: req.sgst_on_usage_fee,
      igst_usage_fees: req.igst_on_usage_fee,
      repayment_days: data?.repayment_days,
      beneficiary_bank_details_id: data?.beneficiary_bank_details_id,
      product_scheme_id: data?.product_scheme_id,
      invoice_number: data?.invoice_number,
      anchor_name: data?.anchor_name,
      withheld_percentage: data?.withheld_percentage,
      withheld_amount: data?.withheld_amount,
    };
    if (
      data.processing_fees_including_gst !== '' &&
      data.processing_fees_including_gst !== null &&
      data.processing_fees_including_gst !== 'null'
    )
      drawdownRequestData['processing_fees_including_gst'] =
        data.processing_fees_including_gst;

    // Record data in LoanRequestSchema

    const recordDrawdownRequest =
      await LocBatchDrawdownDataSchema.addNew(drawdownRequestData);
    if (recordDrawdownRequest.invoice_number === "") {
      recordDrawdownRequest.invoice_number = recordDrawdownRequest._id + "-D";
      await recordDrawdownRequest.save();
    }



    if (!recordDrawdownRequest)
      throw {
        success: false,
        message: 'Error while recording Drawdown request.',
      };
    req.drawdownRequest = recordDrawdownRequest;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
//FetchSchemeAndBankDetails for Disbursment if beneficiary_bank_source is set for product

const fetchBankDetailsAndInterestRateScheme = async (req, res, next) => {
  try {
    let { beneficiary_bank_source = 'Loan/Line', recon_type = 'FIFO' } =
      req.product;

    //Check for Product Scheme Mapping
    let checkProductSchemeMapping =
      await LocBatchDrawdownDataSchema.checkDrawdownMatchedToWhichScheme(
        req?.body?._id,
      );

    if (checkProductSchemeMapping) {
      let { scheme, productscheme } = checkProductSchemeMapping;
      if (scheme) {
        if (scheme.interest_type == 'Upfront') {
          req.upfront_interest = scheme.interest_rate;
          req.product.interest_type = 'upfront';
        }
        if (scheme.interest_type == 'Rear-end') {
          req.rearended_interest = scheme.interest_rate;
          req.product.interest_type = 'rearended';
        }
        if (req.loanData.loan_int_rate) {
          req.loanData.loan_int_rate = scheme.interest_rate;
        } else {
          req.product.int_value = `${scheme.interest_rate}${scheme.interest_type == 'Upfront' ? 'U' : 'R'
            }P`;
        }
        req.product_scheme_id = productscheme._id;
      }
    }
    if (beneficiary_bank_source == 'Disbursement/Drawdown') {
      //Fetch Details for bank using loc_batch_drawdowm
      let fetchBankDetails =
        await LocBatchDrawdownDataSchema.fetchBankDetailsAgainstDrawdownId(
          req?.body._id,
        );
      let { bankDetails } = fetchBankDetails || {};
      if (bankDetails) {
        req.loanData.bene_bank_account_holder_name =
          bankDetails.bene_bank_account_holder_name;
        req.loanData.bene_bank_acc_num = bankDetails.bene_bank_acc_num;
        req.loanData.bene_bank_ifsc = bankDetails.bene_bank_ifsc;
        req.bankDetails_master_id = bankDetails._id;
      }
    }
    if (recon_type == 'Invoice') {
      let { invoice_number } = await LocBatchDrawdownDataSchema.findOne({
        _id: req?.body?._id,
      });
      req.invoice_number = invoice_number;
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const fetchInterestRateSchemeByProductSchemeId = async (req, res, next) => {
  try {
    //Fetch Details interest rate using loc_batch_drawdowm
    if (req.body?.product_scheme_id && req.body?.repayment_days) {
      throw {
        success: false,
        message: 'Repayment days is not required as scheme is mapped',
      };
    }
    let schemeDetails =
      await ProductSchemeMapping.fetchSchemeByProductSchemeMappingId(
        req?.body?.product_scheme_id,
        req.authData.product_id,
      );
    if (req.body.product_scheme_id && !schemeDetails) {
      throw {
        success: false,
        message: 'Scheme is not mapped',
      };
    }
    if (schemeDetails) {
      req.body.repayment_days = schemeDetails.scheme.repayment_days;
      let { scheme } = schemeDetails;
      if (scheme) {
        if (!schemeDetails.status) {
          throw {
            success: false,
            message: 'Scheme is not active',
          };
        }
        if (scheme.interest_type == 'Upfront') {
          req.upfront_interest = scheme.interest_rate;
          req.product.interest_type = 'upfront';
        }
        if (scheme.interest_type == 'Rear-end') {
          req.rearended_interest = scheme.interest_rate;
          req.product.interest_type = 'rearended';
        }
        if (req.loanData.loan_int_rate) {
          req.loanData.loan_int_rate = scheme.interest_rate;
        } else {
          req.product.int_value = `${scheme.interest_rate}${scheme.interest_type == 'Upfront' ? 'U' : 'R'
            }P`;
        }
      }
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const checkDrawdownRequestExist = async (req, res, next) => {
  try {
    //Check for the first drawdown request
    const drawdownRequestExist = await LocBatchDrawdownDataSchema.findByLoanId(
      req.body.loan_id,
    );
    req.drawdownRequestExist = drawdownRequestExist;
    next();
  } catch {
    return res.status(400).send(error);
  }
};

const validatePFRepaid = async (req, res, next) => {
  try {
    if (!req.drawdownRequestExist) {
      // Validate for the first DDR when “Line pf“ is “repayment” and repayment for the processing fee is not received
      const pfRepaymentReceived =
        await LoanTransactions.findRefundByLoanIDLabel(
          req.body.loan_id,
          'pf',
          'Y',
        );
      if (req.product.line_pf === 'repayment' && !pfRepaymentReceived) {
        throw {
          success: false,
          message: 'Processing fee for the line is not received',
        };
      }
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const verifyPFCalculationByConfig = (req, loanData) => {
  try {
    if (
      loanData.hasOwnProperty('pf_calculated') &&
      loanData.pf_calculated == 0
    ) {
      pfAmount = loanData.processing_fees_amt;
    }
    if (
      loanData.hasOwnProperty('pf_calculated') &&
      loanData.pf_calculated == 1
    ) {
      pfAmount = chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
        req,
        loanData.limit_amount,
        loanData,
      );
    }
    if (!loanData.hasOwnProperty('pf_calculated')) {
      //Calculate processing fees according to product configuration.
      let pfAccordingToProduct =
        chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
          req,
          loanData.sanction_amount,
          loanData,
        );
      //Match it with processing_fees in loan data
      const pfCalculationByPC =
        loanData.processing_fees_amt * 1 === pfAccordingToProduct * 1
          ? true
          : false;
      pfAmount = pfCalculationByPC
        ? chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
          req,
          loanData.limit_amount,
          loanData,
        )
        : loanData.processing_fees_amt;
    }
    return getEPSILON(pfAmount);
  } catch (error) {
    console.log('error', error);
  }
};

const checkInvoiceNumberInCaseOfReconTypeInvoice = async (req, res, next) => {
  try {
    if (
      req.product.recon_type &&
      req.product.recon_type.toLowerCase() == 'invoice'
    ) {
      if (req.body.invoice_number && req.body.loan_id) {
        //check for unique invoice Number
        let invoiceData =
          (await LocBatchDrawdownDataSchema.find({
            invoice_number: req.body.invoice_number,
            loan_id: req.body.loan_id,
            status: { $ne: 4 }
          })) || [];
        if (invoiceData.length > 0) {
          throw {
            success: false,
            message: 'Duplicate Invoice Number',
          };
        }
      }
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = {
  isLineInDPD,
  calculateAvailableLimit,
  checkLineExpiry,
  calculateNetDrawDownAmount,
  updateAvailableLimit,
  recordTransaction,
  validateDrawdownData,
  isProductTypeLoc,
  isCreditLimitSet,
  fetchInterestRateSchemeByProductSchemeId,
  validDrawdownPayload,
  fetchBankDetailsAndInterestRateScheme,
  gstCalculation,
  calculateUsageFees,
  fetchLineStateData,
  recordDrawdownRequest,
  calculateUsageFeesBatch,
  checkIfPFPassed,
  checkDDRecordExists,
  recordPFinCharges,
  validatePFAMount,
  validateDDRPFEntry,
  checkExistingPFCharges,
  recordCharge,
  updatePFBIC,
  checkDrawdownRequestExist,
  validatePFRepaid,
  verifyPFCalculationByConfig,
  checkProductMappedtoScheme,
  checkInvoiceNumberInCaseOfReconTypeInvoice,
  checkIfDDRRequestDisbursmentIntiated,
};

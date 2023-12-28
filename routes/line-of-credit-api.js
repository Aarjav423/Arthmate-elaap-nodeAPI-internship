bodyParser = require('body-parser');
const asyncLib = require('async');
const { check, validationResult } = require('express-validator'); // fields validator
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const CreditLimit = require('../models/loc-credit-limit-schema.js');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const helper = require('../util/helper');
const locHelper = require('../util/line-of-credit-helper.js');
const validate = require('../util/validate-req-body');
const validationCheck = require('../util/kyc-validation');
const moment = require('moment');
const borrowerHelper = require('../util/borrower-helper.js');
const disbursementChannelConfigHelper = require('../util/disbursement-channel-config-helper.js');
const compositeDrawdownHelper = require('../util/composite-drawdown-helper.js');
const locEmiHelper = require('../util/loc-emi-helper.js');
const LoanDocumentCommonSchema = require('../models/loandocument-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema');
const chargesCalculationHelper = require('../util/charges-calculation-helper.js');
const LoanTransactions = require('../models/loan-transaction-ledger-schema.js');
const LineStateAudit = require('../models/line-state-audit.js');
const setCreditLimit = require('../util/setCreditLimitEvent');
const LocBatchDrawdownDataSchema = require('../models/loc-batch-drawdown-schema.js');
const DisbursementChannelConfig = require('../models/disbursement-channel-config-schema');
const DisbursementChannelMasterScehema = require('../models/disbursement-channel-master-schema');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const LineUpdateRecordSchema = require('../models/line-update-record-schema');
const chargesSchema = require('../models/charges-schema');
const AnchorSchema = require('../models/anchor-schema.js');
const chargesHelper = require('../util/charges.js');
const { getEPSILON } = require('../util/math-ops');

const calculateProcessingFees = (req, limit_amount, loanData) => {
  try {
    let processingFeesAmt = loanData.processing_fees_amt
      ? loanData.processing_fees_amt
      : req.product.processing_fees.indexOf('A') > -1
        ? req.product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1
        : req.product.processing_fees.indexOf('P') > -1
          ? ((req.product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
          Number(limit_amount)
          : 0;
    return processingFeesAmt;
  } catch (error) {
    return error;
  }
};

const validDrawdownRequestPayload = [
  check('loan_id').notEmpty().withMessage('loan_id is required'),

  check('no_of_emi')
    .optional({ checkFalsy: false })
    .isNumeric('en-US', { ignore: ' ' })
    .withMessage('Please enter valid no_of_emi'),

  check('drawdown_amount')
    .notEmpty()
    .withMessage('drawdown_amount is required')
    .isFloat()
    .withMessage('Please enter valid drawdown_amount in numeric format.'),

  check('net_drawdown_amount')
    .notEmpty()
    .withMessage('net_drawdown_amount is required')
    .isFloat()
    .withMessage('Please enter valid net_drawdown_amount'),

  check('usage_fees_including_gst')
    .notEmpty()
    .withMessage('usage_fees_including_gst is required')
    .isFloat()
    .withMessage('Please enter valid usage_fees_including_gst'),
];

module.exports = (app, connection) => {
  const checkDisbursementChannelBalance = async (
    company_id,
    product_id,
    disbursement_channel,
  ) => {
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    const channelTransactions = await DisbursementLedgerSchema.findByCondition({
      company_id,
      product_id,
      disbursement_channel,
    });
    channelTransactions.forEach((row, index) => {
      if (row.txn_entry.toLowerCase() == 'dr' && row.txn_stage === '1') {
        totalDebitAmount += parseFloat(row.amount ? row.amount : 0);
      }
      if (row.txn_entry.toLowerCase() == 'cr') {
        totalCreditAmount += parseFloat(row.amount ? row.amount : 0);
      }
    });
    const availableBalance = totalCreditAmount - totalDebitAmount;
    return availableBalance;
  };

  //Fetch credit limit data by loan id
  app.get(
    '/api/credit-limit-data/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const creditLimitData = await CreditLimit.checkCreditLimit(
          req.params.loan_id,
        );
        if (!creditLimitData)
          throw {
            success: false,
            message: 'Credit limit is not set currently for this line.',
          };
        const resultData = {
          'Credit limit': creditLimitData.limit_amount,
          'Available balance': creditLimitData.available_balance,
        };
        return res.status(200).send({ success: true, data: resultData });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Fetch all the data from loc credit limit table
  app.get(
    '/api/credit-limit/',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const crediLimitRecords = await CreditLimit.find({});
        if (!crediLimitRecords.length)
          throw { success: false, message: 'No records found' };
        return res.status(200).send({ success: true, data: crediLimitRecords });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Fetch drawdown data against loan_id and usage_id
  app.get(
    '/api/drawdown-data/:loan_id/:usage_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const { loan_id, usage_id } = req.params;
        // Validate if loan exist
        const loanExist = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanExist.success === false) throw loanExist;

        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;

        const drawdownResp = await LoanTransactions.findByLIDAndUsageId({
          loan_id,
          usage_id,
          txn_entry: 'dr',
        });
        if (!drawdownResp)
          throw {
            success: false,
            message:
              'No drawdown record found against provided loan_id and usage_id',
          };
        const linestateauditResp = await LineStateAudit.findByLIDAndUsageId({
          loan_id,
          usage_id,
        });
        let principal_paid = linestateauditResp?.principal_paid
          ? Number(linestateauditResp.principal_paid)
          : 0;
        let lpi_due = linestateauditResp?.lpi_due
          ? Number(linestateauditResp.lpi_due)
          : 0;
        let lpi_paid = linestateauditResp?.lpi_paid
          ? Number(linestateauditResp.lpi_paid)
          : 0;
        let charges_due = linestateauditResp?.charges_due
          ? Number(linestateauditResp.charges_due)
          : 0;
        let charges_paid = linestateauditResp?.charges_paid
          ? Number(linestateauditResp.charges_paid)
          : 0;
        let gst_due = linestateauditResp?.gst_due
          ? Number(linestateauditResp.gst_due)
          : 0;
        let gst_paid = linestateauditResp?.gst_paid
          ? Number(linestateauditResp.gst_paid)
          : 0;
        let int_paid = linestateauditResp?.interst_paid
          ? Number(linestateauditResp.interst_paid)
          : 0;

        const drawdownRecords = {
          drawdown_amount: drawdownResp.txn_amount,
          net_drawdown_amount: drawdownResp.final_disburse_amt,
          interest_type: req.product.interest_type,
          interest:
            req.product.interest_type === 'upfront'
              ? drawdownResp.upfront_interest
              : req.product.interest_type === 'rearended'
                ? drawdownResp.interest_payable
                : 0,
          usage_fee:
            Number(
              drawdownResp.upfront_usage_fee
                ? drawdownResp.upfront_usage_fee
                : 0,
            ) +
            Number(
              drawdownResp.gst_on_usage_fee ? drawdownResp.gst_on_usage_fee : 0,
            ),
          late_payment_interest: linestateauditResp
            ? linestateauditResp.lpi_due
            : 0,
          dpd: linestateauditResp ? linestateauditResp.dpd : 0,
          due_date: drawdownResp.repayment_due_date,
          repayment_amount:
            Math.round(
              (Number(drawdownResp.txn_amount) -
                principal_paid +
                lpi_due -
                lpi_paid +
                charges_due -
                charges_paid +
                gst_due -
                gst_paid +
                (req.product.interest_type === 'upfront'
                  ? linestateauditResp?.interst_due
                    ? Number(linestateauditResp.interst_due)
                    : 0
                  : linestateauditResp?.int_accrual
                    ? Number(linestateauditResp.int_accrual)
                    : 0) -
                int_paid +
                Number.EPSILON) *
              100,
            ) / 100,
          status: linestateauditResp ? linestateauditResp.status : '',
        };

        return res.status(200).send({ success: true, data: drawdownRecords });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Fetch not_processed records from loc-batch-drawdown schema
  app.post(
    '/api/unprocessed-requests',
    [jwt.verifyToken, jwt.verifyCompany],
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('product_id').notEmpty().withMessage('product_id is required'),
      check('page')
        .notEmpty()
        .withMessage('page is required')
        .isNumeric()
        .withMessage('page accepts only number.'),
      check('limit')
        .notEmpty()
        .withMessage('limit is required')
        .isNumeric()
        .withMessage('limit accepts only number.'),
    ],
    async (req, res) => {
      try {
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const { company_id, product_id, page, limit, status } = req.body;
        const disbursementChannel =
          await DisbursementChannelConfig.getDisburseChannel({
            company_id: company_id,
            product_id: product_id,
          });
        if (!disbursementChannel)
          throw {
            success: false,
            message: `Disburse channel is not configured for selected company `,
          };
        const disbursementChannelMaster =
          await DisbursementChannelMasterScehema.findOneByTitle(
            disbursementChannel.disburse_channel,
          );
        if (!disbursementChannelMaster)
          throw {
            success: false,
            message: `Global disbursement channel not found`,
          };
        const availableChannelBalance = await checkDisbursementChannelBalance(
          company_id,
          product_id,
          disbursementChannelMaster.title,
        );
        // Fetch non processed drawdown requests according to the filters
        const nonProcessedRecords =
          await LocBatchDrawdownDataSchema.getFilteredNonProcessedRecords(
            req.body,
          );
        if (!nonProcessedRecords?.rows?.length)
          throw {
            success: false,
            message: 'No records found against provided filter.',
          };
        nonProcessedRecords.availableBalance = availableChannelBalance;
        nonProcessedRecords.walletConfigCheck =
          disbursementChannel.wallet_config_check;
        return res.status(200).send(nonProcessedRecords);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/credit-limit',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      var reqData = req.body;
      try {
        const productCached = JSON.parse(JSON.stringify(req.product));
        //check if all borrower ids exists in borrower info table
        let uniqueLoanIds = [
          ...new Set(
            reqData.map((item) => {
              return item.loan_id;
            }),
          ),
        ];
        const loanAppIdAlreadyExist =
          await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
        if (loanAppIdAlreadyExist < uniqueLoanIds.length)
          throw {
            success: false,
            message: 'Few loan ids not present in loan',
          };
        // Validate the status of loan ids should be crdit_approved.
        let nonCreditApprovedLoans = [];
        loanAppIdAlreadyExist.forEach((loan) => {
          if (loan.stage * 1 !== 2) {
            nonCreditApprovedLoans.push(loan.loan_id);
          }
        });
        if (nonCreditApprovedLoans.length)
          throw {
            success: false,
            message:
              'Unable to set credit limit as few loan ids are not in crdit_approved status',
            nonCreditApprovedLoans,
          };
        //check if credit-limit already set for loan id
        const existingCreditLimit =
          await CreditLimit.checkMultipleCreditLimit(uniqueLoanIds);
        if (existingCreditLimit.length)
          throw {
            success: false,
            message: 'Credit limit for few loans already exists',
            data: existingCreditLimit,
          };
        const limitRangeError = [];
        let dataToUpdate = [];
        // check if limit amount is between product min and max credit amount
        if (!req.product.min_loan_amount || !req.product.max_loan_amount)
          throw {
            success: false,
            message: 'Credit limit range not defined in product',
          };
        const minLimit = req.product.min_loan_amount;
        const maxLimit = Number(req.product.max_loan_amount);
        let charge_types = [];
        let chargesItems = [];
        for (const item of reqData) {
          let borrowerInfo = await BorrowerinfoCommon.findOneWithKLID(
            item.loan_id,
          );
          borrowerInfo = JSON.parse(JSON.stringify(borrowerInfo));
          if (!borrowerInfo)
            throw {
              success: false,
              message: 'Borrower info not found.',
            };
          if (item.limit_amount < minLimit || item.limit_amount > maxLimit)
            limitRangeError.push({
              loan_id: item.loan_id,
              message:
                'Limit amount needs to be in min and max limit amount range set in product',
            });

          //Calculate and update processing fees and gst on processing fees only when limit_amount differs from sanction_amount.
          let calculateGstOnProcessingFees;
          let processingFees;
          let limitSanctionMatch =
            borrowerInfo.sanction_amount * 1 === item.limit_amount * 1;
          if (!limitSanctionMatch) {
            //Calculate processing fees on limit amount according to product config.
            if (
              borrowerInfo.hasOwnProperty('pf_calculated') &&
              borrowerInfo.pf_calculated == 0
            ) {
              processingFees = borrowerInfo.processing_fees_amt;
            }
            if (
              borrowerInfo.hasOwnProperty('pf_calculated') &&
              borrowerInfo.pf_calculated == 1
            ) {
              processingFees =
                await chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
                  req,
                  item.limit_amount,
                  borrowerInfo,
                );
            }
            if (!borrowerInfo.hasOwnProperty('pf_calculated')) {
              //Calculate processing fees according to product configuration.
              let pfAccordingToProduct =
                await chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
                  req,
                  borrowerInfo.sanction_amount,
                  borrowerInfo,
                );
              //Match it with processing_fees in loan data
              const pfCalculationByPC =
                borrowerInfo.processing_fees_amt * 1 ===
                  pfAccordingToProduct * 1
                  ? true
                  : false;
              processingFees = pfCalculationByPC
                ? await chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
                  req,
                  item.limit_amount,
                  borrowerInfo,
                )
                : borrowerInfo.processing_fees_amt;
            }
            //Calculate gst on processing fees
            calculateGstOnProcessingFees =
              await chargesCalculationHelper.calculateGst(
                req.product,
                borrowerInfo.loan_app_id,
                processingFees,
              );
            //Calculate charges
            const chargeData = {
              loan_id: borrowerInfo.loan_id,
              gst_on_pf_amt: calculateGstOnProcessingFees.calculatedGst,
              cgst_amount: calculateGstOnProcessingFees.calculatedCgst,
              sgst_amount: calculateGstOnProcessingFees.calculatedSgst,
              igst_amount: calculateGstOnProcessingFees.calculatedIgst,
              processing_fees_amt: processingFees,
            };
            charge_types.push(
              chargesHelper.createCharge(
                'Processing Fees',
                chargeData,
                req.company._id,
                req.product._id,
              ),
            );
            if (
              charge_types.length &&
              productCached?.line_pf &&
              productCached.line_pf === 'repayment'
            ) {
              chargesItems = [...chargesItems, ...charge_types];
            }
            charge_types.forEach((chargesItems) => {
              chargesItems.updated_by = req.user.email;
            });
          }
          let updateObj = {
            loan_app_id: borrowerInfo.loan_app_id,
            borrower_id: borrowerInfo.borrower_id,
            loan_id: item.loan_id,
            limit_amount: item.limit_amount,
            sanction_amount: item.limit_amount,
            loan_start_date: moment(new Date()).format('YYYY-MM-DD'),
            status: 'active',
            stage: '4',
            expiry_date: moment(
              moment(new Date()).add(req.product.loan_tenure, 'd'),
            ).format('YYYY-MM-DD'),
          };
          if (!limitSanctionMatch) {
            updateObj.processing_fees_amt = processingFees;
            updateObj.gst_on_pf_amt =
              calculateGstOnProcessingFees?.calculatedGst;
            updateObj.cgst_amount =
              calculateGstOnProcessingFees?.calculatedCgst;
            updateObj.sgst_amount =
              calculateGstOnProcessingFees?.calculatedSgst;
            updateObj.igst_amount =
              calculateGstOnProcessingFees?.calculatedIgst;
          }
          dataToUpdate.push(updateObj);
          item.company_id = req.company._id;
          item.product_id = req.product._id;
          item.company_name = req.company.name;
          item.product_name = req.product.name;
          item.available_balance = item.limit_amount;
        }
        if (limitRangeError.length)
          throw {
            success: false,
            message: 'Credit limit range error',
            data: limitRangeError,
          };

        // Entry in credit-limit-schema table
        const newRecords = await CreditLimit.addInBulk(reqData);
        if (!newRecords)
          throw {
            success: false,
            message: 'Error while recording credit limit data.',
          };
        for (let i = 0; i < reqData.length; i++) {
          //Record loan status change logs
          const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
            req,
            reqData[i].loan_id,
            '',
            'active',
            'system',
          );
        }
        // Update borrowerinfo_common collection
        const updateLoanData =
          await BorrowerinfoCommon.updateBulk(dataToUpdate);
        req.creditLimitData = { reqData, updateLoanData };
        if (!updateLoanData)
          throw {
            success: false,
            message: 'Failed to set loan start date and expiry date .',
          };

        //Update charges collection
        if (chargesItems.length) {
          updateChargeData = await chargesSchema.updateByIdBulk(chargesItems);
          if (!updateChargeData)
            throw {
              success: false,
              message: 'Error while updating charges.',
            };
        }

        reqUtils.json(req, res, next, 200, {
          success: true,
          message: 'credit limit set successfully',
          data: newRecords,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    setCreditLimit.fireSetCreditLimitEvent,
  );

  app.post(
    '/api/composite_drawdown',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      locHelper.validDrawdownPayload,
      locHelper.checkIfDDRRequestDisbursmentIntiated,
      locHelper.checkDrawdownRequestExist,
      locHelper.validateDrawdownData,
      locHelper.isProductTypeLoc,
      borrowerHelper.isLoanExist,
      borrowerHelper.fetchLeadData,
      locHelper.isCreditLimitSet,
      locHelper.fetchLineStateData,
      locHelper.isLineInDPD,
      locHelper.checkLineExpiry,
      locHelper.calculateAvailableLimit,
      locHelper.calculateUsageFees,
      locHelper.gstCalculation,
      locHelper.fetchBankDetailsAndInterestRateScheme,
      locHelper.calculateNetDrawDownAmount,
      locHelper.updateAvailableLimit,
      disbursementChannelConfigHelper.checkDisbursementChannelConfig,
      disbursementChannelConfigHelper.checkWalletBalance,
      locHelper.updatePFBIC,
      disbursementChannelConfigHelper.recordDisbursementLedger,
      compositeDrawdownHelper.callBankWireout,
      locHelper.recordTransaction,
      locEmiHelper.generateEmi,
      locEmiHelper.recordEmi,
      locHelper.recordCharge,
    ],
    async (req, res, next) => {
      const reqData = req.body;
      try {
        const reqData = req.body;
        const interestType = req.product.interest_type;
        const respData = {
          loan_id: reqData.loan_id,
          partner_loan_id: reqData.partner_loan_id,
          due_date: req.drawdownRecord.repayment_due_date,
          int_value:
            interestType === 'upfront'
              ? req.drawdownRecord.upfront_interest
              : interestType === 'rearended'
                ? req.drawdownRecord.interest_payable
                : 0,
          principal_amount: reqData.drawdown_amount,
          usage_id: req.drawdownRecord._id,
          response: req.disbursementResponse,
        };
        if (req.product.force_usage_convert_to_emi) delete respData.due_date;
        return res.status(200).send(respData);
      } catch (error) {
        if (error.response?.status.toString().indexOf('4') > -1) {
          let updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
            { status: 'disbursal_approved', stage: '3' },
            reqData.loan_id,
          );
          //Record loan status change logs
          const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
            req,
            reqData.loan_id,
            req.loanData.status,
            'disbursal_approved',
            'system',
          );
          if (!maintainStatusLogs.success) throw maintainStatusLogs;
        }
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.post(
    '/api/process-drawdown-pf',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      const reqData = req.body;
      try {
        // convert req.body into arrays of loanids withdrawdown
        //{"12345":[{}{}], "1235":[{}{}]}
        let product = JSON.parse(JSON.stringify(req.product))
        let loanIdWiseDD = {};
        let loanIdsWithPF = [];
        let loanIdsWithoutPF = [];
        reqData.forEach((item) => {
          // capture loan_id of record having processing_fees_including_gst
          if (item?.processing_fees_including_gst)
            loanIdsWithPF.push(item.loan_id);
          // get loan ids of DDR not having PF
          if (!item.hasOwnProperty('processing_fees_including_gst'))
            loanIdsWithoutPF.push(item.loan_id);
          loanIdWiseDD.hasOwnProperty(`${item.loan_id}`)
            ? loanIdWiseDD[`${item.loan_id}`].push(item)
            : (loanIdWiseDD[`${item.loan_id}`] = [item]);
        });
        const uniqueLoanIdsWithPF = [...new Set(loanIdsWithPF)];
        const uniqueLoanIdsWithoutPF = [...new Set(loanIdsWithoutPF)];
        const uniqueLoanIdsPFOnHold = [];
        // Check if any DDR having pf and pf is recorded in charges already for processing fees.
        if (uniqueLoanIdsWithPF.length) {
          const chargesRecordPFLID = await chargesSchema.findbyCondition({
            charge_type: 'Processing Fees',
            loan_id: { $in: uniqueLoanIdsWithPF },
          });
          if (chargesRecordPFLID.length)
            throw {
              success: false,
              message: `loan ids ${uniqueLoanIdsWithPF.toString()} drawdown trying to record processing fees but it is already charged.`,
            };
        }
        if (uniqueLoanIdsWithoutPF.length) {
          // check if particular loan Ids have DDR with PF requested to record in them
          const allDDByLIDHavingPF =
            await LocBatchDrawdownDataSchema.findAllRecordsByLIDHavingPF(
              uniqueLoanIdsWithoutPF,
            );
          // unique loa ids from DDR with PF requested to record in them
          const uniqueLoanIdsHavePFInDDR = [
            ...new Set(allDDByLIDHavingPF.map((item) => item.loan_id)),
          ];
          if (uniqueLoanIdsHavePFInDDR.length) {
            for (const recordDDRPF of uniqueLoanIdsHavePFInDDR) {
              // check if requested PF in DDR is already processed recorded and not on hold
              const chargesRecordPFLID =
                await chargesSchema.findAllChargeByLIDPF(
                  recordDDRPF,
                  'Processing Fees',
                );
              const havePfEntryIncCurrentBatch = loanIdWiseDD[
                recordDDRPF
              ].filter((item) =>
                item.hasOwnProperty('processing_fees_including_gst'),
              );
              if (
                (!chargesRecordPFLID || !chargesRecordPFLID.length) &&
                !havePfEntryIncCurrentBatch.length
              ) {
                // if PF not recorded in charges against loan id then should not process other drawdown until drawdown with pf gets processed.
                uniqueLoanIdsPFOnHold.push(recordDDRPF);
              }
            }
          }
          // If any records of PF is not recorded in charges means not processed then ask user to select record having pf first or in first batch.
          if (uniqueLoanIdsPFOnHold.length && product.line_pf)
            throw {
              success: false,
              message: `loan ids ${uniqueLoanIdsPFOnHold.toString()} have processing fees requested in them and not processed yet. Kindly select draw down request of respective loan_id before processing any other drawdown under same loan_id.`,
            };
        }

        return res.status(200).send({
          success: true,
          canProcessDisbursement: true,
          message: 'ALl drawdown are ok to process',
          data: loanIdWiseDD,
          uniqueLoanIdsWithPF,
          uniqueLoanIdsWithoutPF,
          uniqueLoanIdsPFOnHold,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // API to record drawdown request
  app.post(
    '/api/record-drawdown-request',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validDrawdownRequestPayload,
    borrowerHelper.isLoanExistByLID,
    borrowerHelper.fetchLeadData,
    locHelper.checkDrawdownRequestExist,
    locHelper.validateDrawdownData,
    locHelper.checkInvoiceNumberInCaseOfReconTypeInvoice,
    locHelper.isCreditLimitSet,
    locHelper.fetchLineStateData,
    locHelper.isLineInDPD,
    locHelper.calculateAvailableLimit,
    locHelper.calculateUsageFeesBatch,
    locHelper.checkProductMappedtoScheme,
    locHelper.fetchInterestRateSchemeByProductSchemeId,
    locHelper.gstCalculation,
    locHelper.validatePFAMount,
    locHelper.validatePFRepaid,
    locHelper.calculateNetDrawDownAmount,
    locHelper.validateDDRPFEntry,
    locHelper.checkExistingPFCharges,
    locHelper.recordDrawdownRequest,
    async (req, res) => {
      try {
        const data = req.body;
        if (req.drawdownRequest) {
          let respData = {
            loan_id: data.loan_id,
            no_of_emi: data.no_of_emi,
            drawdown_request_id: req.drawdownRequest._id,
            drawdown_amount: data.drawdown_amount,
            net_drawdown_amount: req.net_drawdown_amount,
            usage_fees_including_gst: data.usage_fees_including_gst,
            anchor_name: data.anchor_name,
            withheld_percentage: data?.withheld_percentage,
            withheld_amount: data?.withheld_amount
          };
          return res.status(200).send({
            success: true,
            message: 'Drawdown request recorded successfully.',
            data: respData,
          });
        }
      } catch (error) {

        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/calculate-net-drawdown-amount',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    locHelper.calculateUsageFeesBatch,
    locHelper.fetchInterestRateSchemeByProductSchemeId,
    locHelper.gstCalculation,
    locHelper.calculateNetDrawDownAmount,
    async (req, res, next) => {
      try {
        if (req.net_drawdown_amount) {
          let responseData = {
            net_drawdown_amount: req.net_drawdown_amount,
          };
          return res.status(200).send({
            success: true,
            message: 'success',
            data: responseData,
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/update-record-drawdown-request',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    locHelper.checkProductMappedtoScheme,
    locHelper.calculateUsageFeesBatch,
    locHelper.fetchInterestRateSchemeByProductSchemeId,
    locHelper.gstCalculation,
    locHelper.calculateNetDrawDownAmount,
    async (req, res, next) => {
      try {
        const data = req.body;
        const query = {
          loan_id: data.loan_id,
          _id: data.request_id,
        };
        const recordDetails = {
          beneficiary_bank_details_id: data?.beneficiary_bank_details_id,
          product_scheme_id: data?.product_scheme_id,
          invoice_number: data?.invoice_number,
          net_drawdown_amount: data?.net_drawdown_amount,
          upfront_int: req?.upfront_interest,
          anchor_name: data?.anchor_name,
          repayment_days: data?.repayment_days
        };
        const recordDrawdownRequest =
          await LocBatchDrawdownDataSchema.updateByLid(query, recordDetails);
        if (!recordDrawdownRequest) {
          throw {
            success: false,
            message: 'Error while updating Drawdown request recorded',
          };
        }
        return res.status(200).send({
          success: true,
          message: 'Drawdown request recorded updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/reject-record-drawdown-request',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const data = req.body;
        const query = {
          loan_id: data.loan_id,
          _id: data.request_id,
        };

        const existingRecord = await LocBatchDrawdownDataSchema.findOne(query);

        if (!existingRecord) {
          throw {
            success: false,
            message: 'Record not found. Unable to reject the DDR.',
          };
        }


        existingRecord.invoice_number = `${existingRecord.invoice_number}-R ${moment().format('DD:MM:YYYY:HH:MM:SS')}`;

        const recordDetails = {
          status: 4,

          invoice_number: existingRecord.invoice_number,
        };

        const recordDrawdownRequest = await LocBatchDrawdownDataSchema.updateByLid(query, recordDetails);

        if (!recordDrawdownRequest) {
          throw {
            success: false,
            message: 'Sorry unable to reject the DDR. Please contact the administrator.',
          };
        }

        return res.status(200).send({
          success: true,
          message: 'DDR has been successfully rejected.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );


  app.put(
    '/api/credit-limit',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      borrowerHelper.isLoanExistByLID,
      locHelper.fetchLineStateData,
      locHelper.isLineInDPD,
    ],
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('limit_amount')
        .notEmpty()
        .isNumeric()
        .withMessage('Please enter valid limit_amount'),
    ],
    async (req, res, next) => {
      try {
        const { loan_id, limit_amount, updated_tenure } = req.body;
        let loanDataToUpdate = [];
        let gstOnPfAmount = 0;
        let cgstOnPfAmount = 0;
        let sgstOnPfAmount = 0;
        let igstOnPfAmount = 0;
        //Validate the request data
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        // Check if limit is already set for given loan_id
        const limitAlreadySet = await CreditLimit.checkCreditLimit(loan_id);
        if (!limitAlreadySet)
          throw {
            success: false,
            message: `Credit limit is not set for this ${loan_id}. Please first set limit.`,
          };
        // check if limit amount is between product min and max credit amount
        if (!req.product.min_loan_amount || !req.product.max_loan_amount)
          throw {
            success: false,
            message: 'Credit limit range not defined in product',
          };
        //Validate if limit_amount is in the range of min_loan_amount and max_loan_amount
        if (
          Number(limit_amount) < req.product.min_loan_amount ||
          Number(limit_amount) > Number(req.product.max_loan_amount)
        )
          throw {
            success: false,
            message:
              'limit_amount needs to be within min_loan_amount and max_loan_amount configured in product',
          };
        // Check if limit_amount needs to be updated is greater than already existing limit.
        if (Number(limit_amount) <= Number(limitAlreadySet.limit_amount))
          throw {
            success: false,
            message: `Limit amount to be updated should be greater than currently existing limit i.e.${limitAlreadySet.limit_amount} `,
          };
        if (
          (req.body?.updated_tenure && isNaN(req.body?.updated_tenure)) ||
          Number(req.body?.updated_tenure) < 1
        )
          throw {
            success: false,
            message: `updated_tenure can be only number greater than zero`,
          };
        //validate if the revised agreement is uploaded in the loandocuments
        const validateRevisedAgreement =
          await LoanDocumentCommonSchema.findByCondition({
            loan_app_id: req.loanData.loan_app_id,
            file_type: 'revised_agreement',
          });
        if (!validateRevisedAgreement)
          throw {
            success: false,
            message: 'Revised agreement is required to update limit amount.',
          };
        const avialableBalaceToUpdate =
          Number(limitAlreadySet.available_balance) +
          (Number(limit_amount) - Number(limitAlreadySet.limit_amount));
        // if (avialableBalaceToUpdate > req.loanData.sanction_amount) {
        //avialableBalaceToUpdate = req.loanData.sanction_amount;
        // }
        // Calculate processing fees on the amount by which we are increasing existing limit
        const increaseLimitAmountBy =
          Number(limit_amount) - Number(limitAlreadySet.limit_amount);
        const processingFees =
          await chargesCalculationHelper.calculateProcessingFeesUpdateLimit(
            req,
            increaseLimitAmountBy,
            req.loanData,
          );
        // calculate gst, cgst, sgst and igst on processing fees
        const calculateGstOnProcessingFees =
          await chargesCalculationHelper.calculateGst(
            req.product,
            req.loanData.loan_app_id,
            processingFees,
          );
        gstOnPfAmount = calculateGstOnProcessingFees.calculatedGst;
        cgstOnPfAmount = calculateGstOnProcessingFees.calculatedCgst;
        sgstOnPfAmount = calculateGstOnProcessingFees.calculatedSgst;
        igstOnPfAmount = calculateGstOnProcessingFees.calculatedIgst;
        // Prepare loan data that needs to be updated
        let objData = {
          loan_app_id: req.loanData.loan_app_id,
          borrower_id: req.loanData.borrower_id,
          loan_id,
          limit_amount: limit_amount,
          sanction_amount: limit_amount,
          processing_fees_1: processingFees,
          gst_on_pf_amt_1: gstOnPfAmount,
          cgst_amount_1: cgstOnPfAmount,
          sgst_amount_1: sgstOnPfAmount,
          igst_amount_1: igstOnPfAmount,
          processing_fees_amt:
            req.loanData.processing_fees_amt * 1 + processingFees * 1,
          gst_on_pf_amt: req.loanData.gst_on_pf_amt * 1 + gstOnPfAmount * 1,
          cgst_amount: req.loanData.cgst_amount * 1 + cgstOnPfAmount * 1,
          sgst_amount: req.loanData.sgst_amount * 1 + sgstOnPfAmount * 1,
          igst_amount: req.loanData.igst_amount * 1 + igstOnPfAmount * 1,
        };
        if (req.body?.updated_tenure) {
          objData['updated_line_start_date'] = moment().format('YYYY-MM-DD');
          objData['updated_line_end_date'] = moment()
            .add(req.body?.updated_tenure * 1, 'days')
            .format('YYYY-MM-DD');
          objData['expiry_date'] = moment()
            .add(req.body?.updated_tenure * 1, 'days')
            .format('YYYY-MM-DD');
        }

        loanDataToUpdate.push(objData);
        // update data in borrower info common table
        const updateLoanData =
          await BorrowerinfoCommon.updateBulk(loanDataToUpdate);
        if (!updateLoanData)
          throw {
            success: false,
            message: 'Failed to update data in borrower info common.',
          };
        const lineUpdateRecord = await LineUpdateRecordSchema.addNew({
          loan_app_id: req.loanData.loan_app_id,
          loan_id: req.loanData.loan_id,
          borrower_id: req.loanData.borrower_id,
          partner_loan_app_id: req.loanData.partner_loan_app_id,
          partner_loan_id: req.loanData.partner_loan_id,
          partner_borrower_id: req.loanData.partner_borrower_id,
          sanction_amount: limit_amount,
          updated_by: req.user._id,
        });
        if (!lineUpdateRecord)
          throw {
            success: false,
            message: 'Failed to record line update collection.',
          };
        // Update credit limit against loan_id

        const updateCreditLimit = await CreditLimit.updateCreditLimitData(
          loan_id,
          {
            limit_amount,
            available_balance: avialableBalaceToUpdate,
          },
        );
        if (!updateCreditLimit)
          throw {
            success: false,
            message: 'Error while updating credit limit data',
          };
        let responseObj = {
          success: true,
          message: `Limit amount for ${loan_id} updated successfully`,
          loan_id: loan_id,
          limit_amount: limit_amount,
        };
        if (updated_tenure) responseObj['updated_tenure'] = updated_tenure;
        return res.status(200).send(responseObj);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

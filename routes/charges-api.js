const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema');
const LoanRequestSchema = require('../models/loan-request-schema');
const Charges = require('../models/charges-schema');
const borrowerHelper = require('../util/borrower-helper.js');
const { calculateGSTOnCharges } = require('../util/calculation');
const dateRegex = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;
const ChargeTypeSchema = require('../models/charge-type-schema');
const LoanState = require('../models/loan-state-schema');
const WaiverRequestSchema = require('../models/waiver-request-schema');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema');
const sequenceHelper = require('../util/customLoanIdHelper');
const calculationHelper = require('../util/calculation.js');
let reqUtils = require('../util/req.js');
const moment = require('moment');
const waiverEvent = require('../util/waiver-event.js');
const waiverHelper = require('../util/waiver-helper.js');
const foreclosureReconLoanStatus = require('../models/foreclosure-recon-schema');

module.exports = (app, passport) => {
  app.get(
    '/api/charge-types',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const chargeTypes = await ChargeTypeSchema.getAll();
        if (!chargeTypes.length)
          throw {
            success: false,
            message: 'No records found for charge type.',
          };
        if (chargeTypes)
          return res.status(200).send({
            success: true,
            data: chargeTypes,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/charges/:company_id/:product_id/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { company_id, product_id, loan_id } = req.params;
        const borrowerRecord =
          await BorrowerinfoCommon.findOneWithKLID(loan_id);
        if (!borrowerRecord)
          throw {
            success: false,
            message: 'no record found for this loan_id ',
          };
        if (borrowerRecord.company_id.toString() !== company_id.toString())
          throw {
            success: false,
            message:
              'Company is not same as requested for in url for this loan_id ',
          };
        if (borrowerRecord.product_id.toString() !== product_id.toString())
          throw {
            success: false,
            message:
              'Product is not same as requested for in url for this loan_id ',
          };
        const charges = await Charges.findAllChargeWithKlid(req.params.loan_id);
        if (!charges || !charges.length)
          throw {
            success: false,
            message: 'No records found for charges against this loan_id.',
          };
        if (charges)
          return res.status(200).send({
            success: true,
            data: charges,
            other_dettails: {
              name: `${borrowerRecord.first_name} ${borrowerRecord.last_name}`,
              loan_id: `${borrowerRecord.loan_id}`,
            },
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/charges',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    borrowerHelper.fetchLeadData,
    [
      check('charge_name')
        .notEmpty()
        .withMessage('Please enter charge_name')
        .matches(/^(Bounce Charge|Foreclosure Charges|Breakin Charge)$/)
        .withMessage(
          'charge_name can be Bounce Charge/Foreclosure Charge/Breakin Charge',
        ),
      check('charge_application_date')
        .notEmpty()
        .withMessage('charge_application_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage(
          'Please enter valid charge_application_date in YYYY-MM-DD format',
        ),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Validate if charge type exist.
        const chargeTypeExist = await ChargeTypeSchema.findByName(
          req.body.charge_name,
        );
        if (!chargeTypeExist)
          throw { success: false, message: 'Charge type not exist.' };
        req.chargeTypeExist = chargeTypeExist;

        // Function to process charges according to the charge name
        const processCharge = await handleCharges(
          req,
          req.body.charge_name,
          req.leadData,
        );
        processCharge.created_by = req.user.email;
        processCharge.updated_by = req.user.email;
        // Record charges in charges table
        const recordChargeResp = await Charges.addNew(processCharge);
        if (!recordChargeResp)
          throw { success: false, message: 'Error while recording charges.' };
        if (recordChargeResp)
          return res.status(200).send({
            success: true,
            message: 'Charges recorded successfully.',
            data: recordChargeResp,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/charges/foreclosurecharge',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    [
      check('charge_type')
        .notEmpty()
        .withMessage('Please enter charge_type')
        .matches(/^(Foreclosure Charges)$/)
        .withMessage('charge_type should be  Foreclosure Charges'),
      check('charge_application_date')
        .notEmpty()
        .withMessage('charge_application_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage(
          'Please enter valid charge_application_date in YYYY-MM-DD format',
        ),
      check('foreclosure_recon_id')
        .notEmpty()
        .withMessage('Please enter foreclosure_recon_id'),
      check('loan_id').notEmpty().withMessage('Please enter loan_id'),
      check('charge_id').notEmpty().withMessage('Please enter charge_id'),
      check('charge_amount')
        .notEmpty()
        .withMessage('Please enter charge_amount'),
      check('gst').notEmpty().withMessage('Please enter gst'),
      check('cgst').notEmpty().withMessage('Please enter cgst'),
      check('sgst').notEmpty().withMessage('Please enter sgst'),
      check('igst').notEmpty().withMessage('Please enter igst'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Validate if charge type exist.
        const chargeTypeExist = await ChargeTypeSchema.findByNameAndId(
          req.body.charge_type,
          req.body.charge_id,
        );
        if (!chargeTypeExist)
          throw {
            success: false,
            message: 'Charge type and Charge id combination does not exist.',
          };

        // Function to process charges according to the charge name
        const processCharge = await handleCharges(
          req,
          req.body.charge_type,
          req.leadData,
        );

        //ForeclosureReconData Check
        const foreclosureReconData =
          await foreclosureReconLoanStatus.statusApproved(
            req.body.loan_id,
            req.body.foreclosure_recon_id,
          );
        if (!foreclosureReconData) {
          throw {
            success: false,
            message: 'Loan is not applicable for foreclosure',
          };
        }
        const application_date = moment(
          foreclosureReconData.foreclosure_date,
        ).format('YYYY-MM-DD');
        if (application_date != req.body.charge_application_date) {
          throw {
            success: false,
            message: 'charge_application_date does not match.',
          };
        }
        processCharge.created_by = "FORECLOSURE_BATCH";
        processCharge.updated_by = "FORECLOSURE_BATCH";
        // Record charges in charges table
        const recordForeClosureChargeResp = await Charges.addNew(processCharge);
        if (!recordForeClosureChargeResp)
          throw { success: false, message: 'Error while recording charges.' };
        if (recordForeClosureChargeResp)
          return res.status(200).send({
            success: true,
            message: 'Foreclosure Charges recorded successfully.',
            data: recordForeClosureChargeResp,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/waiver-details/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    async (req, res, next) => {
      try {
        const loan_id = req.params.loan_id;
        const loanStateData = await LoanState.findByCondition({ loan_id });
        const current_int_due = loanStateData?.current_int_due || 0;
        const current_lpi_due = loanStateData?.current_lpi_due || 0;
        //Fetch data from charges collection against loan_id
        const chargeRecords = await Charges.findAllChargeByCondition(
          loan_id,
          1,
          [null, 'null'],
        );
        //Calculate bounce charges and gst on bounce charges using formula.
        let bounceCharges = 0;
        let gstOnBounceCharges = 0;
        if (chargeRecords.length) {
          let chargesData = JSON.parse(JSON.stringify(chargeRecords));
          chargesData.forEach((item) => {
            bounceCharges +=
              item?.charge_amount * 1 -
              item?.total_amount_waived * 1 -
              item?.total_amount_paid * 1;
            gstOnBounceCharges +=
              item?.gst * 1 -
              item?.total_gst_reversed * 1 -
              item?.total_gst_paid * 1;
          });
        }
        let finalRecords = [];
        chargeRecords.forEach((chargeItem) => {
          let clone = JSON.parse(JSON.stringify(chargeItem));
          const charge_amount = chargeItem.charge_amount * 1 || 0;
          const total_amount_waived = chargeItem.total_amount_waived * 1 || 0;
          const total_amount_paid = chargeItem.total_amount_paid * 1 || 0;
          const deductions = total_amount_waived + total_amount_paid;
          clone['final_charge_amount'] = charge_amount - deductions;
          clone['final_charge_amount'] =
            Math.round((clone['final_charge_amount'] + Number.EPSILON) * 100) /
            100;
          const gstAmount = chargeItem.gst * 1 || 0;
          const total_gst_reversed = chargeItem.total_gst_reversed * 1 || 0;
          const total_gst_paid = chargeItem.total_gst_paid * 1 || 0;
          const deductionsGST = total_gst_reversed + total_gst_paid;
          clone['final_gst'] = gstAmount - deductionsGST;
          clone['final_gst'] =
            Math.round((clone['final_gst'] + Number.EPSILON) * 100) / 100;
          finalRecords.push(clone);
        });
        if (finalRecords)
          return res.status(200).send({
            loan_id: loan_id,
            interest: calculationHelper.getVal(current_int_due),
            bounce_charges:
              Math.round((bounceCharges * 1 + Number.EPSILON) * 100) / 100,
            gst_on_bounce_charges:
              Math.round((gstOnBounceCharges * 1 + Number.EPSILON) * 100) / 100,
            lpi: calculationHelper.getVal(current_lpi_due),
            success: true,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to get waiver request details by loan id
  app.get(
    '/api/waiver-request-details/:loan_id/:sr_req_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    async (req, res, next) => {
      try {
        const { loan_id, sr_req_id } = req.params;
        const loanStateData = await LoanState.findByCondition({ loan_id });
        let waiverRequestExist = {};
        waiverRequestExist = await WaiverRequestSchema.findByReqId(sr_req_id);
        if (!waiverRequestExist)
          throw {
            success: false,
            message: 'No records found for waiver request.',
          };
        waiverRequestExist = JSON.parse(JSON.stringify(waiverRequestExist));
        const current_int_due = loanStateData?.current_int_due || 0;
        const current_lpi_due = loanStateData?.current_lpi_due || 0;
        //Fetch data from charges collection against loan_id
        const chargeRecords = await Charges.findAllChargeByCondition(
          loan_id,
          1,
          [null, 'null'],
        );
        //Calculate bounce charges and gst on bounce charges using formula.
        let bounceCharges = 0;
        let gstOnBounceCharges = 0;
        if (chargeRecords.length) {
          let chargesData = JSON.parse(JSON.stringify(chargeRecords));
          chargesData.forEach((item) => {
            bounceCharges +=
              item?.charge_amount * 1 -
              item?.total_amount_waived * 1 -
              item?.total_amount_paid * 1;
            gstOnBounceCharges +=
              item?.gst * 1 -
              item?.total_gst_reversed * 1 -
              item?.total_gst_paid * 1;
          });
        }

        return res.status(200).send({
          loan_id: loan_id,
          interest: calculationHelper.getVal(current_int_due),
          bounce_charges:
            Math.round((bounceCharges * 1 + Number.EPSILON) * 100) / 100,
          gst_on_bounce_charges:
            Math.round((gstOnBounceCharges * 1 + Number.EPSILON) * 100) / 100,
          lpi: calculationHelper.getVal(current_lpi_due),
          prin_os: loanStateData?.prin_os * 1 ? loanStateData?.prin_os * 1 : 0,
          data: waiverRequestExist,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/waiver-requests/:company_id/:product_id/:status/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { company_id, product_id, status, page, limit } = req.params;

        if (Number(company_id) !== Number(req.company._id))
          throw {
            success: false,
            message: 'company_id mismatch with authorization.',
          };
        if (Number(product_id) !== Number(req.product._id))
          throw {
            success: false,
            message: 'product_id mismatch with authorization.',
          };

        const waiverResp = await WaiverRequestSchema.getFilteredWaiverRequest({
          company_id,
          product_id,
          status,
          page,
          limit,
        });
        if (!waiverResp.rows.length)
          throw {
            sucess: false,
            message: 'No Waiver request exist for provided filter',
          };

        return res.status(200).send({
          success: true,
          data: {
            rows: waiverResp.rows,
            count: waiverResp.count,
          },
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.get(
    '/api/waiver-requests-loan/:company_id/:product_id/:status/:page/:limit/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { company_id, product_id, status, page, limit, loan_id } =
          req.params;

        if (Number(company_id) !== Number(req.company._id))
          throw {
            success: false,
            message: 'company_id mismatch with authorization.',
          };
        if (Number(product_id) !== Number(req.product._id))
          throw {
            success: false,
            message: 'product_id mismatch with authorization.',
          };

        const waiverResp =
          await WaiverRequestSchema.getFilteredWaiverRequestByLoanId({
            company_id,
            product_id,
            status,
            page,
            limit,
            loan_id,
          });
        if (!waiverResp.rows.length)
          throw {
            sucess: false,
            message: 'No Waiver request exist for provided filter',
          };

        return res.status(200).send({
          success: true,
          data: {
            rows: waiverResp.rows,
            count: waiverResp.count,
          },
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/waiver-request',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('loan_id').notEmpty().withMessage('loan_id is required.'),
      check('interest_waiver')
        .notEmpty()
        .withMessage('interest_waiver is required.')
        .matches(/^[0-9.]+$/)
        .withMessage('Waiver input cannot be negative.'),
      check('bc_waiver')
        .notEmpty()
        .withMessage('bc_waiver is required.')
        .matches(/^[0-9.]+$/)
        .withMessage('Waiver input cannot be negative.'),
      check('gst_reversal_bc')
        .notEmpty()
        .withMessage('gst_reversal_bc is required.')
        .matches(/^[0-9.]+$/)
        .withMessage('Waiver input cannot be negative.'),
      check('lpi_waiver')
        .notEmpty()
        .withMessage('lpi_waiver is required.')
        .matches(/^[0-9.]+$/)
        .withMessage('Waiver input cannot be negative.'),
      check('request_remark')
        .notEmpty()
        .withMessage('request_remark is required.'),
    ],
    async (req, res) => {
      try {
        //Validate input payload
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw { success: false, message: errors.errors[0]['msg'] };
        //Check if loan_id exist in database.
        const loanExist = await BorrowerinfoCommon.findByCondition({
          loan_id: data.loan_id,
        });
        if (!loanExist)
          throw {
            success: false,
            message: 'No records found for given loan_id.',
          };
        //Check for open waiver request from loan transaction ledger schema.
        const openWaiverRequestExistinLoanTransaction =
          await LoanTransactionLedgerSchema.findOpenWaiverRequest(data.loan_id);
        if (openWaiverRequestExistinLoanTransaction.length)
          throw {
            success: false,
            message: 'Request Failed as an active waiver is in progress',
          };
        //Check for open waiver requests in waiver_requests collection.
        const openWaiverRequestExist =
          await WaiverRequestSchema.getOpenWaiverRequest(data.loan_id);
        if (openWaiverRequestExist.length)
          throw {
            success: false,
            message: 'Request Failed as an active waiver is in progress',
          };
        //Fetch data from loan_state against loan_id
        const loanStateData = await LoanState.findByLID(data.loan_id);
        let current_int_due = loanStateData?.current_int_due
          ? calculationHelper.getVal(loanStateData?.current_int_due) * 1
          : 0;
        let current_lpi_due = loanStateData?.current_lpi_due
          ? calculationHelper.getVal(loanStateData?.current_lpi_due) * 1
          : 0;
        //interest_waiver validation
        if (data.interest_waiver * 1 > current_int_due)
          throw {
            success: false,
            message: 'interest_waiver cannot be higher than interest.',
          };

        //lpi_waiver validation
        if (data.lpi_waiver * 1 > current_lpi_due)
          throw {
            success: false,
            message: 'lpi_waiver cannot be higher than lpi.',
          };

        //Fetch data from charges collection against loan_id
        const chargesResp = await Charges.findAllChargeByCondition(
          data.loan_id,
          1,
          [null, 'null', ''],
        );
        let bounceCharges = 0;
        let gstOnBounceCharges = 0;
        if (chargesResp.length) {
          let chargesData = JSON.parse(JSON.stringify(chargesResp));
          chargesData.forEach((item) => {
            bounceCharges +=
              item?.charge_amount * 1 -
              item?.total_amount_waived * 1 -
              item?.total_amount_paid * 1;
            gstOnBounceCharges +=
              item?.gst * 1 -
              item?.total_gst_reversed * 1 -
              item?.total_gst_paid * 1;
          });
        }
        //bc_waiver validation
        if (data.bc_waiver * 1 > bounceCharges * 1)
          throw {
            success: false,
            message:
              'bounce_charges_waiver cannot be higher than bounce_charges.',
          };

        //if gst_reversal_bc is not 18% of bounce_charges_waiver, ‘gst_reversal_bc should be (18% of bounce_charges_waiver)’
        if (
          data.gst_reversal_bc * 1 !==
          Math.round((data.bc_waiver * 1 * 0.18 + Number.EPSILON) * 100) / 100
        )
          throw {
            success: false,
            message: `gst_reversal_bc should be ${
              Math.round((data.bc_waiver * 1 * 0.18 + Number.EPSILON) * 100) /
              100
            }`,
          };

        //Generate sr_req_id
        const waiverRequestsCount = await WaiverRequestSchema.getCount();
        const sequence = sequenceHelper.generateSequence(
          waiverRequestsCount + 1,
          10,
        );
        const srReqId = `WVREQ${sequence}`;
        //Prepare data to record in waiver_requests collection
        const dataObj = {
          sr_req_id: srReqId,
          company_id: req.company._id,
          product_id: req.product._id,
          company_name: req.company.name,
          product_name: req.product.name,
          loan_id: data.loan_id,
          interest_waiver: data.interest_waiver,
          gst_on_bc_at_waiver:
            Math.round((bounceCharges * 0.18 + Number.EPSILON) * 100) / 100,
          bc_waiver: data.bc_waiver,
          gst_reversal_bc: data.gst_reversal_bc,
          lpi_waiver: data.lpi_waiver,
          request_remark: data.request_remark,
          customer_name: `${loanExist.first_name} ${loanExist.last_name}`,
          request_type:
            req.authData.type === 'api'
              ? 'waiver request api'
              : req.authData.type === 'dash' || req.authData.type === 'dash-api'
              ? 'waiver request UI'
              : '',
          requested_by:
            req.authData.type === 'api'
              ? req.company.name
              : req.authData.type === 'dash' || req.authData.type === 'dash-api'
              ? req.user.username
              : '',
          valid_till: moment().format('YYYY-MM-DD'),
          waiver_req_date: moment(),
        };
        // Record request in database.
        const recordWaiverRequest = await WaiverRequestSchema.addNew(dataObj);
        if (!recordWaiverRequest)
          throw {
            success: false,
            message: 'Error while recording waiver request.',
          };
        if (recordWaiverRequest) {
          return res.status(200).send({
            success: true,
            message: `Waiver Request ${srReqId} created successfully on ${moment().format(
              'YYYY-MM-DD',
            )}`,
            data: recordWaiverRequest,
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to approve waiver request.
  app.put(
    '/api/waiver-request-status/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('sr_req_id').notEmpty().withMessage('sr_req_id is required'),
      check('status')
        .notEmpty()
        .withMessage('status is required')
        .matches(/^(approved|rejected)$/)
        .withMessage('status can be approved/rejected'),
      check('approver_remarks')
        .notEmpty()
        .withMessage('approver_remarks is required'),
    ],
    async (req, res, next) => {
      try {
        const { loan_id, sr_req_id, status, approver_remarks } = req.body;
        let bounceCharges = 0;
        let gstOnBounceCharges = 0;
        let gstReversalOnBounceCharges = 0;
        let currentIntDue = 0;
        let currentLPIDue = 0;
        // Validate the input payload.
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Check if loan exist by loan id.
        const loanExist = await BorrowerinfoCommon.findByCondition({
          loan_id: loan_id,
        });
        if (!loanExist)
          throw {
            success: false,
            message: 'No records found for given loan_id.',
          };
        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;
        //Check if waiver request exist by sr_req_id and _id.
        let waiverRequestExist = await WaiverRequestSchema.findByIdAndReqId(
          req.params.id,
          sr_req_id,
        );
        if (!waiverRequestExist)
          throw { success: false, message: 'Waiver request not found.' };
        waiverRequestExist = JSON.parse(JSON.stringify(waiverRequestExist));
        const { interest_waiver, bc_waiver, lpi_waiver, gst_reversal_bc } =
          waiverRequestExist;
        //Return if already approved/rejected.
        if (
          waiverRequestExist.hasOwnProperty('status') &&
          waiverRequestExist.status !== 'pending'
        )
          throw {
            success: false,
            message: `Waiver request is already in ${waiverRequestExist.status} status, hence unable to update the status.`,
          };
        //Fetch data from loan_state against loan_id
        const loanStateData = await LoanState.findByLID(loan_id);
        if (loanStateData) {
          currentIntDue = loanStateData?.current_int_due
            ? calculationHelper.getVal(loanStateData?.current_int_due) * 1
            : 0;
          currentLPIDue = loanStateData?.current_lpi_due
            ? calculationHelper.getVal(loanStateData?.current_lpi_due) * 1
            : 0;
        }
        //Fetch data from charges collection against loan_id
        const chargesResp = await Charges.findAllChargeByCondition(loan_id, 1, [
          null,
          'null',
          '',
        ]);
        if (chargesResp.length) {
          let chargesData = JSON.parse(JSON.stringify(chargesResp));
          chargesData.forEach((item) => {
            bounceCharges +=
              item?.charge_amount * 1 -
              item?.total_amount_waived * 1 -
              item?.total_amount_paid * 1;
            gstOnBounceCharges +=
              item?.gst * 1 -
              item?.total_gst_reversed * 1 -
              item?.total_gst_paid * 1;
            gstReversalOnBounceCharges += item?.total_gst_reversed * 1;
          });
        }
        //Validations for waiver request.
        if (status.toLowerCase() === 'approved') {
          //interest_waiver validation
          if (
            interest_waiver * 1 > 0 &&
            interest_waiver * 1 > currentIntDue * 1
          )
            throw {
              success: false,
              message:
                'interest_waiver amount cannot be greater than the due in the system.',
            };
          //lpi_waiver validation
          if (lpi_waiver * 1 > 0 && lpi_waiver * 1 > currentLPIDue * 1)
            throw {
              success: false,
              message:
                'lpi_waiver cannot be greater than the due in the system.',
            };
          //bounce_charges_waiver validation
          if (bc_waiver * 1 > 0 && bc_waiver * 1 > bounceCharges * 1)
            throw {
              success: false,
              message:
                'bounce_charges_waiver cannot be greater than the due in the system.',
            };

          if (gst_reversal_bc > gstOnBounceCharges)
            throw {
              success: false,
              message:
                'gst_reversal_bc cannot be greater than the bounce charges GST in the system.',
            };
        }
        //Prepare data to update
        const updateObj = {
          status,
          approver_remarks,
          interest_at_approval: currentIntDue * 1,
          bc_at_approval: bounceCharges * 1,
          gst_on_bc_at_waiver: gstOnBounceCharges * 1,
          lpi_at_approval: currentLPIDue * 1,
          approver_id: req?.user?.email,
          action_date: moment(),
        };
        let updateWaiverStatus;
        //Check the validity of waiver request.
        let fromDate = moment(waiverRequestExist.waiver_req_date);
        let toDate = moment();
        let diffInDays = toDate.diff(fromDate, 'days');
        if (diffInDays > 0) {
          updateObj.approver_remarks = 'Expired as request was expired';
          updateObj.status = 'expired';

          updateWaiverStatus = await WaiverRequestSchema.updateDataById(
            {
              _id: req.params.id,
            },
            updateObj,
          );
          throw {
            success: false,
            message: 'Request is expired and marked as expired in system.',
          };
        }
        //Update the status of waiver request.
        updateWaiverStatus = await WaiverRequestSchema.updateDataById(
          {
            _id: req.params.id,
          },
          updateObj,
        );
        if (!updateWaiverStatus)
          throw {
            success: false,
            message: 'Error while updating waiver request status.',
          };
        req.waiverData = {
          waiverRequest: updateWaiverStatus,
        };

        if (updateWaiverStatus.status.toLowerCase() === 'approved') {
          let ledgerEntriesToRecordInTxnLedger = [];
          const ledgerObjBC = {
            loan_id: loan_id,
            product_id: req.product._id,
            company_id: req.company._id,
            company_name: req.company.name,
            product_name: req.product.name,
            label: 'waiver',
            txn_reference: waiverRequestExist.sr_req_id,
            waiver_type: '1',
            txn_reference_datetime: updateWaiverStatus.action_date,
            gst_reversal: gst_reversal_bc,
            txn_amount: bc_waiver,
          };

          if (bc_waiver > 0) ledgerEntriesToRecordInTxnLedger.push(ledgerObjBC);

          const ledgerObj_LPI = {
            loan_id: loan_id,
            product_id: req.product._id,
            company_id: req.company._id,
            company_name: req.company.name,
            product_name: req.product.name,
            label: 'waiver',
            txn_reference: waiverRequestExist.sr_req_id,
            waiver_type: '97',
            txn_reference_datetime: updateWaiverStatus.action_date,
            gst_reversal: 0,
            txn_amount: lpi_waiver,
          };
          if (lpi_waiver > 0)
            ledgerEntriesToRecordInTxnLedger.push(ledgerObj_LPI);
          const ledgerObj_INT_DUE = {
            loan_id: loan_id,
            product_id: req.product._id,
            company_id: req.company._id,
            company_name: req.company.name,
            product_name: req.product.name,
            label: 'waiver',
            txn_reference: waiverRequestExist.sr_req_id,
            waiver_type: '98',
            txn_reference_datetime: updateWaiverStatus.action_date,
            gst_reversal: 0,
            txn_amount: interest_waiver,
          };
          if (interest_waiver > 0)
            ledgerEntriesToRecordInTxnLedger.push(ledgerObj_INT_DUE);

          if (ledgerEntriesToRecordInTxnLedger.length) {
            await waiverHelper.waiverTransaction(
              ledgerEntriesToRecordInTxnLedger,
            );
          }
        }
        //Return success response.
        if (updateWaiverStatus) {
          reqUtils.json(req, res, next, 200, {
            success: true,
            message: `Waiver request ${status} succefully.`,
            data: updateWaiverStatus,
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    waiverEvent.fireWaiverEvent,
  );

  async function handleCharges(req, chargeType, leadData) {
    switch (chargeType) {
      case 'Bounce Charge':
        return processBounceCharge(req, chargeType, leadData);
      case 'Foreclosure Charges':
        return processForeclosureCharge(req, chargeType, leadData);
      default:
        return null;
    }
  }

  async function processBounceCharge(req, chargeType, leadData) {
    try {
      //Calculate gst on charge
      const gstObject = calculateGSTOnCharges(
        req.body.charge_amount ?? req.product.bounce_charges,
        req.leadData.state,
        req.product,
      );
      // Prepare charges data to record
      const chargesPayload = {
        loan_id: req.body.loan_id,
        charge_name: req.body.charge_name,
        charge_application_date: req.body.charge_application_date,
        charge_amount: req.body.charge_amount
          ?? req.product.bounce_charges 
          ?? 0,
        gst: gstObject.gst,
        cgst: gstObject.cgst,
        sgst: gstObject.sgst,
        igst: gstObject.igst,
        charge_type: req.body.charge_name,
        charge_id: req?.chargeTypeExist?.charge_id,
        company_id: req.leadData.company_id,
        product_id: req.leadData.product_id,
      };
      return chargesPayload;
    } catch (error) {
      return error;
    }
  }

  async function processForeclosureCharge(req, chargeType, leadData) {
    try {
      // Prepare Foreclosure charges data to record
      const foreclosureChargesPayload = {
        foreclosure_recon_id: req.body.foreclosure_recon_id,
        loan_id: req.body.loan_id,
        charge_type: req.body.charge_type,
        charge_id: req.body.charge_id,
        charge_application_date: req.body.charge_application_date,
        charge_amount: req.body.charge_amount,
        gst: req.body.gst,
        cgst: req.body.cgst,
        sgst: req.body.sgst,
        igst: req.body.igst,
        total_amount_paid: req.body.total_amount_paid,
        total_gst_paid: req.body.total_gst_paid,
        total_amount_waived: req.body.total_amount_waived,
        total_gst_reversed: req.body.total_gst_reversed,
        utr_paid: req.body.utr_paid,
        utr_waived: req.body.utr_waived,
        payment:
          req.body.total_amount_paid && req.body.total_amount_paid > 0
            ? [
                {
                  utr: req.body.utr_paid,
                  amount_paid: req.body.total_amount_paid,
                  gst_paid: req.body.total_gst_paid,
                  utr_date: req.body.charge_application_date,
                },
              ]
            : [],
        waiver:
          req.body.total_amount_waived && req.body.total_amount_waived > 0
            ? [
                {
                  utr: req.body.utr_waived,
                  amount_waived: req.body.total_amount_waived,
                  gst_reversed: req.body.total_gst_reversed,
                  waiver_date: req.body.charge_application_date,
                  is_waiver: 'Y',
                },
              ]
            : [],
        is_processed: req.body.is_processed,
        paid_date: req.body.charge_application_date,
        company_id: req.company._id,
        product_id: req.product._id,
      };
      return foreclosureChargesPayload;
    } catch (error) {
      return error;
    }
  }
};

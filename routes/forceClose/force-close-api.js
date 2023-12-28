const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const borrowerHelper = require('../../util/borrower-helper.js');
const forceCloseHelper = require('../../util/force-close-helper.js');
const moment = require('moment');
const middlewares = require('../../utils/middlewares.js');
const jwt = require('../../util/jwt');
const ForeClosureReconSchema = require('../../models/foreclosure-recon-schema.js');
const BICSchema = require('../../models/borrowerinfo-common-schema.js');
const ForceCloseRequest = require('../../models/foreclosure-offers-schema.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  // API to fetch foreclosure request details
  app.get('/api/force-close-request/:loan_id', [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    forceCloseHelper.forceCloseCalculations,
    async (req, res) => {
      try {
        let data = req?.forceCloseData || {};
        let loan_details = {
          loan_id: req.loanData.loan_id,
          partner_name: req.company.name,
          product_name: req.product.name,
          customer_name: `${req.loanData.first_name || ''} ${req.loanData.last_name || ''}`,
        };
        if (Object.keys(data).length === 0) {
          throw {
            success: false,
            message: 'Something went wrong',
          };
        }
        let final_obj = {
          loan_details: { ...loan_details },
          charges_details: data,
        };
        const closure_details = await ForceCloseRequest.findByLoanIdAndType(req.loanData.loan_id, 'force_loan');
        if (closure_details && req.loanData.is_force_closed) final_obj.closure_details = closure_details;
        return res.status(200).send({
          success: true,
          data: final_obj,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    });

    app.post(
      '/api/force-close-request/:loan_id',
      [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, borrowerHelper.isLoanExistByLID],
      [
        check('principal_outstanding').notEmpty().withMessage('principal_outstanding is required').isFloat().withMessage('principal_outstanding must be a float'),
        check('principal_outstanding_received').notEmpty().withMessage('principal_outstanding_received is required').isFloat().withMessage('principal_outstanding_received must be a float'),
        check('interest_due').notEmpty().withMessage('interest_due is required').isFloat().withMessage('interest_due must be a float'),
        check('interest_due_received').notEmpty().withMessage('interest_due_received is required').isFloat().withMessage('interest_due_received must be a float'),
        check('lpi_due').notEmpty().withMessage('lpi_due is required').isFloat().withMessage('lpi_due must be a float'),
        check('lpi_due_received').notEmpty().withMessage('lpi_due_received is required').isFloat().withMessage('lpi_due_received must be a float'),
        check('bounce_charges').notEmpty().withMessage('bounce_charges is required').isFloat().withMessage('bounce_charges must be a float'),
        check('bounce_charges_received').notEmpty().withMessage('bounce_charges_received is required').isFloat().withMessage('bounce_charges_received must be a float'),
        check('gst_bounce_charges').notEmpty().withMessage('gst_bounce_charges is required').isFloat().withMessage('gst_bounce_charges must be a float'),
        check('gst_bounce_charges_received').notEmpty().withMessage('gst_bounce_charges_received is required').isFloat().withMessage('gst_bounce_charges_received must be a float'),
        check('total_amount').notEmpty().withMessage('total_amount is required').isFloat().withMessage('total_amount must be a float'),
        check('total_amount_received').notEmpty().withMessage('total_amount_received is required').isFloat().withMessage('total_amount_received must be a float'),
        check('comments').notEmpty().withMessage('comments is required').isString().withMessage('comments must be a string'),
        check('principal_outstanding_waiver').notEmpty().withMessage('principal_outstanding_waiver is required').isFloat().withMessage('principal_outstanding_waiver must be a float'),
        check('interest_due_waiver').notEmpty().withMessage('interest_due_waiver is required').isFloat().withMessage('interest_due_waiver must be a float'),
        check('lpi_due_waiver').notEmpty().withMessage('lpi_due_waiver is required').isFloat().withMessage('lpi_due_waiver must be a float'),
        check('bounce_charges_waiver').notEmpty().withMessage('bounce_charges_waiver is required').isFloat().withMessage('bounce_charges_waiver must be a float'),
        check('gst_bounce_charges_waiver').notEmpty().withMessage('gst_bounce_charges_waiver is required').isFloat().withMessage('gst_bounce_charges_waiver must be a float'),
        check('total_amount_waiver').notEmpty().withMessage('total_amount_waiver is required').isFloat().withMessage('total_amount_waiver must be a float'),
        check('int_on_termination').notEmpty().withMessage('int_on_termination is required').isFloat().withMessage('int_on_termination must be a float'),
      ],
      forceCloseHelper.forceCloseExist,
      async (req, res) => {
        try {
          let inputs = req.body;
          const errors = validationResult(req);
          if (!errors.isEmpty())
            throw {
              success: false,
              message: errors.errors[0]['msg'],
            };
          let forceCloseOffer = {};
          let { principal_outstanding, principal_outstanding_waiver, principal_outstanding_received, interest_due, interest_due_waiver, interest_due_received, lpi_due, lpi_due_waiver, lpi_due_received, bounce_charges, bounce_charges_waiver, bounce_charges_received, gst_bounce_charges, gst_bounce_charges_waiver, gst_bounce_charges_received, total_amount, total_amount_waiver, total_amount_received, int_on_termination, comments } = inputs;
          forceCloseOffer.seq_id = 0;
          //forceCloseOffer.prin_os_received = principal_outstanding_received
          forceCloseOffer.interest_waiver = interest_due_waiver;
          forceCloseOffer.int_due = interest_due;
          //forceCloseOffer.int_due_received = interest_due_received
          forceCloseOffer.lpi_waiver = lpi_due_waiver;
          forceCloseOffer.lpi_due = lpi_due;
          //forceCloseOffer.lpi_due_received = lpi_due_received;
          forceCloseOffer.bounce_charges = bounce_charges;
          forceCloseOffer.bounce_charges_waiver = bounce_charges_waiver;
          //forceCloseOffer.bounce_charges_received = bounce_charges_received
          forceCloseOffer.gst_on_bc = gst_bounce_charges;
          forceCloseOffer.gst_reversal_bc = gst_bounce_charges_waiver;
          //forceCloseOffer.gst_on_bc_received = gst_on_bc_received
          forceCloseOffer.status = 'approved';
          forceCloseOffer.approver_comment = comments;
          forceCloseOffer.foreclosure_date = moment(new Date()).format('YYYY-MM-DD');
          forceCloseOffer.total_foreclosure_amt = total_amount - total_amount_received;
          forceCloseOffer.excess_received = total_amount_received;
          forceCloseOffer.int_on_termination=int_on_termination;
          if (total_amount_waiver <= 0) {
            total_amount_waiver = 0;
          }
          forceCloseOffer.total_foreclosure_amt_requested = parseFloat(total_amount - total_amount_received - total_amount_waiver).toFixed(2);
          let final_force_close_offer = {
            company_id: req.company._id,
            product_id: req.product._id,
            loan_id: req.loanData.loan_id,
            requestor_id: req.user._id,
            requestor: req.user.email,
            requestor_comment: comments,
            approver_id: req.user._id,
            approver_comment: comments,
            prin_os: principal_outstanding,
            prin_os_waiver: principal_outstanding_waiver,
            action_date: moment().format('YYYY-MM-DD'),
            request_date: moment().endOf('day').format('YYYY-MM-DD'),
            excess_received : total_amount_received,
            type: 'force_loan',
            status: 'approved',
            offers: [forceCloseOffer],
          };
          //insert into forclosure offer
          const addForeceCloseOffer = await ForceCloseRequest.addNew(final_force_close_offer);
          if (!addForeceCloseOffer) {
            throw {
              success: false,
              message: 'Insertion failed',
            };
          }
          //add to recon collection
          let tempOffer = forceCloseOffer;
          let createdObject = {
            req_id: addForeceCloseOffer?._id,
            seq_id: 0,
            loan_id: addForeceCloseOffer?.loan_id,
            product_id: addForeceCloseOffer?.product_id,
            company_id: addForeceCloseOffer?.company_id,
            foreclosure_amount: addForeceCloseOffer.total_foreclosure_amt_requested,
            excess_received: final_force_close_offer.excess_received,
            foreclosure_date: addForeceCloseOffer.action_date,
            status: 'approved',
            type: 'force_loan',
          };
          tempOffer.foreclosure_charges = 0;
          let waiverArray = [];
          let waiverObject = {};
          let chargesObject = {
            charge_amount: 0,
            application_date: moment(new Date()).format('YYYY-MM-DD'),
            charge_type: 'Foreclosure Charges',
            charge_id: 7,
            gst: 0,
            cgst: 0,
            igst: 0,
            sgst: 0,
          };
   
          //add for prin_os waiver
          waiverObject = {
            txn_reference: addForeceCloseOffer._id,
            label: 'waiver',
            waiver_type: 99,
            txn_amount: parseFloat(principal_outstanding_waiver),
          };
          if (waiverObject.txn_amount != 0) {
            waiverArray.push(waiverObject);
          }
   
          //add for lpi waiver
          waiverObject = {
            txn_reference: addForeceCloseOffer._id,
            label: 'waiver',
            waiver_type: 97,
            txn_amount: parseFloat(tempOffer.lpi_waiver),
          };
          if (waiverObject.txn_amount != 0) {
            waiverArray.push(waiverObject);
          }
   
          //add for interest waiver
          waiverObject = {
            txn_reference: addForeceCloseOffer._id,
            label: 'waiver',
            waiver_type: 98,
            txn_amount: parseFloat(tempOffer.interest_waiver),
          };
          if (waiverObject.txn_amount != 0) {
            waiverArray.push(waiverObject);
          }
   
          //add for bounce charge interest waiver
          waiverObject = {
            txn_reference: addForeceCloseOffer._id,
            label: 'waiver',
            waiver_type: 1,
            txn_amount: parseFloat(tempOffer.bounce_charges_waiver),
            gst_reversal: parseFloat(tempOffer.gst_reversal_bc),
          };
          if (waiverObject.txn_amount != 0) {
            waiverArray.push(waiverObject);
          }
   
          //add for fc waiver
          waiverObject = {
            txn_reference: addForeceCloseOffer._id,
            label: 'waiver',
            waiver_type: 7,
            txn_amount: parseFloat(tempOffer?.fc_waiver || 0),
            gst_reversal: parseFloat(tempOffer?.gst_reversal_fc || 0),
          };
          if (waiverObject.txn_amount != 0) {
            waiverArray.push(waiverObject);
          }
          //creating final object for push
          let final_object = {
            ...createdObject,
            int_on_termination,
            charge_array: [{ ...chargesObject }],
            waiver_array: waiverArray,
          };
   
          //insert final object to recon collection
          let reconData = await ForeClosureReconSchema.addNew(final_object);
          if (!reconData) {
            throw {
              success: false,
              message: 'Insertion failed',
            };
          }
          let bicData = await BICSchema.updateBI({ is_force_closed: true }, req.loanData.loan_id);
          if (!bicData) {
            throw {
              success: false,
              message: 'Insertion failed',
            };
          }
   
          // //create webhook resp
          // let webhook_resp = {};
          // webhook_resp['loan_id'] = foreclosure.loan_id;
          // webhook_resp['request_id'] = foreclosure._id;
          // webhook_resp['Foreclosure Status'] = 'Approved';
          // webhook_resp['Remarks'] = 'System Approved';
          // approver_comment = 'System Approved';
          // req.webhookData = webhook_resp;
          // req.foreclosureId = foreclosure._id;
          // //partner resp webhook call
   
          //Update Foreclosure Schemax
          // let finalUpdateResp = await ForeClosureSchema.addNew(
          //   { ...forceCloseData }
          // );
          res.status(200).send({
            success: true,
            message: 'ForceClose has been submitted successfully',
          });
        } catch (error) {
          console.log('error::', error);
          return res.status(400).json(error);
        }
      },
    );
};

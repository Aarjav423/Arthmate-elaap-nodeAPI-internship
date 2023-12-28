const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const borrowerHelper = require('../../../util/borrower-helper.js');
const foreclosureHelper = require('../../../util/foreclosure-helper-v2.js');
const moment = require('moment');
const jwt = require('../../../util/jwt');
const foreclosureNotiyHelper = require('./foreclosure-broadcast-event');
const ForeClosureSchema = require('../../../models/foreclosure-offers-schema.js');
const ForeClosureReconSchema = require('../../../models/foreclosure-recon-schema.js');
const LoanRequestSchema = require('../../../models/loan-request-schema.js');
const ChargesSchema = require('../../../models/charges-schema.js');
const LoanDocumentSchema = require('../../../models/loandocument-common-schema.js');
const BorrowerInfoCommon = require('../../../models/borrowerinfo-common-schema.js');
const axios = require('axios');
const LoanTransactionLedgerSchema = require('../../../models/loan-transaction-ledger-schema.js');
const LoanStateSchema = require('../../../models/loan-state-schema.js');
const DocumentMappingSchema = require('../../../models/document-mappings-schema.js');
const { documentMapping } = require('../../../util/loanedits.js');
const percentDropDownArray = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
];
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  // API to fetch foreclosure request details
  app.get(
    '/api/v2/foreclosure-request/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    foreclosureHelper.validateForeclosureRequest,
    foreclosureHelper.fetchLoanStateData,
    foreclosureHelper.foreClosureCharge,
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        let foreclosureOffersObject = {};
        const cancelation_period = req.product.cancellation_period
          ? req.product.cancellation_period
          : 0;
        const lock_in_period = req.product.lock_in_period
          ? req.product.lock_in_period
          : 0;
        let disbursement_date_time = moment(
          req.loanData.disbursement_date_time,
          'YYYY-MM-DD HH:mm:ss',
        ).format('YYYY-MM-DD');
        const current_date = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');

        if (req.loanData.status.toLowerCase() != 'disbursed') {
          throw {
            sucess: false,
            message: `Foreclosure offer for this Loan's ${loan_id} cannot be created as the loan status is  ${req.loanData.status}`,
          };
        }

        // validate for cancelation period
        if (
          current_date <
          moment(disbursement_date_time)
            .add(cancelation_period, 'd')
            .format('YYYY-MM-DD')
        ) {
          throw {
            sucess: false,
            message:
              'Foreclosure is not allowed as loan is still in cool down period',
          };
        }

        //validate for lock in period
        if (
          current_date <
          moment(disbursement_date_time)
            .add(lock_in_period, 'd')
            .format('YYYY-MM-DD')
        ) {
          throw {
            sucess: false,
            message:
              'Foreclosure is not allowed as loan is still in lock in period.',
          };
        }

        //check if foreclosure is already present with offer
        const foreClosureOffer =
          await ForeClosureSchema.findByLoanAppId(loan_id);

        if (foreClosureOffer) {
          if (foreClosureOffer.status.toLowerCase() == 'offered') {
            const query = { loan_id: loan_id };
            await ForeClosureSchema.findOneAndUpdateStatus(query);
          } else if (
            foreClosureOffer.status.toLowerCase() == 'invalid' ||
            foreClosureOffer.status.toLowerCase() == 'rejected'
          ) {
            const query = { loan_id: loan_id };
            //update offer as invalid if already present with rejected or invalid
            await ForeClosureSchema.findOneAndUpdateStatus(query);
          } else if (
            foreClosureOffer.status.toLowerCase() == 'pending' &&
            foreClosureOffer.request_date < current_date
          ) {
            //update offer as invalid
            await ForeClosureSchema.findOneAndUpdateStatus({
              loan_id: loan_id,
            });
          } else if (
            foreClosureOffer.status.toLowerCase() == 'pending' &&
            foreClosureOffer.request_date == current_date
          ) {
            throw {
              sucess: false,
              message: `Foreclosure for the loan ${loan_id} is already in progress.`,
            };
          } else if (foreClosureOffer.status.toLowerCase() == 'approved') {
            foreClosureOffer.offers.forEach((offer) => {
              if (
                moment(offer.foreclosure_date).format('YYYY-MM-DD') >=
                current_date
              ) {
                throw {
                  success: false,
                  message: `Foreclosure for the loan ${loan_id} is already in progress.`,
                };
              }
            });
          } else if (
            foreClosureOffer.status.toLowerCase() == 'completed' &&
            req.loanData.status == 'foreclosed'
          ) {
            throw {
              sucess: false,
              message:
                'The Loan for loan_id is already foreclosed in our system.',
            };
          }
        }

        const aggregatedData = {
          loanData: req.loanData,
          previousInstallmentDate: req.previousInstallmentDates,
          product: req.product,
          loanStateData: req.loanStateData,
          request_date: req.requestDate,
          validity_date: req.validityDate,
          foreClosure_charge: req.foreClosureCharge,
        };

        //get customer name
        const customer_name =
          (req.loanData.first_name ? req.loanData.first_name : '') +
          ' ' +
          (req.loanData.last_name ? req.loanData.last_name : '');

        let requestor_id = '';

        if (req.authData.type == 'api') {
          requestor_id = req?.company?.name;
        } else {
          requestor_id = req?.user?.email;
        }

        //to calculate the excess amount from transaction ledger and loan state's excess excess_payment_ledger
        const query = {
          loan_id: loan_id,
          label: 'repayment',
          is_received: 'Y',
          $or: [{ processed: 'null' }, { processed: null }],
        };
        let loanTransactionAmount = 0;
        const transactionLedger =
          await LoanTransactionLedgerSchema.findAllWithCondition(query);
        if (transactionLedger.length > 0) {
          transactionLedger.forEach((transaction) => {
            loanTransactionAmount += parseFloat(transaction.txn_amount);
          });
        }

        let excessPaymentLedger = 0;
        const paymentLedger = await LoanStateSchema.findByCondition({
          loan_id: loan_id,
        });
        if (paymentLedger && paymentLedger != null) {
          excessPaymentLedger =
            paymentLedger?.excess_payment_ledger &&
            paymentLedger?.excess_payment_ledger?.txn_amount
              ? paymentLedger.excess_payment_ledger.txn_amount
              : 0;
        }

        //total excess amount from transaction ledger and loan states
        const totalExcessAmount =
          loanTransactionAmount + parseFloat(excessPaymentLedger);

        //method for foreclosure calculation
        const offers = await foreclosureHelper.foreclosureCalculations(
          aggregatedData,
          totalExcessAmount,
        );

        if (offers.success == false) {
          throw offers;
        }
        const current_prin_due = req.loanStateData.current_prin_due
          ? req.loanStateData.current_prin_due
          : 0;

        //prepare data for foreclosure schema
        (foreclosureOffersObject.undue_prin_os =
          parseFloat(req.loanStateData.prin_os) - current_prin_due),
          (foreclosureOffersObject.loan_id = loan_id);
        foreclosureOffersObject.product_id = req.product._id;
        foreclosureOffersObject.company_id = req.company._id;
        foreclosureOffersObject.request_date = req.requestDate;
        foreclosureOffersObject.validity_date = req.validityDate;
        foreclosureOffersObject.status = 'offered';
        foreclosureOffersObject.loan_id = loan_id;
        foreclosureOffersObject.company_name = req.company.name;
        foreclosureOffersObject.customer_name = customer_name;
        foreclosureOffersObject.product_name = req.product.name;
        foreclosureOffersObject.offers = offers;
        foreclosureOffersObject.prin_os = parseFloat(req.loanStateData.prin_os);
        foreclosureOffersObject.requestor_id = requestor_id;
        foreclosureOffersObject.excess_received = totalExcessAmount;

        //insert the created forclosure document
        const foreClosureCreated = await ForeClosureSchema.addNew(
          foreclosureOffersObject,
        );
        //append request id
        foreclosureOffersObject.request_id = foreClosureCreated._id;

        return res.status(200).send({
          success: true,
          data: foreclosureOffersObject,
          percentDropDownArray: percentDropDownArray,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  //api to fetch filtered foreclosure requestes
  app.get(
    '/api/foreclosure-offer-requests/:company_id/:product_id/:status/:page/:limit',
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

        const forecloserResp =
          await ForeClosureSchema.getFilteredForeclosureRequest({
            company_id,
            product_id,
            status,
            page,
            limit,
          });
        if (!forecloserResp.rows.length)
          throw {
            sucess: false,
            message: 'No Foreclosure request exist for provided filter',
          };

        if (product_id) {
          forecloserResp.rows.forEach((element) => {
            element.product = req.product;
            element.company = req.company;
          });
        }

        return res.status(200).send({
          success: true,
          data: {
            rows: forecloserResp.rows,
            count: forecloserResp.count,
          },
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/v2/foreclosure-request/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      borrowerHelper.isLoanExistByLID,
      foreclosureHelper.fetchLoanStateData,
      foreclosureHelper.isLoanExistInForeclosure,
      [
        check('loan_id').notEmpty().withMessage('Loan_id is required'),
        check('requestor_comment')
          .notEmpty()
          .withMessage('Requestor Comment is required'),
        check('id').notEmpty().withMessage('Request Id is required'),
        check('interest_waiver_perc')
          .optional()
          .default(0)
          .isIn(percentDropDownArray)
          .withMessage('interest_waiver_perc should be a multiple of 5'),
        check('lpi_waiver_perc')
          .optional()
          .default(0)
          .isIn(percentDropDownArray)
          .withMessage('lpi_waiver_perc should be a multiple of 5'),
        check('bounce_charge_waiver_perc')
          .optional()
          .default(0)
          .isIn(percentDropDownArray)
          .withMessage('bounce_charge_waiver_perc should be a multiple of 5'),
        check('fc_waiver_perc')
          .optional()
          .default(0)
          .isIn(percentDropDownArray)
          .withMessage('fc_waiver_perc should be a multiple of 5'),
      ],
    ],
    async (req, res) => {
      try {
        let inputs = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };

        /**
         *
         * @param {*} offer
         * @param {*} type
         */

        let {
          interest_waiver_perc,
          lpi_waiver_perc,
          bounce_charge_waiver_perc,
          fc_waiver_perc,
          requestor_comment,
        } = inputs;
        const offerStatusValidation = (offer, type, index) => {
          let additionalInfo = 'Offer';
          if (type == 'sub') {
            additionalInfo = `${additionalInfo} at day ${index}`;
          }
          if (offer.status == 'pending' || offer.status == 'approved') {
            throw {
              success: false,
              message: `${req.body.id} for ${req.params.loan_id} is in progress, Kindly wait for approval.`,
            };
          }

          if (offer.status == 'rejected') {
            throw {
              success: false,
              message: `${req.body.id} for ${req.params.loan_id} is rejected, Kindly request for another offer.`,
            };
          }

          if (offer.status == 'completed') {
            throw {
              success: false,
              message: `${req.body.id} for ${req.params.loan_id} has been completed and the loan ${req.params.loan_id} is foreclosed.Thank You!`,
            };
          }

          if (offer.status == 'invalid') {
            throw {
              success: false,
              message: `${req.body.id} for ${req.params.loan_id} has expired.Kindly request for another offer.`,
            };
          }
          if (offer.status != 'offered') {
            throw {
              success: false,
              message: `Something is wrong with ${req.body.id} for ${req.params.loan_id} state.Please contact support.`,
            };
          }
        };
        //fetch foreclosure data
        const foreclosure = req.foreclosure;
        //validation
        if (
          foreclosure.status == 'pending' &&
          moment(foreclosure.request_date).format('YYYY-MM-DD') !=
            moment().format('YYYY-MM-DD')
        ) {
          throw {
            success: false,
            message: `${req.body.id} for ${req.params.loan_id} has expired, Kindly request for another offer.`,
          };
        }
        //Validate offer status in main foreclosure schema
        offerStatusValidation(foreclosure, 'main');
        var foreclosureOffers = foreclosure['offers'] || [];

        //check for offer status in offer array of foreclosure schema and update the waiver keys
        for (let i = 0; i < foreclosureOffers.length; i++) {
          offerStatusValidation(foreclosureOffers[i], 'sub', i);
          let {
            int_due,
            lpi_due,
            bounce_charges,
            total_foreclosure_amt,
            foreclosure_charges,
          } = foreclosureOffers[i];
          foreclosureOffers[i].interest_waiver = parseFloat(
            (int_due * interest_waiver_perc) / 100,
          ).toFixed(2);
          foreclosureOffers[i].lpi_waiver = parseFloat(
            (lpi_due * lpi_waiver_perc) / 100,
          ).toFixed(2);
          foreclosureOffers[i].bounce_charges_waiver = parseFloat(
            (bounce_charges * bounce_charge_waiver_perc) / 100,
          ).toFixed(2);
          foreclosureOffers[i].fc_waiver = parseFloat(
            (foreclosure_charges * fc_waiver_perc) / 100,
          ).toFixed(2);
          foreclosureOffers[i].gst_reversal_bc = parseFloat(
            (foreclosureOffers[i].bounce_charges_waiver * 18) / 100,
          ).toFixed(2);
          foreclosureOffers[i].gst_reversal_fc = parseFloat(
            0.18 * foreclosureOffers[i].fc_waiver,
          ).toFixed(2);
          foreclosureOffers[i].total_foreclosure_amt_requested = parseFloat(
            total_foreclosure_amt -
              foreclosureOffers[i].interest_waiver -
              foreclosureOffers[i].lpi_waiver -
              foreclosureOffers[i].bounce_charges_waiver -
              foreclosureOffers[i].fc_waiver -
              foreclosureOffers[i].gst_reversal_bc -
              foreclosureOffers[i].gst_reversal_fc,
          ).toFixed(2);
          foreclosureOffers[i].status =
            foreclosureOffers[i].total_foreclosure_amt_requested ==
            total_foreclosure_amt.toFixed(2)
              ? 'approved'
              : 'pending';

          foreclosure.status = foreclosureOffers[i].status;
        }
        let approver_comment;
        //if status is approved insert into foreclosure_recon
        if (foreclosure.status == 'approved') {
          approver_comment = 'System Approved';
          //Generate pdf template data and Letter here
          let base64pdfencodedfile =
            await foreclosureHelper.createForeClosurePdfFromTemplate(
              req.body.loan_id ? req.body.loan_id : req.params.loan_id,
              req.body.id,
              req.product,
              {
                borrowerData: req.loanData,
                foreclosureOffer: req.foreclosure,
                loanStateData: req.loanStateData,
              },
            );

          let { loan_app_id } = req.loanData;
          base64pdfencodedfile
            ? axios.post(
                `${process.env.APP_URL}/api/loandocument`,
                {
                  loan_app_id: loan_app_id,
                  code: 998,
                  base64pdfencodedfile,
                  fileType: 'foreclosure_letter',
                },
                {
                  headers: {
                    authorization: req.headers['authorization'],
                    'Content-Type': 'application/json',
                  },
                },
              )
            : null;
          //update action date
          const current_date = moment().format();
          await ForeClosureSchema.findByIdAndUpdateActionDate(
            foreclosure._id,
            current_date,
          );

          //get loan request data
          let loanReqData = await LoanRequestSchema.findBySingleLoanIds(
            req.params.loan_id,
          );
          //add to recon collection
          for (let m = 0; m < foreclosureOffers.length; m++) {
            let tempOffer = foreclosureOffers[m];
            let createdObject = {
              req_id: foreclosure._id,
              loan_id: foreclosure.loan_id,
              product_id: foreclosure.product_id,
              company_id: foreclosure.company_id,
              seq_id: tempOffer.seq_id,
              foreclosure_amount: tempOffer.total_foreclosure_amt_requested,
              foreclosure_date: tempOffer.foreclosure_date,
              status: 'approved',
              excess_received: foreclosure.excess_received,
              int_on_termination: tempOffer.int_on_termination,
            };

            let chargesObject = {
              charge_amount: tempOffer.foreclosure_charges,
              application_date: tempOffer.foreclosure_date,
              charge_type: 'Foreclosure Charges',
              charge_id: 7,
              gst: tempOffer.gst_on_fc,
              cgst: 0,
              igst: 0,
              sgst: 0,
            };

            if (
              loanReqData?.state &&
              loanReqData?.state.toLowerCase() === 'haryana'
            ) {
              //add cgst
              chargesObject.sgst = parseFloat(
                tempOffer.foreclosure_charges * 0.09,
              ).toFixed(2);
              chargesObject.cgst = parseFloat(
                tempOffer.foreclosure_charges * 0.09,
              ).toFixed(2);

              //add sgst
            } else if (
              loanReqData?.state &&
              loanReqData?.state.toLowerCase() !== 'haryana'
            ) {
              //add igst
              chargesObject.igst = tempOffer.gst_on_fc;
            }

            let waiverArray = [];
            let waiverObject = {};

            //add for lpi waiver
            waiverObject = {
              txn_reference: foreclosure._id,
              label: 'waiver',
              waiver_type: 97,
              txn_amount: parseFloat(tempOffer.lpi_waiver),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }

            //add for interest waiver
            waiverObject = {
              txn_reference: foreclosure._id,
              label: 'waiver',
              waiver_type: 98,
              txn_amount: parseFloat(tempOffer.interest_waiver),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }

            //add for interest waiver
            waiverObject = {
              txn_reference: foreclosure._id,
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
              txn_reference: foreclosure._id,
              label: 'waiver',
              waiver_type: 7,
              txn_amount: parseFloat(tempOffer.fc_waiver),
              gst_reversal: parseFloat(tempOffer.gst_reversal_fc),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }
            //creating final object for push
            let final_object = {
              ...createdObject,
              charge_array: [{ ...chargesObject }],
              waiver_array: waiverArray,
            };
            //insert final object to recon collection
            await ForeClosureReconSchema.addNew(final_object);
          }

          //create webhook resp
          let webhook_resp = {};
          webhook_resp['loan_id'] = foreclosure.loan_id;
          webhook_resp['request_id'] = foreclosure._id;
          webhook_resp['Foreclosure Status'] = 'Approved';
          webhook_resp['Remarks'] = 'System Approved';
          approver_comment = 'System Approved';
          req.webhookData = webhook_resp;
          req.foreclosureId = foreclosure._id;
          //partner resp webhook call
          const webhookCall = await foreclosureNotiyHelper.partnerNotify(req);
        }
        //Update Foreclosure Schemax
        let finalUpdateResp = await ForeClosureSchema.findByIdAndUpdate(
          foreclosure._id,
          {
            offers: foreclosureOffers,
            interest_waiver_perc,
            lpi_waiver_perc,
            bounce_charge_waiver_perc,
            fc_waiver_perc,
            status: foreclosure.status,
            requestor_comment,
            approver_comment,
          },
        );
        res.status(200).send({
          success: true,
          message: 'Foreclosure has been submitted successfully',
        });
      } catch (error) {
        console.log(error);
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/v2/foreclosure-request/conclusion/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    foreclosureHelper.fetchLoanStateData,
    async (req, res) => {
      try {
        let input = req.body;
        //if no input passed
        if (Object.values(input).length == 0) {
          throw {
            message: 'No input',
            success: false,
          };
        }
        //check for valid loan_id in params
        if (!req.params.loan_id) {
          throw {
            message: 'Invalid loan id',
            success: false,
          };
        }

        const required = ['approver_id', 'approver_comment', 'status'];

        for (let key of required) {
          if (!input[key]) {
            throw {
              success: false,
              message: `${key} is required, in String format`,
            };
          }
        }
        let webhook_resp = {};
        let input_data;
        const foreClosureOffer =
          await ForeClosureSchema.findByLoanAppIdAndStatus(
            req.params.loan_id,
            'pending',
          );
        if (!foreClosureOffer)
          throw {
            success: false,
            message: 'Invalid foreclosure request data.',
          };
        let foreclosureUniqueId = foreClosureOffer._id;
        if (parseInt(input.status) === 1) {
          //approve
          input_data = {
            approver_comment: input.approver_comment,
            approver_id: input.approver_id,
            status: 'approved',
          };

          //get loan request data
          let loanReqData = await LoanRequestSchema.findBySingleLoanIds(
            req.params.loan_id,
          );

          //Create foreclosure Letter

          let base64pdfencodedfile =
            await foreclosureHelper.createForeClosurePdfFromTemplate(
              req.body.loan_id ? req.body.loan_id : req.params.loan_id,
              foreclosureUniqueId,
              req.product,
              {
                borrowerData: req.loanData,
                foreclosureOffer: foreClosureOffer,
                loanStateData: req.loanStateData,
              },
            );

          let { loan_app_id } = req.loanData;
          base64pdfencodedfile
            ? axios.post(
                `${process.env.APP_URL}/api/loandocument`,
                {
                  loan_app_id: loan_app_id,
                  code: 998,
                  base64pdfencodedfile,
                  fileType: 'foreclosure_letter',
                },
                {
                  headers: {
                    authorization: req.headers['authorization'],
                    'Content-Type': 'application/json',
                  },
                },
              )
            : null;

          //insert data to recon table
          for (let m = 0; m < foreClosureOffer.offers.length; m++) {
            let tempOffer = foreClosureOffer.offers[m];
            let createdObject = {
              req_id: foreClosureOffer._id,
              loan_id: foreClosureOffer.loan_id,
              product_id: foreClosureOffer.product_id,
              company_id: foreClosureOffer.company_id,
              seq_id: tempOffer.seq_id,
              foreclosure_amount: tempOffer.total_foreclosure_amt_requested,
              foreclosure_date: tempOffer.foreclosure_date,
              status: 'approved',
              excess_received: foreClosureOffer.excess_received,
              int_on_termination: tempOffer.int_on_termination,
            };

            let chargesObject = {
              charge_amount: tempOffer.foreclosure_charges,
              application_date: tempOffer.foreclosure_date,
              charge_type: 'Foreclosure Charges',
              charge_id: 7,
              gst: tempOffer.gst_on_fc,
              cgst: 0,
              igst: 0,
              sgst: 0,
            };

            if (
              loanReqData?.state &&
              loanReqData?.state.toLowerCase() === 'haryana'
            ) {
              //add cgst
              chargesObject.sgst = parseFloat(
                tempOffer.foreclosure_charges * 0.09,
              ).toFixed(2);
              chargesObject.cgst = parseFloat(
                tempOffer.foreclosure_charges * 0.09,
              ).toFixed(2);

              //add sgst
            } else if (
              loanReqData?.state &&
              loanReqData?.state.toLowerCase() !== 'haryana'
            ) {
              //add igst
              chargesObject.igst = tempOffer.gst_on_fc;
            }

            let waiverArray = [];
            let waiverObject = {};

            //add for lpi waiver
            waiverObject = {
              txn_reference: foreClosureOffer._id,
              label: 'waiver',
              waiver_type: 97,
              txn_amount: parseFloat(tempOffer.lpi_waiver),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }

            //add for interest waiver
            waiverObject = {
              txn_reference: foreClosureOffer._id,
              label: 'waiver',
              waiver_type: 98,
              txn_amount: parseFloat(tempOffer.interest_waiver),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }

            //add for interest waiver
            waiverObject = {
              txn_reference: foreClosureOffer._id,
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
              txn_reference: foreClosureOffer._id,
              label: 'waiver',
              waiver_type: 7,
              txn_amount: parseFloat(tempOffer.fc_waiver),
              gst_reversal: parseFloat(tempOffer.gst_reversal_fc),
            };
            if (waiverObject.txn_amount != 0) {
              waiverArray.push(waiverObject);
            }
            //creating final object for push
            let final_object = {
              ...createdObject,
              charge_array: [{ ...chargesObject }],
              waiver_array: waiverArray,
            };
            //insert final object to recon collection
            await ForeClosureReconSchema.addNew(final_object);
          }
          //create webhook resp
          webhook_resp['loan_id'] = req.params.loan_id;
          webhook_resp['request_id'] = foreclosureUniqueId;
          webhook_resp['Foreclosure Status'] = 'Approved';
          webhook_resp['Remarks'] = input.approver_comment;
          for (let k = 0; k < foreClosureOffer.offers.length; k++) {
            let tempOffer = foreClosureOffer.offers[k];
            webhook_resp[`Day ${k}`] = {
              Foreclosure_date: tempOffer.foreclosure_date,
              'Amount Payable': tempOffer.total_foreclosure_amt,
            };
          }
        } else if (parseInt(input.status) === 0) {
          // reject
          input_data = {
            approver_comment: input.approver_comment,
            approver_id: input.approver_id,
            status: 'rejected',
          };
          //create webhook resp
          webhook_resp['loan_id'] = req.params.loan_id;
          webhook_resp['request_id'] = foreclosureUniqueId;
          webhook_resp['Foreclosure Status'] = 'Rejected';
          webhook_resp['Remarks'] = input.approver_comment;
        }
        //update all offer request
        for (let i = 0; i < 4; i++) {
          let seq_id = i;
          await ForeClosureSchema.updateOffersStatus(
            foreClosureOffer._id,
            seq_id,
            input_data.status.toLowerCase(),
          );
        }
        //update foreclosure schema
        await ForeClosureSchema.updateForeclosureAporoveById(
          foreClosureOffer._id,
          input_data,
        );
        //update action date
        const current_date = moment().format();
        await ForeClosureSchema.findByIdAndUpdateActionDate(
          foreClosureOffer._id,
          current_date,
        );

        //integrate webhook via subscribe event
        req.webhookData = webhook_resp;
        req.foreclosureId = foreclosureUniqueId;
        const webhookCall = await foreclosureNotiyHelper.partnerNotify(req);
        res.status(200).send({
          success: true,
          message: `Foreclosure has been successfully ${webhook_resp['Foreclosure Status']}`,
        });
      } catch (err) {
        return res.status(400).json(err);
      }
    },
  );

  //api to get foreclosure by request id
  app.get(
    '/api/v2/foreclosure-offer-request/:loan_id/:request_id/:company_id/:product_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const { loan_id, request_id } = req.params;

        let foreclosureRequestObject = {};
        let foreclosureRequestDetail = await ForeClosureSchema.findByCondition(
          { loan_id: loan_id, _id: request_id },
          true,
        );

        let borrower_details = await BorrowerInfoCommon.findByCondition({
          loan_id: loan_id,
        });

        if (!foreclosureRequestDetail) {
          throw {
            sucess: false,
            message: 'No records found for forclosure request',
          };
        }
        foreclosureRequestObject.foreclosureRequestDetail =
          foreclosureRequestDetail;
        foreclosureRequestObject.company = req.company.name;
        foreclosureRequestObject.product = req.product.name;
        foreclosureRequestObject.borrower_details = borrower_details;

        return res.status(200).send({
          success: true,
          data: foreclosureRequestObject,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  //api to get all foreclosure offfer based on loan_id
  app.get(
    '/api/v2/foreclosure-offers-requests/:loan_id/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    foreclosureHelper.fetchLoanStateData,
    async (req, res, next) => {
      try {
        const { loan_id, page, limit } = req.params;
        const { request_id } = req.query;
        let filter = {};
        let requestIdFlag = false;
        if (loan_id) {
          filter.loan_id = loan_id;
        }
        if (request_id) {
          requestIdFlag = true;
          filter._id = request_id;
        }

        let borrowerData = await BorrowerInfoCommon.findOneWithKLID(loan_id);
        if (!borrowerData) {
          throw {
            sucess: false,
            message: 'No Borrower record exist for this loan_Id',
          };
        }

        let foreclosureRequestObject = {};
        let foreclosureRequestDetail =
          await ForeClosureSchema.findByConditionWithLimit(
            {
              ...filter,
            },
            requestIdFlag,
            page,
            limit,
          );

        let foreclosureLatestApprovedOffer = await ForeClosureSchema.findOne(
          {
            loan_id,
            status: { $in: ['completed', 'approved'] },
          },
          { _id: 1 },
        ).sort({ _id: -1 });

        const documentMappings = await DocumentMappingSchema.getAll();
        let documentMapping = {};
        for await (let ele of documentMappings) {
          documentMapping[ele.doc_code] = ele.doc_type;
        }
        //get foreclosure letter
        const loanDocument = await LoanDocumentSchema.findByKLAPPIDAndDocType(
          borrowerData.loan_app_id,
          documentMapping['998'],
        );

        foreclosureRequestObject.rows = foreclosureRequestDetail.rows;
        foreclosureRequestObject.company = req?.company?.name || '';
        foreclosureRequestObject.product = req?.product?.name || '';
        foreclosureRequestObject.customer = `${borrowerData.first_name} ${borrowerData.last_name}`;
        foreclosureRequestObject.count = foreclosureRequestDetail.count;
        foreclosureRequestObject.loan_app_id = borrowerData.loan_app_id;
        foreclosureRequestObject.foreclosure_letter_url = loanDocument?.file_url
          ? loanDocument?.file_url
          : '';
        foreclosureRequestObject.prin_os = parseFloat(
          req.loanStateData.prin_os,
        );
        foreclosureRequestObject.foreclosureLatestApprovedOffer =
          foreclosureLatestApprovedOffer || {};

        return res.status(200).send({
          success: true,
          data: foreclosureRequestObject,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );
};

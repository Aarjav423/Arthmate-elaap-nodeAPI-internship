const SettlementOfferSchema = require('../../models/settlement-offer-schema');
const borrowerHelper = require('../../util/borrower-helper.js');
const jwt = require('../../util/jwt');
const settlementHelper = require('../../util/settlement-helper');
const { check, validationResult } = require('express-validator');
const {
  SETTLEMENT_OFFER_STATUS,
} = require('../settlement/settlement-constants.js');
const moment = require('moment');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  //Settlement  POST API
  app.post(
    '/api/settlement-request/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      borrowerHelper.isLoanExistByLID,
      settlementHelper.fetchLoanStateData,
      borrowerHelper.checkLoanStatusIsActive,
      [
        check('loan_id').notEmpty().withMessage('Loan_id is required'),
        check('tranches')
          .isArray({ min: 1, max: process.env.SETTLEMENT_OFFER_TRANCHES })
          .withMessage('tranches is required with minimum 1 and maximum 5'),
        check('tranches.*.settlement_date')
          .notEmpty()
          .withMessage('settlement_date is required'),
        check('tranches.*.settlement_amount')
          .notEmpty()
          .isNumeric()
          .withMessage('settlement_amount is required')
          .custom((value, {}) => {
            if (parseFloat(value) <= 0) {
              throw {
                success: false,
                message: 'settlement_amount cannot be negative',
              };
            }
            return true;
          }),
        check('requestor_comment')
          .notEmpty()
          .withMessage('Requestor Comment is required'),
      ],
    ],
    async (req, res) => {
      try {
        let { tranches, requestor_comment } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        if (req.authData.type == 'api') {
          requestor_id = req?.company?.name;
        } else {
          requestor_id = req?.user?.email;
        }
        let createSettlementOfferObject = {
          tranches: tranches,
          loan_id: req.params.loan_id || req.body.loan_id,
          company_id: req.company._id,
          product_id: req.product._id,
          prin_os: parseFloat(req.loanStateData.prin_os),
          requestor_id: requestor_id,
          requestor_comment: requestor_comment,
          first_settlement_date: tranches[0].settlement_date,
          last_settlement_date: tranches[tranches.length - 1].settlement_date,
        };
        let { status } = await SettlementOfferSchema.addNew(
          createSettlementOfferObject,
        );
        if (!status) {
          throw {
            success: false,
            message: 'Settlement offer already exist in active state',
          };
        }
        res.status(200).send({
          success: true,
          message: 'Settlement Offer has been submitted successfully',
        });
      } catch (error) {
        console.log(error);
        return res.status(400).json(error);
      }
    },
  );

  //Settlement GET API
  app.get(
    '/api/settlement-request/:loan_id/:page/:limit',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      settlementHelper.fetchLoanStateData,
      borrowerHelper.checkLoanStatusIsActive,
    ],
    async (req, res) => {
      try {
        const { loan_id, page, limit } = req.params;
        let filter = {};
        let requestIdFlag = false;
        if (loan_id) {
          filter.loan_id = loan_id;
        }
        let settlementRequestObject = {};
        let settlementRequestDetail =
          await SettlementOfferSchema.findByConditionWithLimit(
            {
              ...filter,
            },
            requestIdFlag,
            page,
            limit,
          );

        let loanStateData = req.loanStateData;
        let {
          prin_os,
          current_int_due = 0,
          int_accrual = 0,
          current_lpi_due = 0,
        } = loanStateData;

        let { gst = 0, bounce_charge = 0 } =
          await settlementHelper.settlementSummaryCalculations(loan_id);

        settlementRequestObject.loan_id = req.params.loan_id;
        settlementRequestObject.prin_os = parseFloat(prin_os).toFixed(2);
        settlementRequestObject.int_due = (
          parseFloat(current_int_due) + parseFloat(int_accrual)
        ).toFixed(2);
        settlementRequestObject.lpi_due =
          parseFloat(current_lpi_due).toFixed(2);
        settlementRequestObject.gst = parseFloat(gst).toFixed(2);
        settlementRequestObject.bounce_charge =
          parseFloat(bounce_charge).toFixed(2);
        settlementRequestObject.offers = settlementRequestDetail || [];

        //Find if any offer present is not valid
        let isInvalidOfferPresent = false;
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');
        let findPendingOffer = await SettlementOfferSchema.findIfExistByLoanId(
          loan_id,
          'Pending',
        );
        if (
          findPendingOffer &&
          moment(findPendingOffer.first_settlement_date).format('YYYY-MM-DD') <
            currentDate
        ) {
          isInvalidOfferPresent = true;
        }
        settlementRequestObject.isInvalidOfferPresent = isInvalidOfferPresent;
        return res.status(200).send({
          success: true,
          data: settlementRequestObject,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  //Settlement PATCH API
  app.patch(
    '/api/settlement-request/:loan_id/:request_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      //jwt.verifyProduct,
      borrowerHelper.checkLoanStatusIsActive,
      settlementHelper.isSettlementPending,
      settlementHelper.fetchLoanStateData,
      [
        check('status')
          .notEmpty()
          .withMessage('status is required')
          .toLowerCase()
          .matches(/approved|rejected/)
          .withMessage('Status is not Approved or Rejected'),
        check('approver_comment')
          .notEmpty()
          .withMessage('approver_comment is required'),
      ],
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        const params = req.params;
        let query = {
          _id: params.request_id,
          loan_id: params.loan_id,
          status: SETTLEMENT_OFFER_STATUS.pending,
        };
        let update = {
          status: SETTLEMENT_OFFER_STATUS[data.status],
          approver_comment: data.approver_comment,
          action_date: moment().format(),
        };

        let { first_settlement_date, _id } = req.settlement;
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');
        if (moment(first_settlement_date).format('YYYY-MM-DD') < currentDate) {
          await SettlementOfferSchema.updatedStatus(
            { _id: _id },
            { status: 'Invalid' },
          );
          throw {
            success: false,
            message:
              'Settlement Offer cannot be updated since first_settlement_date is already passed',
          };
        }
        if (data.status === 'approved') {
          update.file_url =
            await settlementHelper.uploadSettlementOfferLetterToS3(req);
        }
        const updatedSettlement = await SettlementOfferSchema.updatedStatus(
          query,
          update,
        );
        if (!updatedSettlement) {
          throw {
            success: false,
            message: 'Status update failed',
          };
        }
        return res.status(200).send({
          success: true,
          message: 'Status has been updated successfully',
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
  );
};

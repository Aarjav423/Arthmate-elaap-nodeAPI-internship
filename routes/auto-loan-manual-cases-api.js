const jwt = require('../util/jwt');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const { check, validationResult } = require('express-validator');
const autoLoanNotify = require('../util/autoLoanNotify.js');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

const leadStatus = {
  Approved: 'approved',
  Rejected: 'rejected',
  Manual: 'manual',
  New: 'new',
};

module.exports = (app, conn) => {
  app.post(
    '/api/lead-manual-review',
    [
      check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
      check('manual_review')
        .notEmpty()
        .withMessage('manual_review is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        const loan_app_id = data.loan_app_id;
        const updateStatus = {
          lead_status: leadStatus.Manual,
        };
        if (data.manual_review === 'Y') {
          const _updatedSelectorData = await LoanRequestSchema.updateLeadStatus(
            loan_app_id,
            updateStatus,
          );
          return res
            .status(200)
            .send({ success: true, message: 'Request accepted successfully' });
        } else {
          throw {
            success: false,
            message: 'failure',
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/lead-status-decission',
    [
      check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
      check('manual_review_decision')
        .notEmpty()
        .withMessage('manual_review_decision is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        }
        const data = req.body;
        const loan_app_id = data.loan_app_id;
        var updateStatus = {};
        if (data.manual_review_decision === 'Approved') {
          updateStatus = {
            lead_status: leadStatus.New,
          };
        }
        if (data.manual_review_decision === 'Rejected') {
          updateStatus = {
            lead_status: leadStatus.Rejected,
          };
        }
        req.loanAppId = loan_app_id;
        req.webhookData = {
          loan_app_id: loan_app_id,
          manual_review_decision: req.body.manual_review_decision,
        };
        //call webhook notify
        let webhookResp = await autoLoanNotify.notifyPartner(req);

        if (webhookResp !== true) {
          throw {
            sucess: false,
            message: 'Something went Wrong',
          };
        }
        const _updatedSelectorData = await LoanRequestSchema.updateLeadStatus(
          loan_app_id,
          updateStatus,
        );
        return res
          .status(200)
          .send({ success: true, message: 'Request accepted successfully' });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const { check, validationResult } = require('express-validator');
const jwt = require('../../util/jwt');
const CollectionStaggingSchema = require('../../models/collection-stagging-schema');
const { verifyLoanId } = require('../../routes/collection/collection-helper');

module.exports = (app) => {
  app.post(
    '/api/collection-stagging',
    [
      check('loan_details').notEmpty().withMessage('loan_details is required'),
      check('loan_details.lms_id')
        .notEmpty()
        .withMessage('loan_details.lms_id is required'),
      check('loan_details.upi_handle')
        .notEmpty()
        .withMessage('loan_details.upi_handle is required'),
      check('due_details.overdue_days')
        .notEmpty()
        .withMessage('due_details.overdue_days is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, verifyLoanId],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const business_name =
          req.body.loan_details.business_name_loan ??
          req.body.user_details.business_name_lead;
        const marital_status =
          req.body.loan_details.marital_status_loan ??
          req.body.user_details.marital_status_lead;
        const relation_with_applicant =
          req.body.loan_details.relation_with_applicant_loan ??
          req.body.user_details.relation_with_applicant_lead;
        let collStaggingDetails = {
          first_inst_date: req.body.first_inst_date,
          ...req.body.loan_details,
          ...req.body.user_details,
          ...req.body.due_details,
          ...req.body.charge_details,
          business_name,
          marital_status,
          relation_with_applicant,
        };
        const savedCollStaggingDetail =
          await CollectionStaggingSchema.save(collStaggingDetails);
        if (!savedCollStaggingDetail)
          throw {
            success: false,
            message: 'Failed to save collection stagging details',
          };
        return res.status(200).send({
          success: true,
          message: 'Collection stagging details saved',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

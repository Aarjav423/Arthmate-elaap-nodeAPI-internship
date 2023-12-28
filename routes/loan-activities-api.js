const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const LoanActivities = require('../models/loan-activities-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/loan_activities',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [check('loan_app_id').notEmpty().withMessage('loan_app_id is required')],
    async (req, res) => {
      try {
        const loanActivities = await LoanActivities.findByLAPId(
          req.body.loan_app_id,
        );
        if (!loanActivities.length || loanActivities[0] == null)
          throw {
            message:
              'No records found in loan activities against this loan_app_id ',
          };
        return res.status(200).send({
          success: true,
          data: loanActivities,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loan_activities',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [check('loan_app_id').notEmpty().withMessage('loan_app_id is required')],
    async (req, res) => {
      try {
        const loanActivities = await LoanActivities.addNew(req.body);
        if (!loanActivities)
          throw {
            message: 'Error while adding loan activities data',
          };
        return res.status(200).send({
          success: true,
          message: 'Loan activities data recorded successfully',
          data: loanActivities,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loan_activities/:loan_app_id/:partner_loan_app_id',
     [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('url').notEmpty().withMessage('url is required'),
      check('request_type').notEmpty().withMessage('request_type is required'),
      check('api_type').notEmpty().withMessage('api_type is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).send({
            message : "Error in the payload",
            errors: errors.array()
          });
        }
        const loanActivities = await LoanActivities.addNew({
          company_id: req.company._id,
          product_id: req.product._id,
          company_name: req.company.name,
          product_name: req.product.name,
          borrower_id: req.body.borrower_id,
          loan_app_id: req.params.loan_app_id,
          partner_loan_app_id: req.params.partner_loan_app_id,
          api_type: req.body.api_type,
          request_type: req.body.request_type,
          response_type: req.body.response_type,
          label: req.body.label,
          url: req.body.url,
          created_by: req.body.created_by ?? ''
        });
        if (!loanActivities){
          return res.status(400).send({ message: 'Error while adding loan activities data'});
        }
        return res.status(200).send({
          success: true,
          message: 'Loan activities data recorded successfully',
          data: loanActivities,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

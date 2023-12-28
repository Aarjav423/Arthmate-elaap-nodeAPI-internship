const bodyParser = require('body-parser');
const { request } = require('http');
const CoLenderRepaymentSchedule = require('../models/co-lender-repayment-schedule-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    '/api/co-lender-repayment-schedule/:co_lend_loan_id/:co_lender_id',
    async (req, res) => {
      try {
        const profileRes =
          await CoLenderRepaymentSchedule.findColenderRepaymentSchedule(
            req.params.co_lend_loan_id,
            req.params.co_lender_id,
          );
        return res.send({
          success: true,
          message: 'Success',
          data: profileRes,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

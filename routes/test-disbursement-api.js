bodyParser = require('body-parser');

const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post('/api/test_disbursement', async (req, res) => {
    try {
      return res.status(200).send({
        success: true,
        message: 'disbursement request initiated successfully',
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  });

  app.post('/api/test_disbursement_approve_webhook', async (req, res) => {
    try {
      return res.status(200).send({
        success: true,
        message:
          'Loan status has been change to disbursal_approved successfully',
        data: req.body,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  });
};

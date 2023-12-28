const cognito = require('./helpers/aws-cognito')
const { billFetch,billPayment, billStatus } = require('./service/billfetch')

module.exports = (app) => {

  app.get(
    '/bills/:loan_id',
    cognito.verifyToken(process.env.BBPS_API_SCOPE_READ),
    async (req,res) => {
      const { loan_id } = req.params;
      console.info(`Request for bills fetch with loan_id: ${loan_id}`)
      const result = await billFetch(loan_id)
      const response = { code : result.statusCode, data : JSON.parse(result.body)}
      console.info(`Response from bill fetch api: ${result.body}`)
      return res.status(result.statusCode).send(response)
    });

  app.post(
    '/bill-payments',
    cognito.verifyToken(process.env.BBPS_API_SCOPE_WRITE),
    async (req,res) => {
      console.info(`Request receive for bill-payments: ${req.body}`)
      const result = await billPayment(req)
      const response = { code : result.statusCode, data : JSON.parse(result.body)}
      console.info(`Response from bill-payments api: ${result.body}`)
      return res.status(result.statusCode).send(response)
    });

  app.get(
    '/bill-status/:txn_reference_id',
    cognito.verifyToken(process.env.BBPS_API_SCOPE_READ),
    async (req,res) => {
      const { txn_reference_id } = req.params;
      console.log(`Request receive for bill-status with txn_reference_id: ${txn_reference_id}`);
      const result = await billStatus(txn_reference_id);
      const response = { code : result.statusCode, data : JSON.parse(result.body)}
      console.info(`Response from bill-status api: ${result.body}`)
      return res.status(result.statusCode).send(response);
    });
}
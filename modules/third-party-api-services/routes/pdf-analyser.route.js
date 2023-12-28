const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { pdfAnalyser, getPdfAnalyser, pdfAnalyserWebhook } = require('../controllers')

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/pdf-analyser',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_PDF_ANALYSER_ID),
      verifyloanAppIdValidation,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      return await pdfAnalyser(req, res)
    }
  );

  app.post(
    '/api/pdf-analyser-webhook',
    [
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      return await pdfAnalyserWebhook(req, res)
    }
  );

  app.get(
    '/api/get-pdf-analyser/:requestId',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_GET_PDF_ANALYSER_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      return await getPdfAnalyser(req, res)
    }
  );
}
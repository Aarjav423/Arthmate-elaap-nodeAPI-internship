const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { bureauAnalyser }  =require('../controllers')

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  
  app.post(
    '/api/bureau-analyser',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_BUREAU_ANALYSER_ID),
      verifyloanAppIdValidation,
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      return await bureauAnalyser(req, res)
    }
  );
}
const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { shareholdingParserCheck } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for ShareHolding Recognizer Check
    app.post(
        '/api/shareholding-parser',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_SHAREHOLDING_PARSER_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await shareholdingParserCheck(req, res)
        }
    );
}
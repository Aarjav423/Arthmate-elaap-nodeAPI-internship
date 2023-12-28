const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { jsonAnalyser } = require('../controllers/index.js')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    app.post(
        '/api/json-analyser',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_JSON_ANALYSER_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await jsonAnalyser(req, res)
        }
    );
}
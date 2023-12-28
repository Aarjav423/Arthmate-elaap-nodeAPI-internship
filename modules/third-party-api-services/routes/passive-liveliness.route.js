const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { passiveLivelinessCheck } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for Passive Liveliness Check
    app.post(
        '/api/passive-liveliness-check',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_PASSIVE_LIVELINESS_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await passiveLivelinessCheck(req, res)
        }
    );
}
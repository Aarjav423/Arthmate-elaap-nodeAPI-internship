const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { experianHunterCheck, experianHunterCheckAction } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    app.post(
        '/api/experian-hunter-check',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_EXPERIAN_HUNTER_CHECK_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await experianHunterCheck(req, res)
        }
    );

    app.post(
        '/api/experian-hunter-check-action',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_EXPERIAN_HUNTER_CHECK_ACTION_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await experianHunterCheckAction(req, res)
        }
    );
}
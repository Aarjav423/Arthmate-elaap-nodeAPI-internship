const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { udyamRegistrationCheck } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for UDYAM Registration Check
    app.post(
        '/api/udyam-register-check',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_UDYAM_REGISTRATION_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await udyamRegistrationCheck(req, res)
        }
    );
}
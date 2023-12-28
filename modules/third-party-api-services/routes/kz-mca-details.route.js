const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { mcaDetailsPull } = require('../controllers')
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for karza mca details api
    app.post(
        '/api/kz-mca-details',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_KZ_MCA_DETAILS_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await mcaDetailsPull(req, res);
        }
    );
}

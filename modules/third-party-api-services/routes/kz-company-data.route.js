const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { companyDataPull } = require('../controllers')
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for karza company data pull api
    app.post(
        '/api/kz-company-data',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_KZ_COMPANY_DATA_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await companyDataPull(req, res);
        }
    );
}

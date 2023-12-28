const { hitColenderSelectorApi } = require('../controllers')
const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for MSME Colender Selector Api
    app.post(
        '/api/msme-colender-selector',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.MSME_COLENDER_SELECTOR_SERVICE_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await hitColenderSelectorApi(req, res)
        }
    );
}
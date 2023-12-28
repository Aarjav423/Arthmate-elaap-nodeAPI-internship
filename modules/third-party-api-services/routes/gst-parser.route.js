const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { gstParser } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for Pushpak gst parser api
    app.post(
        '/api/gst-parser',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_GST_PARSER_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await gstParser(req, res);
        }
    );
}

const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { createESignRequest, getESignRequestStatus, getCallbackData, getLeegaltityESignRequestStatus } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for POST Legality E-Sign create request api
    app.post(
        '/api/e-sign-create-request',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_ESIGN_CREATE_REQUEST_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await createESignRequest(req, res)
        }
    );

    // Route for Collect Callback response E-SIGN request submit
    app.post(
        '/api/e-sign-callback',
        [
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await getCallbackData(req, res)
        }
    );

    // Route for GET request status api
    app.get(
        '/api/e-sign-request-status/:requestId',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await getESignRequestStatus(req, res)
        }
    );

    // Route for Legality E-Sign GET request status
    app.post(
        '/api/e-sign-request-status',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_REQUEST_STATUS_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await getLeegaltityESignRequestStatus(req, res)
        }
    );
}
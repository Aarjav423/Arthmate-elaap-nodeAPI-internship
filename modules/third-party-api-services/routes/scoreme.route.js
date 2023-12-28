const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { scoreMeBsa, scoreMeBsaWebhook, scoreMeBsaReport, getScoreMeBsaReport, scoreMeBsaV2 } = require('../controllers');

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for ScoreMe BSA API
    app.post(
        '/api/scoreme-bsa',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_SCOREME_BSA_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await scoreMeBsa(req, res)
        }
    );

    // Route for ScoreMe BSA API v2
    app.post(
        '/api/scoreme-bsa-v2',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_SCOREME_BSA_V2_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await scoreMeBsaV2(req, res)
        }
    );

    // Route for SCOREME BSA Webhook request submit
    app.post(
        '/api/scoreme-bsa-webhook',
        [
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await scoreMeBsaWebhook(req, res)
        }
    );

    // Route for Get SCOREME API
    app.get(
        '/api/scorme-bsa-report/:request_id',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_SCOREME_BSA_REPORT_ID),
            AccessLog.maintainAccessLog,
        ],
        async (req,res) => {
            return await scoreMeBsaReport(req, res)
        }
    );

    // Route for Get Direct from SCOREME API
    app.get(
        '/api/get-scoreme-bsa-report/:request_id',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_GET_SCOREME_BSA_REPORT_ID),
            AccessLog.maintainAccessLog,
        ],
        async (req,res) => {
            return await getScoreMeBsaReport(req, res)
        }
    );
}
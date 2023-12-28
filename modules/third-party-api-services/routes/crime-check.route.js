const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const { crimeCheckAddReport, crimeCheckAddReportCallback, getCrimeCheckReport } = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for CRIME CHECK ADD REPORT Registration Check
    app.post(
        '/api/crime-check-add-report',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_CRIME_CHECK_REGISTRATION_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await crimeCheckAddReport(req, res)
        }
    );

    // Route for Collect Callback response CRIME CHECK ADD REPORT request submit
    app.post(
        '/api/crime-check-add-report-callback',
        [
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await crimeCheckAddReportCallback(req, res)
        }
    );

    app.get(
        '/api/download-crime-check-json-report/:requestId',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_DOWNLOAD_CRIME_REPORT_REGISTRATION_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req,res) => {
            return await getCrimeCheckReport(req, res)
        }
    );
}
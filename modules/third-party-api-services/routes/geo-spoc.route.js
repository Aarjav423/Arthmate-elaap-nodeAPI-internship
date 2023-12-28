const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const { verifyloanAppIdValidation } = require('../../../util/loan-app-id-validation.js');
const {
    checkNegativeAreaUsingAddress,
    checkNegativeAreaUsingLatitudeAndLongitude
} = require('../controllers')

module.exports = (app, connection) => {
    app.use(bodyParser.json());

    // Route for geo-spoc with address, city, and pincode ot get latitude and longitude
    app.post(
        '/api/check-negative-area',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_GEO_CODE_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await checkNegativeAreaUsingAddress(req, res)
        }
    );

    // Route for geo-spoc with latitude and longitude to check for negative-area
    app.post(
        '/api/negative-area',
        [
            jwt.verifyToken,
            jwt.verifyUser,
            jwt.verifyCompany,
            services.isServiceEnabledCached(process.env.SERVICE_GEO_CODE_NEGATIVE_AREA_ID),
            verifyloanAppIdValidation,
            AccessLog.maintainAccessLog,
        ],
        async (req, res) => {
            return await checkNegativeAreaUsingLatitudeAndLongitude(req, res)
        }
    );
}
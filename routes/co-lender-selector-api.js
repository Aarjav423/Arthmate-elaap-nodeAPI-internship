const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const {
  callCoLenderSelectorAPI,
  errorObjData,
  logErrorToDb,
  logCustomErrorToDb,
} = require('../utils/coLenderSelectorHelper');

/**
 * Exporting Co-lender Selector API
 * @author Prarabdha Soni(PS21)
 * @param {*} app
 * @param {*} connection
 * @return {*} Co-lender Details
 * @throws {*} MPPL/ARTH by default as colender
 */

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/co-lender-selector',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_CO_LENDER_SELECTOR_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        return await callCoLenderSelectorAPI(req, res);
      } catch (error) {
        const { requestId, objData, respData } = await errorObjData(req, error);
        await logCustomErrorToDb(objData, respData, res, requestId);
        if (error.errorType) {
          return res.status(400).send({
            request_id: requestId,
            message: error.message,
            status: 'fail',
          });
        } else {
          return await logErrorToDb(objData, respData, res, requestId);
        }
      }
    },
  );
};

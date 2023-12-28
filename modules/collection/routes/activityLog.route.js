const jwt = require('../../../util/jwt');
const { activityLogController } = require('../controllers');
const { collectionRoute } = require('../../../constants/common-api-routes');
const { fetchActivityLogsValidationRules } = require("../validators/activityLog.validator");
const { validate } = require("../utils/validation");
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    `${collectionRoute}/activity-log/:collectionId`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchActivityLogsValidationRules(),
    validate,
    activityLogController.getActivityLogs,
  );

  app.post(
    `${collectionRoute}/view-document-logs`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    validate,
    activityLogController.viewLoanDocumentLogs
  );
};

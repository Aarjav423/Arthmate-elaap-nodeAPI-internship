const jwt = require('../../../util/jwt');
const { dashboardController } = require('../controllers');
const { collectionRoute } = require('../../../constants/common-api-routes');
const { fetchDashboardSummaryValidationRules, fetchDashboardOverviewValidationRules, fetchDashboardDepositionStatusPercentagehValidationRules } = require("../validators/dashboard.validator");
const { validate } = require("../utils/validation");

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    `${collectionRoute}/dashboard/summary`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchDashboardSummaryValidationRules(),
    validate,
    dashboardController.getDashboardSummary,
  );
  app.get(
    `${collectionRoute}/dashboard/graph`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchDashboardDepositionStatusPercentagehValidationRules(),
    validate,
    dashboardController.getDepositionStatusPercentage
  );
  app.get(
    `${collectionRoute}/dashboard/overview`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchDashboardOverviewValidationRules(),
    validate,
    dashboardController.getDashboardOverview,
  );
};

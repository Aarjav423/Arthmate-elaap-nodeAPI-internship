const jwt = require('../../../util/jwt');
const {
  CreateActivityLogController,
  GetActivityLogsController,
} = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    `${msmeRoute}/activity-logs/:loan_app_id`,
    jwt.verifyToken,
    jwt.verifyUser,
    async (request, response) => {
      const getActivityLogsController = GetActivityLogsController.create(
        request,
        response,
      );
      await getActivityLogsController.executeAndHandleErrors();
    },
  );

  app.post(
    `${msmeRoute}/activity-logs`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    async (request, response) => {
      const createActivityLogController = CreateActivityLogController.create(
        request,
        response,
      );
      await createActivityLogController.executeAndHandleErrors();
    },
  );
};

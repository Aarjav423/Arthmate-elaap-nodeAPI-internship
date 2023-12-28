const jwt = require('../../../util/jwt');
const { casesController } = require('../controllers');
const { collectionRoute } = require('../../../constants/common-api-routes');
const {
  assignCasesValidationRules,
  getCollIdByLmsIdsRules,
  casesSelectedValidationRules,
  deassignCasesValidationRules,
} = require('../validators/case.validator');
const {
  casesQueryValidationRules,
} = require('../validators/casesQuery.validator');
const { validate } = require('../utils/validation');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    `${collectionRoute}/cases`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesQueryValidationRules(),
    validate,
    casesController.getCases,
  );

  app.post(
    `${collectionRoute}/assign-cases`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    assignCasesValidationRules(),
    validate,
    casesController.assignCases,
  );
  app.get(
    `${collectionRoute}/cases/companies`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesController.getCaseCompanies,
  );
  app.get(
    `${collectionRoute}/cases/assigned`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesController.getFosListAssignedCases,
  );
  app.get(
    `${collectionRoute}/cases/lms-id`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesController.getUniqueLMSId,
  );

  app.post(
    `${collectionRoute}/cases/coll-id`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    getCollIdByLmsIdsRules(),
    validate,
    casesController.getCollIdByLmsIds,
  );

  app.post(
    `${collectionRoute}/cases/select`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesSelectedValidationRules(),
    validate,
    casesController.getCasesByCollId,
  );

  app.get(
    `${collectionRoute}/cases/:caseID`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    casesController.getCaseDetailsById,
  );
  app.get(
    `${collectionRoute}/cases/history/:collID`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    validate,
    casesController.getCaseCollHistoryById,
  );

  app.get(
    `${collectionRoute}/cases/payment/:case_id`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    validate,
    casesController.getCasePaymentHistory,
  );
  app.post(
    `${collectionRoute}/deassign-cases`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    deassignCasesValidationRules(),
    validate,
    casesController.deassignCases,
  );
};

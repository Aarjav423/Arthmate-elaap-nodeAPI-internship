const jwt = require('../../../util/jwt');
const {
    CreateLoanController
} = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');
const { checkLeadExists } = require('../../../util/lead');
const { isLoanExistByLeadID ,isLoanExistByLoanAppId} = require('../../../util/borrower-helper');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    `${msmeRoute}/loan`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    checkLeadExists,
    isLoanExistByLeadID,
    async (request, response) => {
      const createLoanController = CreateLoanController.create(request, response);
      await createLoanController.createLoan();
    },
  );

  app.post(
    `${msmeRoute}/loan/calculateFeesAndCharges`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    checkLeadExists,
    async (request, response) => {
      const createLoanController = CreateLoanController.create(request, response);
      await createLoanController.calculateCharges();
    },
  );
  app.post(
    `${msmeRoute}/create-esign-request`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    isLoanExistByLoanAppId,
    async (request, response) => {
      const createLoanController = CreateLoanController.create(request, response);
      await createLoanController.createSLandLBAesignRequest();
    },
  );
  app.get(
    `${msmeRoute}/get-BIC-data/:loan_app_id`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    async (request, response) => {
      const createLoanController = CreateLoanController.create(request, response);
      await createLoanController.isLoanExistByLoanAppId();
    },
  );
}

const jwt = require('../../../util/jwt');
const {
  DeleteDocumentsController,
} = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.patch(
    `${msmeRoute}/delete-docs`,
    jwt.verifyToken,
    jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    async (request, response) => {
      const deleteDocumentController = DeleteDocumentsController.create(
        request,
        response,
      );
      await deleteDocumentController.executeAndHandleErrors();
    },
  );

};

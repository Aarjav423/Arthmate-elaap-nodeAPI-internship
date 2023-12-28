const jwt = require('../../../util/jwt');
const {
  UploadXmlDocumentsController,
} = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    `${msmeRoute}/xml_docs_upload`,
    jwt.verifyToken,
    //jwt.verifyUser,
    jwt.verifyCompany,
    jwt.verifyProduct,
    async (request, response) => {
        
      const uploadXmlDocumentController = UploadXmlDocumentsController.create(
        request,
        response
      );
      await uploadXmlDocumentController.executeAndHandleErrors();
    },
  );

};

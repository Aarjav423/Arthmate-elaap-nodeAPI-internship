const jwt = require('../../../util/jwt');
const { OfferAmendController } = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(`${msmeRoute}/amend-offer`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const amendController = OfferAmendController.create(request, response);
    await amendController.executeAndHandleErrors();
  });
};

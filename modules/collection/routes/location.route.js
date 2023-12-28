const jwt = require('../../../util/jwt');
const{ locationController } = require('../controllers');
const { collectionRoute } = require('../../../constants/common-api-routes');
const { fetchLocationPincodesValidationRules } = require("../validators/location.validator");
const { validate } = require("../utils/validation");
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    `${collectionRoute}/location/pincodes`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchLocationPincodesValidationRules(),
    validate,
    locationController.getLocationPincodes,
  );
};

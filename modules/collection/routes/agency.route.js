const express = require('express');
const jwt = require('../../../util/jwt');
const { collectionRoute } = require("../../../constants/common-api-routes");
const { agencyController } = require('../controllers');
const { validate } = require('../utils/validation');
const {
  createAgencyValidationRules,
  updateAgencyValidationRules,
} = require('../validators/agency.validator');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    `${collectionRoute}/agencies`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    agencyController.getAgencies,
  );
  app.post(
    `${collectionRoute}/agency`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    createAgencyValidationRules(),
    validate,
    agencyController.createAgency,
  );
  app.patch(
    `${collectionRoute}/agency/:agencyId`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    updateAgencyValidationRules(),
    validate,
    agencyController.updateAgency,
  );
};

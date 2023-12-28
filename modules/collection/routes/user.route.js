const express = require('express');
const jwt = require('../../../util/jwt');
const { userController } = require('../controllers');
const {
  createUserValidationRules,
  fetchUserValidationRules,
  fetchUserByIdValidationRules,
  updateUserValidationRules
} = require('../validators/user.validator');
const { collectionRoute } = require('../../../constants/common-api-routes');
const { validate } = require('../utils/validation');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    `${collectionRoute}/users`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchUserValidationRules(),
    validate,
    userController.getFosUsers,
  );

  app.get(
    `${collectionRoute}/users/:userID`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    fetchUserByIdValidationRules(),
    validate,
    userController.getFosUser,
  );

  app.post(
    `${collectionRoute}/user`,
    jwt.verifyCollectionAdminUser,
    jwt.verifyUser,
    createUserValidationRules(),
    validate,
    userController.addFosUser,
  );

  app.patch(
    `${collectionRoute}/user/:id`,
    [jwt.verifyCollectionAdminUser, jwt.verifyUser],
    updateUserValidationRules(),
    validate,
    userController.updateFosUser,
  );
};

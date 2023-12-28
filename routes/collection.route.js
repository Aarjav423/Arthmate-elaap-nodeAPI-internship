const express = require('express');
const jwt = require('../util/jwt');
const { userController } = require('../modules/collection/controllers');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    '/api/collection/users',
    [jwt.verifyToken, jwt.verifyUser],
    userController.getUsers,
  );
};

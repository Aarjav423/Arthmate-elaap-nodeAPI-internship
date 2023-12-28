'use strict';
const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const { fetchBorrowerHistoryData } = require('../utils/borrowerHistoryHelper');

/**
 * Exporting Borrower History API
 * @author Prarabdha Soni(PS21)
 * @param {*} app
 * @param {*} connection
 * @return {*} Borrower History Details
 * @throws {*} New Customer History
 */

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/borrower-history',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (request, response) => {
      let httpStatus = 500;
      try {
        let __return;
        ({ __return, httpStatus } = await fetchBorrowerHistoryData(
          request,
          httpStatus,
          response,
        ));
        return __return;
      } catch (error) {
        return response.status(httpStatus).send({
          success: false,
          message: httpStatus === 400 ? error.message : 'Internal Server error',
        });
      }
    },
  );
};

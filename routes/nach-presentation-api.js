const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const leadHelper = require('../util/lead');
const borrowerHelper = require('../util/borrower-helper');
const nachPresentationHelper = require('../util/nach-presentation-helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/nach-presentation',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    nachPresentationHelper.validatePresentmentData,
    borrowerHelper.loanExistBulk,
    nachPresentationHelper.prepareNachPresentationData,
    nachPresentationHelper.checkPendingInstallmentExist,
    nachPresentationHelper.storeRequestToS3,
    nachPresentationHelper.callNachPresentationAPI,
    nachPresentationHelper.storeResponseToS3,
    nachPresentationHelper.recordNachPresentmentData,
    async (req, res) => {
      try {
        const data = req.body;
        if (req.nachPresentmentResp.data.STATUS_CODE !== 0)
          throw {
            success: false,
            message: req.nachPresentmentResp.data.STATUS_DESCRIPTION,
          };
        return res.status(200).send({
          success: true,
          message: req.nachPresentmentResp.data.STATUS_DESCRIPTION,
          data: req.nachPresentmentResp.data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

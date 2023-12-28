bodyParser = require('body-parser');
const SubscribeEvent = require('../models/subscribe_event');
const BroadcastEventMaster = require('../models/broadcast_event_master');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const { check, validationResult } = require('express-validator');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/subscribe_event', async (req, res) => {
    try {
      const list = await SubscribeEvent.getAll();
      if (!list.length)
        throw {
          success: false,
          message: 'No records found in broadcast event master ',
        };
      return res.status(200).send(list);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/subscribe_event',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('key').notEmpty().withMessage('key is required'),
      check('key_id').notEmpty().withMessage('key_id is required'),
      check('callback_uri').notEmpty().withMessage('callback_uri is required'),
      check('secret_key').notEmpty().withMessage('secret_key is required'),
    ],
    async (req, res) => {
      try {
        const reqData = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });

        const newRecordData = {
          company_id: req.company._id,
          product_id: req.product._id,
          key: reqData.key,
          key_id: reqData.key_id,
          callback_uri: reqData.callback_uri,
          secret_key: reqData.secret_key,
          header_key: reqData?.header_key,
        };

        //check if key already exists in master table so no false entry is made gainst event
        const isBEExists = await BroadcastEventMaster.checkIfExistsBy_KEY_KEYID(
          reqData.key,
          Number(reqData.key_id),
        );

        if (!isBEExists)
          throw {
            success: false,
            message: 'event key with selected key and key id not found',
          };

        //check if record already exists by key and title
        const isExists =
          await SubscribeEvent.checkIfExistsBy_CID_PID_KEY(newRecordData);
        if (isExists)
          throw {
            success: false,
            message: 'Subscription to this event already exist.',
          };

        const newRecord = await SubscribeEvent.addNew(newRecordData);
        if (!newRecord)
          throw {
            success: false,
            message: 'Error while adding record to database',
          };
        return res.send({
          success: true,
          message: 'Event subscribed successfully created.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.put(
    '/api/subscribe_event/:_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('key').notEmpty().withMessage('key is required'),
      check('callback_uri').notEmpty().withMessage('callback_uri is required'),
      check('secret_key').notEmpty().withMessage('secret_key is required'),
    ],
    async (req, res) => {
      try {
        const reqData = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const newRecordData = {
          company_id: req.company._id,
          product_id: req.product._id,
          key: reqData.key,
          key_id: reqData.key_id,
          callback_uri: reqData.callback_uri,
          secret_key: reqData.secret_key,
        };

        //check if key already exists in master table so no false entry is made gainst event
        const isBEExists = await BroadcastEventMaster.checkIfExistsBy_KEY_KEYID(
          reqData.key,
          Number(reqData.key_id),
        );

        if (!isBEExists)
          throw {
            success: false,
            message: 'event key with selected key and key id not found',
          };

        //check if record already exists by key, title and id
        const isExists = await SubscribeEvent.checkIfExistsBy_CID_PID_KEY(
          newRecordData,
          req.params._id,
        );

        if (!isExists)
          throw {
            success: false,
            message:
              'Subscription to this event already exist with same configuration.',
          };
        if (
          isExists.key === reqData.key &&
          String(isExists.key_id) === String(reqData.key_id) &&
          isExists.callback_uri === reqData.callback_uri &&
          isExists.secret_key === reqData.secret_key
        ) {
          throw {
            success: false,
            message:
              'Subscription to this event already exist with same configuration.',
          };
        }

        //update entire record.
        const updateRecord = await SubscribeEvent.updateRecord(
          req.params._id,
          newRecordData,
        );

        if (!updateRecord)
          throw {
            success: false,
            message: 'Error while updating record',
          };
        return res.status(200).send({
          success: true,
          message: `Update to subscription for ${reqData.key} event successfull!`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/subscribe_event/:_id/:_status',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const statuses = 'active Inactive';

        if (statuses.indexOf(req.params._status) < 0)
          throw {
            success: false,
            message: 'kindly provide status either active or inactive',
          };

        //check if record already exists by key, title and id
        const isExists = await SubscribeEvent.getById(req.params._id);

        if (!isExists)
          throw {
            success: false,
            message: 'Subscription to this event not exists.',
          };
        if (isExists.status === req.params.status) {
          throw {
            success: false,
            message: `Status of subscription to this event already set to ${isExists.status}.`,
          };
        }

        //update entire record.
        const updateRecord = await SubscribeEvent.updateStatus(req.params._id, {
          status: req.params._status,
        });

        if (!updateRecord)
          throw {
            success: false,
            message: 'Error while updating record',
          };
        return res.status(200).send({
          success: true,
          message: `Update to subscription for ${isExists.key} event successfull!`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.delete('/api/subscribe_event/:_id', async (req, res) => {
    try {
      if (req.params._id === null || req.params._id === undefined)
        throw {
          success: false,
          message: 'kindly provide valid id',
        };

      //check if record already exists by key, title and id
      const isExists = await SubscribeEvent.getById(req.params._id);

      if (!isExists)
        throw {
          success: false,
          message: 'Subscription to this event not exists.',
        };
      if (isExists.status === 'Inactive') {
        throw {
          success: false,
          message: `Status of subscription to this event already set to Inactive.`,
        };
      }

      //update entire record.
      const updateRecord = await SubscribeEvent.updateStatus(req.params._id, {
        status: 'Inactive',
      });

      if (!updateRecord)
        throw {
          success: false,
          message: 'Error while updating record',
        };
      return res.status(200).send({
        success: true,
        message: `Subscription Inactivated for ${isExists.key} event successfully!`,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

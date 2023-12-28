bodyParser = require('body-parser');
const BroadcastEventMaster = require('../models/broadcast_event_master');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const helper = require('../util/helper.js');
const { check, validationResult } = require('express-validator');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/broadcast_event_master', async (req, res) => {
    try {
      const list = await BroadcastEventMaster.getAll();
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
    '/api/broadcast_event_master',
    [
      check('title').notEmpty().withMessage('title is required'),
      check('description').notEmpty().withMessage('description is required'),
      check('key').notEmpty().withMessage('key is required'),
    ],
    async (req, res) => {
      try {
        const reqData = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        if (!helper.validateDataSync('title', reqData.title))
          throw {
            success: false,
            message: 'Please enter valid title',
          };
        if (!helper.validateDataSync('description', reqData.description))
          throw {
            success: false,
            message: 'Please enter valid description',
          };
        //check if record already exists by key and title
        const isExists = await BroadcastEventMaster.checkIfExistsByKEY_TITLE(
          reqData.key,
          reqData.title,
        );
        if (isExists)
          throw {
            success: false,
            message: 'event with same title and key already exist.',
          };

        const broadcastEvent = {
          title: reqData.title,
          description: reqData.description,
          key: reqData.key,
        };

        const newRecord = await BroadcastEventMaster.addNew(broadcastEvent);
        if (!newRecord)
          throw {
            success: false,
            message: 'Error while adding record to database',
          };
        return res.send({
          success: true,
          message: 'Broadcast Event key successfully created.',
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.put(
    '/api/broadcast_event_master/:_id',
    [
      check('title').notEmpty().withMessage('title is required'),
      check('description').notEmpty().withMessage('description is required'),
      check('key').notEmpty().withMessage('key is required'),
    ],
    async (req, res) => {
      try {
        if (!req.params._id)
          throw {
            success: false,
            message: 'kindly provide event key_id in url',
          };
        const reqData = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Check whether record exist
        const itemById = await BroadcastEventMaster.getById(req.params._id);
        if (!itemById)
          throw {
            success: false,
            message: 'No record found for event key by id',
          };

        //check if record already exists by key and title
        const isExists = await BroadcastEventMaster.checkIfExistsByKEY_TITLE(
          reqData.key,
          reqData.title,
        );

        if (isExists) {
          throw {
            success: false,
            message: 'event with same title and key already exist.',
          };
        }

        //update entire record.
        const updateRecord = await BroadcastEventMaster.updateRecord(
          req.params._id,
          {
            title: reqData.title,
            description: reqData.description,
            key: reqData.key,
          },
        );

        if (!updateRecord)
          throw {
            success: false,
            message: 'Error while updating record',
          };
        return res.status(200).send({
          success: true,
          message: 'Event record updated Successfully!',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put('/api/broadcast_event_master/:_id/:_status', async (req, res) => {
    try {
      const statuses = 'active Inactive';
      if (!req.params._id)
        throw {
          success: false,
          message: 'kindly provide event key_id in url',
        };

      if (statuses.indexOf(req.params._status) < 0)
        throw {
          success: false,
          message: 'kindly provide status either active or inactive',
        };

      const errors = validationResult(req);
      if (!errors.isEmpty())
        throw {
          success: false,
          message: errors.errors[0]['msg'],
        };

      //Check whether record exist
      const itemById = await BroadcastEventMaster.getById(req.params._id);
      if (!itemById)
        throw {
          success: false,
          message: 'No record found for event key by id',
        };

      // Check if record is already under same status.
      //If yes dont make update call
      if (itemById.status === req.params._status)
        throw {
          success: false,
          message: `Record status is already ${itemById.status}`,
        };

      //update status of record.
      const updateRecord = await BroadcastEventMaster.updateStatus(
        {
          status: req.params._status,
        },
        Number(req.params._id),
      );

      if (!updateRecord)
        throw {
          success: false,
          message: 'Error while updating record',
        };

      return res.status(200).send({
        success: true,
        message: 'Event record updated Successfully!',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.delete('/api/broadcast_event_master/:_id', async (req, res) => {
    try {
      //Check whether record exist
      const itemById = await BroadcastEventMaster.getById(req.params._id);
      if (!itemById)
        throw {
          success: false,
          message: 'No record found for event key by id',
        };
      if (itemById.status === 'Inactive')
        throw {
          success: false,
          message: 'Record already soft deleted in Inactive state.',
        };
      //Delete configuration by id
      let deleteRecord = await BroadcastEventMaster.updateStatus(
        {
          status: 'Inactive',
        },
        req.params._id,
      );
      if (!deleteRecord)
        throw {
          success: false,
          message: 'Something went wrong while deleting record',
        };
      return res.status(200).send({
        success: true,
        message: 'Record status inactivated successfully!',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

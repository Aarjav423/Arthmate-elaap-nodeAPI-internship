const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AccessRoleSchema = require('../models/access-role-schema.js');

module.exports = (app, connection) => {
  app.post(
    '/api/access_role',
    [
      check('title')
        .notEmpty()
        .withMessage('title is required')
        .isLength({ min: 4, max: 25 })
        .withMessage('title length should be min 4 and max 25'),
      check('tags').notEmpty().withMessage('tags is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //Validate input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Validate if access_role already exist.
        const accessRole = await AccessRoleSchema.findIfExist(
          data.title,
          data.tags,
        );
        if (accessRole)
          throw {
            success: false,
            message: 'Role already exists.',
          };
        const AccessRoleRecord = await AccessRoleSchema.addNew({
          name: data.title,
          module_id: data.tags,
        });
        if (!AccessRoleRecord)
          throw {
            success: false,
            message: 'Error while adding Role.',
          };
        return res.status(200).send({
          success: true,
          message: 'Role created successfully.',
          data: AccessRoleRecord,
        });
      } catch (error) {
        let msg = '';
        if (error.code === 11000) {
          const key = Object.keys(error.keyValue);
          let msg = `${key[0]} already exist.`;
          return res.status(400).send({
            success: false,
            message: msg,
          });
        }
        return res.status(400).send(error);
      }
    },
  );
  app.put(
    '/api/access_metrix/:_id/:title/:module_id',
    [
      check('title')
        .notEmpty()
        .withMessage('title is required')
        .isLength({ min: 4, max: 25 })
        .withMessage('title length should be min 4 and max 25'),
      check('tag')
        .notEmpty()
        .withMessage('tag is required')
        .isLength({ min: 4, max: 100 })
        .withMessage('tag length should be min 4 and max 100'),
    ],
    async (req, res) => {
      try {
        const { title, module_id, _id } = req.params;
        const data = req.body;
        //Validate input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        //Validate if access metrix exist by id.
        const accessMetrix = await AccessMetrixSchema.findIfExist(
          title,
          module_id,
          _id,
        );
        if (!accessMetrix)
          throw {
            success: false,
            message: 'No record found in access matrix against given id.',
          };
        const updatedAccessMetrix = await AccessMetrixSchema.updateAccessMetrix(
          { _id: _id },
          { name: data.title, module_id: data.tag },
        );
        if (!updatedAccessMetrix)
          throw { success: false, message: 'Unable to update access matrix' };
        return res.status(200).send({
          success: true,
          message: 'Access matrix updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get('/api/access_metrix/:page/:limit', async (req, res) => {
    try {
      const { page, limit } = req.params;
      const accessMetrix = await AccessMetrixSchema.findPaginatedAccessMetrix(
        page,
        limit,
      );
      if (!accessMetrix.rows.length)
        throw {
          success: false,
          message: 'No records found in access matrix',
        };
      return res.status(200).send({
        success: true,
        data: JSON.parse(JSON.stringify(accessMetrix)),
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

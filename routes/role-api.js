const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const Role = require('../models/roles-schema.js');
const StatusLogsSchema = require('../models/status-logs-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch all roles.
  app.get('/api/role', async (req, res) => {
    try {
      const role = await Role.getAll();
      res.send(role);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //API to get role by id.
  app.get('/api/role/:id', async (req, res) => {
    try {
      const role = await Role.findById(req.params.title);
      res.send(role);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //API to create role.
  app.post(
    '/api/role',
    [
      check('title')
        .notEmpty()
        .withMessage('Role is required.')
        .isLength({ min: 2, max: 25 })
        .withMessage('Role length should be min 2 and max 25'),
      check('tags')
        .isArray()
        .withMessage('tags should be an array.')
        .notEmpty()
        .withMessage('Atleast one tag is required'),
    ],
    async (req, res) => {
      try {
        //Validate input payload
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw { success: false, message: errors.errors[0]['msg'] };
        //Validate if role already exist.
        const accessRole = await Role.findIfExist(data.title);
        if (accessRole)
          throw {
            success: false,
            message: 'Role already exists.',
          };
        // Record role in database.
        const roleRecord = await Role.addNew(data);
        if (!roleRecord)
          return res.status(400).send({
            success: false,
            message: 'error while adding role.',
          });
        return res.status(200).send({
          success: true,
          message: 'Role created successfully.',
          data: roleRecord,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // API to update role by id.
  app.put('/api/role/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, tags } = req.body;
      const data = req.body;
      //Check if role exist by id.
      const roleExistByID = await Role.findIfExistById(id);
      if (!roleExistByID)
        throw { success: false, message: 'No role found against given id.' };
      //Validate for the tags length if pass in payload.
      if (tags) {
        if (!tags.length)
          throw { success: false, message: 'At least one tag is required.' };
      }
      //Validate for empty string
      if (Number(title) === 0)
        throw { success: false, message: 'title cannot be empty' };
      //Validate for the length of title.
      if (title) {
        if (title.toString().length < 2 || title.toString().length > 25)
          throw {
            success: false,
            message: 'title length should be min 2 and max 25',
          };
      }
      //Check if data needs to be updated is not same as existing data.
      if (
        roleExistByID.title === title &&
        roleExistByID?.tags?.toString() === tags?.toString()
      )
        throw {
          success: false,
          message: 'Role with same data already exist.',
        };
      //Check if rolr with same name already exist.
      const titleAlreadyExist = await Role.findByName(title);
      if (titleAlreadyExist && titleAlreadyExist._id * 1 !== id * 1)
        throw {
          success: false,
          message: 'Role with same title already exist.',
        };
      //Update role.
      const updatedRole = await Role.updateRole({ _id: id }, data);
      if (!updatedRole)
        throw { success: false, message: 'Error while updating role.' };
      return res
        .status(200)
        .send({ success: false, message: 'Role updated successfully.' });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

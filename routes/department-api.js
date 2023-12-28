const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const Department = require('../models/department-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/department', async (req, res) => {
    try {
      const department = await Department.getAll();
      res.send(department);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/department/:id', async (req, res) => {
    try {
      const department = await Department.findById(req.params.title);
      res.send(department);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/department',
    [check('title').notEmpty().withMessage('Departemnt is required')],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const department = await Department.findByName(data.title);
        if (department)
          throw {
            message: 'Department already exists by same name.',
          };
        const departmentRecord = await Department.addNew(data);
        res.send({
          message: 'Department created successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put('/api/department/:title', async (req, res) => {
    const title = req.params.title;
    const data = req.body;
    try {
      const updatedDepartment = await Department.updateOne(data, title);
      res.send({
        message: 'Department updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const Designation = require('../models/designation-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/designation', async (req, res) => {
    try {
      const designation = await Designation.getAll();
      res.send(designation);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/designation/:id', async (req, res) => {
    try {
      const designation = await Designation.findById(req.params.title);
      res.send(designation);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/designation',
    [check('title').notEmpty().withMessage('Designation is required')],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const designation = await Designation.findByName(data.title);
        if (designation)
          throw {
            message: 'Designation already exists by same name.',
          };
        const designationRecord = await Designation.addNew(data);
        res.send({
          message: 'Designation created successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put('/api/designation/:title', async (req, res) => {
    const title = req.params.title;
    const data = req.body;
    try {
      const updatedDesignation = await Designation.updateOne(data, title);
      res.send({
        message: 'Designation updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

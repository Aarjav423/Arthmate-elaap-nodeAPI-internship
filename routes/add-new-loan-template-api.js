bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const LoanTemplateNames = require('../models/loan_template_names');
const helper = require('../util/helper.js');
// const MappedTables = require("../models/mapped_tables");

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //get loan template names
  app.get('/api/loan_template', async (req, res) => {
    try {
      const loanTemplateNames = await LoanTemplateNames.getAll();
      return res.json(loanTemplateNames);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  // get mapped tables
  app.get('/api/mapped_tables', async (req, res) => {
    try {
      const mappedTables = await MappedTables.getAll();
      return res.json(mappedTables);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  // ADD NEW LONE TEMPLATE
  app.post('/api/loan_template', async (req, res) => {
    try {
      if (!helper.validateDataSync('title', req.body.name))
        throw {
          success: false,
          message: 'Please enter valid name',
        };
      if (!helper.validateDataSync('description', req.body.description))
        throw {
          success: false,
          message: 'Please enter valid description',
        };
      const loanTemplateExist = await LoanTemplateNames.findIfExists(
        req.body.name,
      );
      if (loanTemplateExist)
        throw {
          message: 'Template name already exists',
        };
      const addLoanTemplate = await LoanTemplateNames.addNew(req.body);
      if (addLoanTemplate)
        return res.send({
          message: 'Template name added successfully.',
          addLoanTemplate,
        });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  // ADD NEW LOAN TEMPLATE MAPPED TABLE
  app.post('/api/loan-mapped-table', async (req, res) => {
    try {
      const mappedTableExist = await MappedTables.findIfExists(req.body.name);
      if (mappedTableExist)
        throw {
          message: 'mapped table already exists',
        };
      const addMappedTable = await MappedTables.addNew(req.body);
      if (addMappedTable)
        return res.send({
          message: 'mapped table added successfully.',
          addMappedTable,
        });
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });
};

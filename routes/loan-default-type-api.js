bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const auth = require('../services/auth/auth.js');
const LoanDefaultTypes = require('../models/loan-default-types-schema.js');
const LoanTemplates = require('../models/loan-templates-schema.js');
const LoanSchemaModel = require('../models/loanschema-schema.js');
const fetch = require('node-fetch');
const s3helper = require('../util/s3helper');
const helper = require('../util/helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get('/api/default_loan_type/:_id', async (req, res) => {
    try {
      const id = req.params._id;
      const loanSchemaById = await LoanSchemaModel.findById(id);
      if (!loanSchemaById)
        throw {
          message: 'Schema not found',
        };
      const loanDefaultTypeById = await LoanDefaultTypes.findById(
        loanSchemaById.loan_type_id,
      );
      if (!loanDefaultTypeById)
        throw {
          message: 'No records found',
        };
      return res.json(loanDefaultTypeById);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  app.get('/api/default_loan_type/', async (req, res) => {
    try {
      const id = req.params._id;
      const loanDefaultTypes = await LoanDefaultTypes.findAll();
      if (!loanDefaultTypes)
        throw {
          message: 'No records found',
        };
      const loanTemplates = await LoanTemplates.findAllById(
        loanDefaultTypes.loan_custom_templates_id,
      );
      res.json(loanDefaultTypes);
    } catch (error) {
      console.log('error', error);
      return res.status(400).send({
        error,
      });
    }
  });

  app.get('/api/loan_default_templates/:_id', async (req, res) => {
    try {
      const id = req.params._id;
      const loanDefaultTypes = await LoanDefaultTypes.findById(id);
      if (!loanDefaultTypes)
        throw {
          message: 'No records found',
        };
      const loanTemplates = await LoanTemplates.findAllById(
        loanDefaultTypes.loan_custom_templates_id,
      );
      if (!loanTemplates)
        throw {
          message: 'No records found',
        };
      let respObj = {};
      let counter = 0;
      loanTemplates.forEach(async (item) => {
        const resultJson = await s3helper.fetchJsonFromS3(
          item.path.substring(item.path.indexOf('templates')),
        );
        respObj[item.name] = resultJson;
        counter++;
        if (counter == loanTemplates.length) res.json(respObj);
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //Create default loan type
  app.post('/api/default_loan_type', async (req, res) => {
    try {
      const loanTypeData = req.body;
      if (!helper.validateDataSync('title', loanTypeData.name))
        throw {
          success: false,
          message: 'Please enter valid name',
        };
      if (!helper.validateDataSync('description', loanTypeData.desc))
        throw {
          success: false,
          message: 'Please enter valid description',
        };
      if (!loanTypeData.template_names.length)
        throw {
          success: false,
          message: 'Please select template names',
        };
      loanTypeData.template_names = req.body.template_names.toString();
      const loanTypeExist = await LoanDefaultTypes.findByName(
        loanTypeData.name,
      );
      if (loanTypeExist)
        throw {
          message: 'Loan type already exists by name',
        };
      const addLoanTemplate = await LoanDefaultTypes.addNew(loanTypeData);
      if (addLoanTemplate)
        return res.json({
          message: 'Loan type created successfully',
        });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

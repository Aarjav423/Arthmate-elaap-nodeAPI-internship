const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');

const leadSchema = require('../maps/lead');
const loanSchema = require('../maps/borrowerinfo');
const loanDocumentSchema = require('../maps/loandocument');
const data = {
  templates: {
    lead: Object.keys(JSON.parse(JSON.stringify(leadSchema.data))),
    loan: Object.keys(JSON.parse(JSON.stringify(loanSchema.data))),
    loandocument: Object.keys(
      JSON.parse(JSON.stringify(loanDocumentSchema.data)),
    ),
  },
  excludes: {
    lead: leadSchema.excludes,
    loan: loanSchema.excludes,
    loandocument: loanDocumentSchema.excludes,
  },
  enums: {
    lead: JSON.parse(JSON.stringify(leadSchema.data)),
    loan: JSON.parse(JSON.stringify(loanSchema.data)),
    loandocument: JSON.parse(JSON.stringify(loanDocumentSchema.data)),
  },
};

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  //API to fetch all enum fields.
  app.post('/api/enum_fields', async (req, res) => {
    try {
      const expectedTemplates = 'lead loan loandocument';

      if (
        !req.body?.templates ||
        !req.body?.templates.length ||
        req.body.templates?.join(' ') !== expectedTemplates
      )
        throw {
          success: false,
          message:
            "expected templates in format ['lead, 'loan, 'loandocument']",
        };
      let response = {};
      req.body.templates.forEach((item) => {
        const enumFieldsData = data.enums[item];
        const enumFields = Object.keys(data.enums[item]);
        let enumFieldsDataFiltered = {};
        enumFields.forEach((item) => {
          if (enumFieldsData[item].hasOwnProperty('enum'))
            enumFieldsDataFiltered[item] = enumFieldsData[item]['enum'];
        });
        response[item] = enumFieldsDataFiltered;
      });
      return res.status(200).send({
        success: true,
        data: response,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

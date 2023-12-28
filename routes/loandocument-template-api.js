bodyParser = require('body-parser');
const loanDocTemplateSchema = require('../models/loandoc-template-schema.js');
const loanTemplatesSchema = require('../models/loan-templates-schema.js');
const LoanCustomTemplates = require('../models/loan_custom_templates-schema');
const LoanSchemaModel = require('../models/loanschema-schema');
const jwt = require('../util/jwt');
const helper = require('../util/helper.js');
const s3helper = require('../util/s3helper');
const fetch = require('node-fetch');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/loandoc_template',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        const key = `loandocument/${
          req.company ? req.company.code : 'AM'
        }/${req.product.name.replace(/\s/g, '')}/${Date.now()}.txt`;
        const uploadedFilePath = await s3helper.uploadFileToS3(
          data.templates,
          key,
        );
        if (!uploadedFilePath)
          return {
            message: 'Error uploading loan document template to s3 file',
          };
        let objData = {
          company_id: req.company._id,
          product_id: req.product._id,
          template_url: uploadedFilePath.Location,
        };
        const templateAlreadyExist =
          await loanDocTemplateSchema.findByCondition({
            company_id: data.company_id,
            product_id: data.product_id,
          });
        if (templateAlreadyExist) {
          const updateLoanTemplate =
            await loanDocTemplateSchema.updateLoanTemplate(objData);
          if (!updateLoanTemplate)
            throw {
              message: 'Error while updating loandocument template',
            };
          return res.send({
            message: 'Loan document template updated successfully.',
          });
        } else {
          const addloanDocTemplate =
            await loanDocTemplateSchema.addNew(objData);
          if (!addloanDocTemplate)
            throw {
              message: 'Errorn while adding loan document template',
            };
          return res.send({
            message: 'Loan document template added successfully.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/default_loan_template',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res) => {
      try {
        const data = req.body;
        data.company_code = req.company.code;
        data.template_type = 'custom';
        const loanSchema = await LoanSchemaModel.findById(data?.loan_schema_id);
        if (!loanSchema)
          throw {
            message: 'Loan Schema Id is not Valid',
          };
        data.loanSchema = loanSchema;
        data.loan_type_id = data.loanSchema.loan_type_id;

        const loanTemplates = await loanTemplatesSchema.findByCondition({
          loan_custom_templates_id: data.loanSchema.loan_custom_templates_id,
        });
        if (!loanTemplates.length)
          throw {
            message: 'No records for loan templates',
          };
        //upload all the templates to s3 and get pa
        const uploadTemplateToS3 =
          await s3helper.uploadTemplatesToS3Multi(data);
        if (!uploadTemplateToS3)
          throw {
            message: 'Empty file, Error uploading templates to S3 ',
          };

        const templatesUpdate = await helper.createLoanTemplateRows(
          uploadTemplateToS3,
          data.loanSchema.loan_custom_templates_id,
        );
        //insert path in loan template table
        const updateBulkLoanTemplate =
          await loanTemplatesSchema.updateBulk(templatesUpdate);
        if (!updateBulkLoanTemplate)
          throw {
            message: 'Error while updating default loan template',
          };
        return res.json({
          message: 'Default loan templates updated successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get('/api/loan_schema_template/:loan_schema_id', async (req, res) => {
    try {
      const id = req.params.loan_schema_id;
      const loanSchema = await LoanSchemaModel.findById(id);
      if (!loanSchema)
        throw {
          message: 'No records found',
        };
      const loanTemplates = await loanTemplatesSchema.findAllById(
        loanSchema.loan_custom_templates_id,
      );
      if (!loanTemplates)
        throw {
          message: 'No records found',
        };
      let respObj = {};
      let counter = 0;
      loanTemplates.forEach(async (item) => {
        //fetch the custom template json data from s3 by path
        let json = await s3helper.fetchJsonFromS3(
          item.path.substring(item.path.indexOf('templates')),
          {
            method: 'Get',
          },
        );
        respObj[item.name] = json;
        counter++;
        if (counter == loanTemplates.length) {
          res.json(respObj);
        }
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

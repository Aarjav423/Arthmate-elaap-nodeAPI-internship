const bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const jwt = require('../util/jwt');
const borrowerHelper = require('../util/borrower-helper.js');
const { check, validationResult } = require('express-validator');
const validate = require('../util/validate-req-body.js');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const s3helper = require('../util/s3helper');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const validateLoanPatchMiscDetailsData = async (req, res, next) => {
    try {
      const displayOnUIFieldsArray = [
        'father_or_spouse_name',
        'business_name',
        'business_address',
        'business_state',
        'business_city',
        'business_pin_code',
        'business_establishment_proof_type',
        'udyam_reg_no',
        'gst_number',
        'other_business_reg_no',
        'business_pan',
        'dealer_name',
        'dealer_email',
      ];

      //find the custom template path of requested template type
      const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
        req.loanSchema.loan_custom_templates_id,
        'loan',
      );
      if (!loanTemplate)
        throw {
          success: false,
          message: 'No records found for loan template',
        };
      //fetch the custom template json data from s3 by path
      const template = await s3helper.fetchJsonFromS3(
        loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
      );
      if (!template)
        throw {
          success: false,
          message: 'Error fetching json from s3',
        };

      const finalFieldsFiltered = template.filter(
        (item) => displayOnUIFieldsArray.indexOf(item.field) > -1,
      );
      //validate request data with above data
      const result = await validate.validateDataWithTemplate(
        finalFieldsFiltered,
        [req.body],
      );
      if (!result)
        throw {
          success: false,
          message: 'Error while validating data with template.',
        };
      if (result?.unknownColumns?.length)
        throw {
          success: false,
          message: 'Few columns are unknown',
          data: {
            unknownColumns: result.unknownColumns,
          },
        };
      if (result?.missingColumns?.length)
        throw {
          success: false,
          message: 'Few columns are missing',
          data: {
            missingColumns: result.missingColumns,
          },
        };
      if (result?.errorRows?.length)
        throw {
          success: false,
          message: 'Few fields have invalid data',
          data: {
            exactErrorRows: result.exactErrorColumns,
            errorRows: result.errorRows,
          },
        };
      if (result?.exactEnumErrorColumns?.length)
        throw {
          success: false,
          message: `${result.exactEnumErrorColumns[0]}`,
          errorCode: '02',
          data: {
            exactEnumErrorColumns: result.exactEnumErrorColumns,
          },
        };
      if (result?.emptyErrorColumns?.length)
        throw {
          success: false,
          message: `few fields are empty string`,
          data: result.emptyErrorColumns,
        };
      next();
    } catch (error) {
      return res.status(400).send(error);
    }
  };

  app.patch(
    '/api/borrower-misc-data/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    validateLoanPatchMiscDetailsData,
    async (req, res) => {
      try {
        const data = req.body;
        const { loan_id } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };

        //Validate if loan exist by loan_id
        const loanData = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;

        //Validate loan status is
        if (loanData.stage > 2)
          throw {
            success: false,
            message: `Unable to update misc details as loan is in ${loanData.status}`,
          };

        //Update necessary data
        const borrowerInfo = await BorrowerinfoCommon.updateBI(data, loan_id);
        if (!borrowerInfo)
          throw {
            success: false,
            message: 'Failed to update Misc details',
          };
        if (borrowerInfo)
          return res.status(200).send({
            success: true,
            message: 'Data has been updated successfully',
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

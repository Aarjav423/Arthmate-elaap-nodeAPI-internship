const bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const jwt = require('../util/jwt');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');
const { check, validationResult } = require('express-validator');
const validate = require('../util/validate-req-body.js');
const Collateral = require('../models/collateral-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const validateCollateralPatchCollectionData = async (req, res, next) => {
    try {
      const template = [
        {
          field: 'policy_issuance_date',
          type: 'date',
          checked: 'FALSE',
          validationmsg: 'Please enter valid policy_issuance_date.',
          allowEmpty: false,
        },
        {
          field: 'policy_expiry_date',
          type: 'date',
          checked: 'FALSE',
          validationmsg: 'Please enter valid policy_expiry_date.',
          allowEmpty: false,
        },
        {
          field: 'vehicle_sub_model',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'Please enter valid vehicle_sub_model.',
          allowEmpty: false,
        },
        {
          field: 'vehicle_type',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'Please enter valid vehicle_type.',
          allowEmpty: false,
        },
      ];
      //validate request data with above data
      const result = await validate.validateDataWithTemplate(template, [
        req.body,
      ]);
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
    '/api/collateral-collection/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateCollateralPatchCollectionData,
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

        //Validate loan status is not disbursement_initiated
        if (loanData.stage > 3)
          throw {
            success: false,
            message: `Unable to update collateral collection details as loan is in ${loanData.status}`,
          };

        const borrowerInfo = await Collateral.updateBI(data, loan_id);
        if (!borrowerInfo)
          throw {
            success: false,
            message: 'Error while updating collateral collection details.',
          };
        if (borrowerInfo)
          return res.status(200).send({
            success: true,
            message: 'Collateral collection details updated successfully.',
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  const validateLoanPatchCollectionData = async (req, res, next) => {
    try {
      const template = [
        {
          field: 'ref1_address',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref1_address please',
          allowEmpty: false,
        },
        {
          field: 'ref1_relation_with_borrower',
          type: 'string',
          checked: 'FALSE',
          validationmsg:
            'please enter valid loan ref1_relation_with_borrower please',
          allowEmpty: false,
        },
        {
          field: 'ref1_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref1_name please',
          allowEmpty: false,
        },
        {
          field: 'ref1_mob_no',
          type: 'mobile',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref1_mob_no please',
          allowEmpty: false,
        },
        {
          field: 'business_address',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_address',
          allowEmpty: false,
        },
        {
          field: 'business_address_ownership',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_address_ownership',
          allowEmpty: false,
        },
        {
          field: 'business_city',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_city',
          allowEmpty: false,
        },
        {
          field: 'business_pin_code',
          type: 'pincode',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_pin_code',
          allowEmpty: false,
        },
        {
          field: 'business_state',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_state',
          allowEmpty: false,
        },
        {
          field: 'business_type',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan business_type',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_bureau_score',
          type: 'number',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan co_app_or_guar_bureau_score',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_bureau_type',
          type: 'enum',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan co_app_or_guar_bureau_type',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_poi',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan co_app_or_guar_poi',
          allowEmpty: false,
        },
        {
          field: 'customer_type',
          type: 'enum',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan customer_type',
          allowEmpty: false,
        },
        {
          field: 'downpayment_amount',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan downpayment_amount',
          allowEmpty: false,
        },
        {
          field: 'employer_id',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan employer_id',
          allowEmpty: false,
        },
        {
          field: 'employment_status',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan employment_status',
          allowEmpty: false,
        },
        {
          field: 'father_or_spouse_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan father_or_spouse_name',
          allowEmpty: false,
        },
        {
          field: 'insurance_company',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan insurance_company',
          allowEmpty: false,
        },
        {
          field: 'insurance_partner_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan insurance_partner_name',
          allowEmpty: false,
        },
        {
          field: 'insurance_type',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan insurance_type',
          allowEmpty: false,
        },
        {
          field: 'invoice_amount',
          type: 'float',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan invoice_amount',
          allowEmpty: false,
        },
        {
          field: 'invoice_date',
          type: 'date',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan invoice_date',
          allowEmpty: false,
        },
        {
          field: 'invoice_number',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan invoice_number',
          allowEmpty: false,
        },
        {
          field: 'marital_status',
          type: 'string',
          checked: 'FALSE',
          validationmsg:
            'please enter valid loan please enter valid loan marital_status',
          allowEmpty: false,
        },
        {
          field: 'nature_of_business',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan nature_of_business',
          allowEmpty: false,
        },
        {
          field: 'professional_category',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan professional_category',
          allowEmpty: false,
        },
        {
          field: 'ref2_address',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref2_address',
          allowEmpty: false,
        },
        {
          field: 'ref2_mob_no',
          type: 'mobile',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref2_mob_no',
          allowEmpty: false,
        },
        {
          field: 'ref2_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref2_name',
          allowEmpty: false,
        },
        {
          field: 'ref2_relation_with_borrower',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan ref2_relation_with_borrower',
          allowEmpty: false,
        },
        {
          field: 'vintage_current_employer',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan vintage_current_employer',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid loan co_app_or_guar_name',
          allowEmpty: false,
        },
      ];
      //validate request data with above data
      const result = await validate.validateDataWithTemplate(template, [
        req.body,
      ]);
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
    '/api/loan-collection/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateLoanPatchCollectionData,
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

        //Validate loan status is not disbursal_approved
        if (loanData.stage > 3)
          throw {
            success: false,
            message: `Unable to update collection loan details as loan is in ${loanData.status}`,
          };

        const borrowerInfo = await BorrowerinfoCommon.updateBI(data, loan_id);
        if (!borrowerInfo)
          throw {
            success: false,
            message: 'Error while updating collection loan details.',
          };
        if (borrowerInfo)
          return res.status(200).send({
            success: true,
            message: 'Collection loan details updated successfully.',
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  const validateLeadPatchCollectionData = async (req, res, next) => {
    try {
      const template = [
        {
          field: 'type_of_addr',
          type: 'enum',
          checked: 'FALSE',
          validationmsg: 'please enter valid type_of_addr ',
          allowEmpty: false,
        },
        {
          field: 'resi_addr_landmark',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid resi_addr_landmark',
          allowEmpty: false,
        },
        {
          field: 'email_id',
          type: 'email',
          checked: 'FALSE',
          validationmsg: 'please enter valid email_id',
          allowEmpty: false,
        },
        {
          field: 'business_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid business_name',
          allowEmpty: false,
        },
        {
          field: 'relation_with_applicant',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid relation_with_applicant',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_mobile_no',
          type: 'mobile',
          checked: 'FALSE',
          validationmsg: 'please enter valid co_app_or_guar_mobile_no',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_pan',
          type: 'pan',
          checked: 'FALSE',
          validationmsg: 'please enter valid co_app_or_guar_pan',
          allowEmpty: false,
        },
        {
          field: 'co_app_or_guar_address',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid co_app_or_guar_address',
          allowEmpty: false,
        },
        {
          field: 'per_addr_ln1',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid per_addr_ln1',
          allowEmpty: false,
        },
        {
          field: 'per_addr_ln2',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid per_addr_ln2',
          allowEmpty: false,
        },
        {
          field: 'per_city',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid per_city',
          allowEmpty: false,
        },
        {
          field: 'per_pincode',
          type: 'pincode',
          checked: 'FALSE',
          validationmsg: 'please enter valid per_pincode',
          allowEmpty: false,
        },
        {
          field: 'per_state',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid per_state',
          allowEmpty: false,
        },
        {
          field: 'ebill_num',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid ebill_num',
          allowEmpty: false,
        },
        {
          field: 'resi_addr_ln2',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'please enter valid resi_addr_ln2',
          allowEmpty: false,
        },
        {
          field: 'residence_status',
          type: 'enum',
          checked: 'FALSE',
          validationmsg: 'please enter valid residence_status',
          allowEmpty: false,
        },
      ];
      const result = await validate.validateDataWithTemplate(template, [
        req.body,
      ]);
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
    '/api/lead-collection/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateLeadPatchCollectionData,
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

        //Validate loan status is not disbursal_approved
        if (loanData.stage > 3)
          throw {
            success: false,
            message: `Unable to update collection lead details as loan is in ${loanData.status}`,
          };

        const loanRequestData = await LoanRequestSchema.updateByLid(
          data,
          loan_id,
        );
        if (!loanRequestData)
          throw {
            success: false,
            message: 'Error while updating collection lead details.',
          };
        if (loanRequestData)
          return res.status(200).send({
            success: true,
            message: 'Collection lead details updated successfully.',
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

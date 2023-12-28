const bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const borrowerHelper = require('../util/borrower-helper.js');
const validate = require('../util/validate-req-body.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const validateLoanPatchBankDetailsData = async (req, res, next) => {
    try {
      const template = [
        {
          field: 'borro_bank_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'Please enter valid borro bank name.',
        },
        {
          field: 'borro_bank_acc_num',
          type: 'alphanum',
          checked: 'FALSE',
          validationmsg: 'Please enter valid borro bank account number',
        },
        {
          field: 'borro_bank_ifsc',
          type: 'ifsc',
          checked: 'FALSE',
          validationmsg: 'Please enter valid borro bank ifsc',
        },
        {
          field: 'borro_bank_account_holder_name',
          type: 'string',
          checked: 'FALSE',
          validationmsg: 'Please enter valid borro bank account holder name',
        },
        {
          field: 'borro_bank_account_type',
          type: 'enum',
          checked: 'FALSE',
          validationmsg: 'Please enter valid borro bank account type',
        },
        {
          field: 'bene_bank_name',
          type: 'string',
          checked: 'TRUE',
          validationmsg: 'Please enter valid bene bank name',
        },
        {
          field: 'bene_bank_acc_num',
          type: 'alphanum',
          checked: 'TRUE',
          validationmsg: 'Please enter valid bene bank account number',
        },
        {
          field: 'bene_bank_ifsc',
          type: 'ifsc',
          checked: 'TRUE',
          validationmsg: 'Please enter valid bene bank ifsc',
        },
        {
          field: 'bene_bank_account_holder_name',
          type: 'string',
          checked: 'TRUE',
          validationmsg: 'Please enter valid bene bank account holder name',
        },
        {
          field: 'bene_bank_account_type',
          type: 'enum',
          checked: 'TRUE',
          validationmsg: 'Please enter valid bene bank account type',
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
      if (result.unknownColumns.length)
        throw {
          success: false,
          message: 'Few columns are unknown',
          data: {
            unknownColumns: result.unknownColumns,
          },
        };
      if (result.missingColumns.length)
        throw {
          success: false,
          message: 'Few columns are missing',
          data: {
            missingColumns: result.missingColumns,
          },
        };
      if (result.errorRows.length)
        throw {
          success: false,
          message: 'Few fields have invalid data',
          data: {
            exactErrorRows: result.exactErrorColumns,
            errorRows: result.errorRows,
          },
        };
      if (result.exactEnumErrorColumns.length)
        throw {
          success: false,
          message: `${result.exactEnumErrorColumns[0]}`,
          errorCode: '02',
          data: {
            exactEnumErrorColumns: result.exactEnumErrorColumns,
          },
        };
      next();
    } catch (error) {
      console.log(error);
      return res.status(400).send(error);
    }
  };

  app.patch(
    '/api/bank-details/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateLoanPatchBankDetailsData,
    [
      check('borro_bank_name')
        .optional({ checkFalsy: false })
        .isString('en-US', { ignore: ' ' })
        .withMessage('borro_bank_name is required'),
      check('borro_bank_acc_num')
        .optional({ checkFalsy: false })
        .isAlphanumeric()
        .withMessage('borro_bank_acc_num is required'),
      check('borro_bank_ifsc')
        .optional({ checkFalsy: false })
        .isAlphanumeric()
        .withMessage('borro_bank_ifsc is required'),
      check('borro_bank_account_holder_name')
        .optional({ checkFalsy: false })
        .isAlphanumeric('en-US', { ignore: ' ' })
        .withMessage('borro_bank_account_holder_name is required'),
      check('borro_bank_account_type')
        .optional({ checkFalsy: false })
        .isAlphanumeric()
        .withMessage('borro_bank_account_type is required'),
    ],
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        const data = req.body;

        // Validate the input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        //Validate if loan exist by loan_id
        const loanData = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;

        //Validate loan status is not disbursal_approved
        if (
          loanData.stage > 2 &&
          loanData.stage !== 211 &&
          loanData.stage !== 212
        )
          throw {
            success: false,
            message: `Unable to update bank details as loan is in ${loanData.status}`,
          };

        //Update necessary data
        const borrowerInfo = await BorrowerinfoCommon.updateBI(data, loan_id);
        if (!borrowerInfo)
          throw {
            success: false,
            message: 'Error while updating bank details',
          };
        if (borrowerInfo)
          return res.status(200).send({
            success: true,
            message: 'Bank details updated successfully.',
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

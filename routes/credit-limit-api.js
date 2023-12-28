bodyParser = require('body-parser');
const asyncLib = require('async');
const { check, validationResult } = require('express-validator'); // fields validator
const CreditLimitDetails = require('../models/credit-limit-schema.js');
const BorrowerCommon = require('../models/borrowerinfo-common-schema.js');
const Product = require('../models/product-schema');
const LoanSchema = require('../models/loanschema-schema.js');
const LoanTemplateSchema = require('../models/loan-templates-schema.js');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const helper = require('../util/helper');
const validate = require('../util/validate-req-body');
const validationCheck = require('../util/kyc-validation');
const moment = require('moment');

module.exports = (app, connection) => {
  app.get(
    '/api/loansanction/:kLId',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const loan_id = req.params.kLId;
        const RespBorro = await BorrowerCommon.findOneWithKLID(loan_id);
        if (!RespBorro)
          throw {
            success: false,
            message: 'This loan id do not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            success: false,
            message: 'This loan_id is not associated with selected company',
          };
        const checkResult = await CreditLimitDetails.checkCreditLimit(loan_id);
        if (!checkResult)
          throw {
            success: false,
            message: `Credit limit is not set for this ${loan_id}. Please first set limit.`,
          };
        reqUtils.json(req, res, next, 200, {
          success: true,
          data: {
            available_balance: checkResult.limit_amount,
            loan_id: loan_id,
            partner_loan_od: checkResult.partner_loan_id,
          },
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loansanction',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid loan id.',
          },
          {
            field: 'limit_amount',
            type: 'float',
            checked: 'TRUE',
            validationmsg: 'Please enter valid limit amount.',
          },
        ];
        asyncLib.reduce(
          reqData,
          [],
          async (acc, body) => {
            const loan_id = req.body.loan_id;
            const limit_amount = req.body.limit_amount;
            const RespBorro = await BorrowerCommon.findOneWithKLID(loan_id);
            if (!RespBorro)
              throw {
                message: 'Error while fetching borrowerinfo data',
              };

            const checkCreditLimitDetails =
              await CreditLimitDetails.checkCreditLimit(loan_id);
            if (checkCreditLimitDetails) {
              throw {
                message: 'Limit is already set for this loan id',
              };
            }

            if (RespBorro.company_id !== req.company._id)
              throw {
                message:
                  'This loan_id is not associated with selected company.',
              };
            if (
              RespBorro.status !== 'disbursal_approved' &&
              RespBorro.status !== 'disbursed'
            )
              throw {
                message: `Loan status is not disbursal approved for ${RespBorro.loan_id}. Kindly contact administrator.`,
              };
            if (
              parseFloat(body.limit_amount) >
              parseFloat(RespBorro.applied_amount)
            )
              throw {
                message: ` Sanction amount for ${RespBorro.loan_id}  should be less than or equal to applied amount`,
              };
            const productRes = await Product.findProductId(
              RespBorro.product_id,
            );
            if (!productRes)
              throw {
                success: false,
                message: 'Error while finding product data.',
                success: false,
              };
            const finalData = {
              loan_id: RespBorro.loan_id,
              borrower_id: RespBorro.borrower_id,
              partner_loan_id: RespBorro.partner_loan_id,
              partner_borrower_id: RespBorro.partner_borrower_id,
              company_id: RespBorro.company_id,
              product_id: RespBorro.product_id,
              limit_amount: limit_amount,
              company_name: req.company.name,
              product_name: productRes.name,
            };
            if (productRes.check_mandatory_docs) {
              const mandatoryDocCheck =
                await validationCheck.CheckMandatoryDocUpload(
                  productRes.loan_schema_id,
                  loan_id,
                );
              if (!mandatoryDocCheck.success)
                throw {
                  message: mandatoryDocCheck,
                };
              const condition = {
                loan_id: RespBorro.loan_id,
                sanction_amount: limit_amount,
              };
              const updateSanctionAmountBorrowwerInfo =
                await BorrowerCommon.updateSanctionAmount(condition);
              if (!updateSanctionAmountBorrowwerInfo)
                throw {
                  message:
                    'Error while updating sanction amount in borrower details',
                };
              const addCreditLimit = await CreditLimitDetails.addNew(finalData);
              if (!addCreditLimit)
                throw {
                  message: 'Error while creating new credit limit',
                };
              acc.push({
                success: true,
              });
              return acc;
            } else if (!productRes.check_mandatory_docs) {
              const condition = {
                loan_id: RespBorro.loan_id,
                sanction_amount: limit_amount,
              };
              const updateSanctionAmountBorrowwerInfo =
                await BorrowerCommon.updateSanctionAmount(condition);
              if (!updateSanctionAmountBorrowwerInfo)
                throw {
                  message:
                    'Error while updating sanction amount in borrower details',
                };
              const newCreditLimit = await CreditLimitDetails.addNew(finalData);
              if (!newCreditLimit)
                throw {
                  message: 'Error while creating new credit limit',
                };
              acc.push({
                success: true,
                new: true,
              });
              return acc;
            }
          },
          (err, allDone) => {
            if (err) {
              return reqUtils.json(req, res, next, 400, {
                success: false,
                message: err.message,
              });
            } else {
              const count = allDone.filter((a) => a.success == true).length;
              if (count === 0) {
                return reqUtils.json(req, res, next, 400, {
                  success: false,
                  record: allDone,
                });
              } else {
                return reqUtils.json(req, res, next, 200, {
                  success: true,
                  message: `Successfully set credit limits of ${count} records.`,
                  data: allDone,
                });
              }
            }
          },
        );
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/loansanction',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid loan id.',
          },
          {
            field: 'limit_amount',
            type: 'float',
            checked: 'TRUE',
            validationmsg: 'Please enter valid limit amount.',
          },
        ];
        //validate request data with above data
        const result = await validate.validateDataWithTemplate(template, [
          reqData,
        ]);
        if (!result)
          throw {
            success: false,
            message: 'Error while validating data.',
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
        const loan_id = req.body.loan_id;
        const limit_amount = req.body.limit_amount;
        const RespBorro = await BorrowerCommon.findOneWithKLID(loan_id);
        if (!RespBorro)
          throw {
            success: false,
            message: 'No records found in borrower info for this loan id.',
          };
        if (RespBorro.company_id !== req.company._id)
          throw {
            success: false,
            message: 'This loan id is associated with the selected company.',
          };
        if (
          parseFloat(req.body.limit_amount) >
          parseFloat(RespBorro.applied_amount)
        )
          throw {
            message: ` Sanction amount for ${RespBorro.loan_id}  should be less than or equal to applied amount`,
          };
        const checkResult = CreditLimitDetails.checkCreditLimit(loan_id);
        if (!checkResult)
          throw {
            success: false,
            message: `Credit limit is not set for this ${loan_id}. Please first set limit.`,
          };
        const condition = {
          loan_id: RespBorro.loan_id,
          sanction_amount: limit_amount,
        };
        const updateSanctionAmountBorrowwerInfo =
          await BorrowerCommon.updateSanctionAmount(condition);
        if (!updateSanctionAmountBorrowwerInfo)
          throw {
            message: 'Error while updating sanction amount in borrower details',
          };
        const updateResult = await CreditLimitDetails.updateCreditLimit(
          loan_id,
          limit_amount,
        );
        if (!updateResult)
          throw {
            success: false,
            message: 'Error while updating credit limit data',
          };
        return reqUtils.json(req, res, next, 200, {
          success: true,
          message: `Credit limit for this ${loan_id} loan id updated successfully`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/creditlimitFilterPaginated',
    [jwt.verifyToken, jwt.verifyUser, AccessLog.maintainAccessLog],
    [
      check('page')
        .notEmpty()
        .withMessage('page is required')
        .isNumeric()
        .withMessage('limit accept only number.'),
      check('limit')
        .notEmpty()
        .withMessage('limit is required')
        .isNumeric()
        .withMessage('limit accept only number.'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const data = req.body;
        if (!data.loan_id) delete data.loan_id;
        if (!data.company_id) delete data.company_id;
        if (!data.product_id) delete data.product_id;
        const response = await CreditLimitDetails.getCredtLimitData(data);
        if (!response)
          throw {
            success: false,
            message: 'No Record found',
          };
        return reqUtils.json(req, res, next, 200, response);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

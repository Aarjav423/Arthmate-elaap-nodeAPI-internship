const { query, validationResult } = require('express-validator');
const { Case } = require('../models');
const { default: mongoose } = require('mongoose');

const casesQueryValidationRules = () => {
  const validationRules = [
    query('type')
      .optional()
      .custom(async (value) => {
        const validCaseType = ['new', 'inProgress', 'close'];
        if (!validCaseType.includes(value)) {
          throw new Error('Invalid case type value');
        }
        return true;
      }),
    query('name').optional().isString().withMessage('Name must be a string'),
    query('minDPD').optional().isNumeric().withMessage('Invalid DPD query value.'),
    query('maxDPD').optional().isNumeric().withMessage('Invalid DPD query value.'),
    query('minAmount').optional().isNumeric().withMessage('Invalid Amount query Value.'),
    query('maxAmount').optional().isNumeric().withMessage('Invalid Amount query value.'),
    query('status')
      .optional()
      .custom(async (value) => {
        const validCaseStatus = ['open', 'closed', 'ongoing', 'partially_paid'];
        if (!validCaseStatus.includes(value)) {
          throw new Error('Invalid case status value');
        }
        return true;
      }),
    query('coll_id')
      .optional()
      .matches(/^Coll_\d{15}$/)
      .withMessage('Invalid collection Id'),
    query('pincode')
      .optional()
      .matches(/^[1-9]\d{5}$/)
      .withMessage('Invalid Pincode.'),
    query('lms_id').optional().isString().withMessage('LMS_ID must an string.'),
    query('assigned_to')
      .optional()
      .custom(async (value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid Agent Id');
        }
        return true;
      }),
    query('company_code')
      .optional()
      .isString().withMessage("Invalid company code."),
    query('limit').optional().isNumeric().withMessage('Limit must be a number'),
    query('page').optional().isNumeric().withMessage('Page must be an number'),
    query('sortBy')
      .optional()
      .custom(async (value) => {
        const sortParameter = value.split(':');
        const schema = Case.schema.obj;
        if (!(sortParameter[0] in schema)) {
          throw new Error('Invalid sort parameter');
        }
        if (
          sortParameter.length > 1 &&
          sortParameter[1] != 'desc' &&
          sortParameter[1] != 'asc'
        ) {
          throw new Error('Invalid sort parameter');
        }
        return true;
      }),
    query('populate')
      .optional()
      .custom(async (value) => {
        const populatePath = value.split(',');
        const schema = Case.schema.obj;
        populatePath.forEach(element => {
          if (!(element in schema)) {
            throw new Error(`Invalid populate path. ${element}`)
          }
        });
        return true;
      })
  ];

  return validationRules;
};

module.exports = {
  casesQueryValidationRules,
};

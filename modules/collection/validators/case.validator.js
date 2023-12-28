const { check } = require('express-validator');
const { statusTypes } = require('../config/collection');

const assignCasesValidationRules = () => {
  var requiredAttributes = ['fos_user_id', 'cases'];

  var validationRules = [];
  for (let attribute of requiredAttributes) {
    validationRules.push(
      check(attribute).notEmpty().withMessage(`${attribute} is required`),
    );
  }

  validationRules.push(
    check('cases').custom((cases, { req }) => {
      // If cases is an object, convert it to an array
      if (typeof cases === 'object' && !Array.isArray(cases)) {
        req.body.cases = [cases];
      }
      for (let caseObj of req.body.cases) {
        if (!caseObj.collection_id) {
          throw new Error('Collection ID is missing for a case');
        }
      }
      return true;
    }),
  );

  return validationRules;
};

const deassignCasesValidationRules = () => {
  var requiredAttributes = ['cases'];

  var validationRules = [];
  for (let attribute of requiredAttributes) {
    validationRules.push(
      check(attribute).notEmpty().withMessage(`${attribute} is required`),
    );
  }

  validationRules.push(
    check('cases').custom((cases, { req }) => {
      // If cases is an object, convert it to an array
      if (typeof cases === 'object' && !Array.isArray(cases)) {
        req.body.cases = [cases];
      }
      for (let caseObj of req.body.cases) {
        if (!caseObj.collection_id) {
          throw new Error('Collection ID is missing for a case');
        }
      }
      return true;
    }),
  );

  return validationRules;
};

const getCollIdByLmsIdsRules = () => {
  var requiredAttributes = ['cases'];

  var validationRules = [];
  for (let attribute of requiredAttributes) {
    validationRules.push(
      check(attribute).notEmpty().withMessage(`${attribute} is required`),
    );
  }

  validationRules.push(
    check('cases').custom((cases, { req }) => {
      // If cases is an object, convert it to an array
      if (typeof cases === 'object' && !Array.isArray(cases)) {
        req.body.cases = [cases];
      }
      for (let caseObj of req.body.cases) {
        if (!caseObj.lms_id) {
          throw new Error('LMS ID is missing for a case');
        }
      }
      return true;
    }),
    check('status')
      .optional()
      .custom(async (value) => {
        const validCaseStatus = [
          statusTypes.OPEN,
          statusTypes.ONGOING,
          statusTypes.CLOSED,
        ];
        if (!validCaseStatus.includes(value)) {
          throw new Error('Invalid case status value');
        }
        return true;
      }),
  );

  return validationRules;
};

const casesSelectedValidationRules = () => {
  var requiredAttributes = ['cases'];

  var validationRules = [];
  for (let attribute of requiredAttributes) {
    validationRules.push(
      check(attribute).notEmpty().withMessage(`${attribute} is required`),
    );
  }

  validationRules = [
    ...validationRules,
    check('cases').custom((cases, { req }) => {
      // If cases is an object, convert it to an array
      if (typeof cases === 'object' && !Array.isArray(cases)) {
        req.body.cases = [cases];
      }
      for (let caseObj of req.body.cases) {
        if (!caseObj.collection_id) {
          throw new Error('Collection ID is missing for a case');
        }
      }
      return true;
    }),
    check('status')
      .optional()
      .custom(async (value) => {
        const validCaseStatus = [
          statusTypes.OPEN,
          statusTypes.ONGOING,
          statusTypes.CLOSED,
        ];
        if (!validCaseStatus.includes(value)) {
          throw new Error('Invalid case status value');
        }
        return true;
      }),
    check('limit').optional().isNumeric().withMessage('Limit must be a number'),
    check('page').optional().isNumeric().withMessage('Page must be an number'),
    check('sortBy')
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
    check('populate')
      .optional()
      .custom(async (value) => {
        const populatePath = value.split(',');
        const schema = Case.schema.obj;
        populatePath.forEach((element) => {
          if (!(element in schema)) {
            throw new Error(`Invalid populate path. ${element}`);
          }
        });
        return true;
      }),
  ];

  return validationRules;
};

module.exports = {
  assignCasesValidationRules,
  getCollIdByLmsIdsRules,
  casesSelectedValidationRules,
  deassignCasesValidationRules,
};

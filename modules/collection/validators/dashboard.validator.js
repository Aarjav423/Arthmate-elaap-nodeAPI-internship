const { check, query } = require('express-validator');
const { ActivityLog } = require('../models');
const { isValidDate } = require('../utils/helpers');

const fetchDashboardSummaryValidationRules = () => {
  const validationRules = [
    query("limit").optional().isNumeric().withMessage("Limit must be a number"),
    query("page").optional().isNumeric().withMessage("Page must be an number"),
    query("sortBy")
      .optional()
      .custom(async (value) => {
        const sortParameter = value.split(':');

        if (sortParameter[0] != "name") {
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
    query('assigned_start_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in assigned_start_date query paramter');
        }
        return true;
      }),
    query('assigned_end_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in assigned_end_date query paramter');
        }
        return true;
      }),
  ]

  return validationRules;
}
const fetchDashboardOverviewValidationRules = () => {
  const validationRules = [
    query('start_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in start_date query parameter');
        }
        return true;
      }),
    query('end_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in end_date query parameter');
        }
        return true;
      }),
    query('company_code')
      .optional()
      .isString().withMessage("Invalid company code."),
  ]
  return validationRules;
}

const fetchDashboardDepositionStatusPercentagehValidationRules = () => {
  const validationRules = [
    query('start_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in start_date query parameter');
        }
        return true;
      }),
    query('end_date')
      .optional()
      .custom(async (value) => {
        if (!isValidDate(value)) {
          throw new Error('Invalid date in end_date query parameter');
        }
        return true;
      }),
    query('company_code')
      .optional()
      .isString().withMessage("Invalid company code."),
  ]
  return validationRules;
}


module.exports = {
  fetchDashboardSummaryValidationRules,
  fetchDashboardOverviewValidationRules,
  fetchDashboardDepositionStatusPercentagehValidationRules
};

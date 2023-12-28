const { query } = require('express-validator');

const fetchLocationPincodesValidationRules = () => {
  const validationRules = [
    query('q').notEmpty().withMessage('q is required'),
  ];

  return validationRules;
};

module.exports = {
  fetchLocationPincodesValidationRules,
};

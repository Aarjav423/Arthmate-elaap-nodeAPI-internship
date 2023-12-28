const { check, query } = require('express-validator');
const { User } = require('../models');
const { isValidMongooseId } = require('../utils/helpers');
const { default: mongoose } = require('mongoose');

/**
 * @returns fetch fos user validation rules object
 */
const fetchUserValidationRules = () => {
  const validationRules = [
    query('name').optional().isString().withMessage('Name must be a string'),
    query('pagination').optional().custom(async (value) => {
      if(!["true", "false"].includes(value)){
        throw new Error ("Invalid pagination parameter");
      }
      return true;
    }),
    query('limit').optional().isNumeric().withMessage('Limit must be a number'),
    query('page').optional().isNumeric().withMessage('Page must be an number'),
    query('sortBy')
      .optional()
      .custom(async (value) => {
        const sortParameter = value.split(':');
        const schema = User.schema.obj;
        if (!(sortParameter[0] in schema)) {
          throw new Error('Invalid sort parameter');
        }
        if (sortParameter.length > 1 && sortParameter[1] != 'desc') {
          throw new Error('Invalid sort parameter');
        }
        return true;
      }),
    query('populate')
      .optional()
      .custom(async (value) => {
        const populatePath = value.split(',');
        const schema = User.schema.obj;
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

/**
 *
 * @returns fetch fos user by id validation rules object
 */
const fetchUserByIdValidationRules = () => {
  const validationRules = [];

  return validationRules;
};

/**
 *
 * @returns create fos user validation rules object
 */
const createUserValidationRules = () => {
  var requiredAttributes = [
    'name',
    'email',
    'mobile',
    'address_line_1',
    'pincode',
    'city',
    'district',
    'state',
    'collection_agency_id',
  ];

  var validationRules = [];
  for (let attribute of requiredAttributes) {
    validationRules.push(
      check(attribute).notEmpty().withMessage(`${attribute} is required`),
    );
  }

  validationRules = [
    ...validationRules,
    check('mobile')
      .matches('^([7-9]{1})([0-9]{9})$')
      .withMessage('Mobile number is invalid.'),
    check('email')
      .matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$')
      .withMessage('email is invalid.'),
    check('pincode')
      .isNumeric()
      .withMessage('Pincode must be a non-negative integer')
      .isLength({ min: 6, max: 6 })
      .withMessage('Pincode must be exactly 6 digits'),

    check('address_line_1')
      .isLength({ max: 255 })
      .withMessage('Address cannot be greater than 255 characters '),
    check('address_line_2')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address cannot be greater than 255 characters '),
    check('city')
      .isLength({ max: 255 })
      .withMessage('City cannot be greater than 255 characters '),
    check('district')
      .isLength({ max: 255 })
      .withMessage('District cannot be greater than 255 characters '),
    check('state')
      .isLength({ max: 255 })
      .withMessage('State cannot be greater than 255 characters '),
  ]; //add more rules

  return validationRules;
};

const updateUserValidationRules = () => {
  var validationRules = [];

  validationRules = [
    ...validationRules,
    check('mobile')
      .optional()
      .matches('^([7-9]{1})([0-9]{9})$')
      .withMessage('Mobile number is invalid.'),
    check('email')
      .optional()
      .matches('[a-z0-9]+@[a-z]+.[a-z]{2,3}')
      .withMessage('Email is invalid.'),
    check('isUpdatePassword')
      .optional()
      .isBoolean()
      .withMessage('isUpdatePassword must be a boolean value.'),
    check('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value.'),
    check('pincode')
      .optional()
      .isNumeric()
      .withMessage('Pincode must be a non-negative integer')
      .isLength({ min: 6, max: 6 })
      .withMessage('Pincode must be exactly 6 digits'),
    check('address_line_1')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address cannot be greater than 255 characters '),
    check('address_line_2')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address cannot be greater than 255 characters '),
    check('city')
      .optional()
      .isLength({ max: 255 })
      .withMessage('City cannot be greater than 255 characters '),
    check('district')
      .optional()
      .isLength({ max: 255 })
      .withMessage('District cannot be greater than 255 characters '),
    check('state')
      .optional()
      .isLength({ max: 255 })
      .withMessage('State cannot be greater than 255 characters '),
  ];

  return validationRules;
};

module.exports = {
  fetchUserValidationRules,
  fetchUserByIdValidationRules,
  createUserValidationRules,
  updateUserValidationRules,
};

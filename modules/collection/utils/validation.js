const { validationResult } = require('express-validator');
const httpStatus = require('http-status');
const catchAsync = require('./catchAsync');
const ApiError = require('./ApiError');

/**
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns validates req attributes
 */
const validate = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = {};
  errors.array().map((err) => {
    if (!extractedErrors[err.param]) {
      extractedErrors[err.param] = err.msg;
    }
  });

  throw new ApiError(
    httpStatus.BAD_REQUEST,
    'There is some error in payload',
    extractedErrors,
  );
});

module.exports = {
  validate,
};

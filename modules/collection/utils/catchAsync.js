const httpStatus = require('http-status');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.log("error",err);
    return res
      .status(
        err.statusCode ? err.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      )
      .send(
        err.statusCode
          ? {
              success: false,
              statusCode: err.statusCode,
              message: err.err_message,
              errors:
                Object.keys(err.errors).length === 0 &&
                err.errors.constructor === Object
                  ? undefined
                  : err.errors,
              isOperational: err.isOperational,
              stack: err.showStack ? err.stack : undefined,
            }
          : {
              success: false,
              message: `Something went wrong`,
            },
      );
  });
};

module.exports = catchAsync;

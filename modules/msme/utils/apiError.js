class ApiError extends Error {
  constructor(
    statusCode,
    message,
    errors = {},
    isOperational = true,
    stack = '',
    showStack = false,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.err_message = message;
    this.showStack = showStack;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;

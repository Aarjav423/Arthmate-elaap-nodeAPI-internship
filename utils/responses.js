/*SEND SUCCESS RESPONSE*/
const successResponse = (req, res, data = {}) => {
  return res.send({
    error: false,
    success: true,
    data: data,
  });
};

/*SEND FAIL RESPONSE*/
const failResponse = (req, res, data = {}, message) => {
  return res.status(400).send({
    error: false,
    success: false,
    data: data,
    message: message,
  });
};

/*SEND ERROR RESPONSE*/
const errorResponse = (req, res, errorDesc, errorKey, resCode = 400) => {
  return res.status(resCode).send({
    error: true,
    errorKey,
    error: errorDesc,
    message: errorDesc.message,
    errorStack: errorDesc.stack,
  });
};

module.exports = {
  successResponse,
  failResponse,
  errorResponse,
};

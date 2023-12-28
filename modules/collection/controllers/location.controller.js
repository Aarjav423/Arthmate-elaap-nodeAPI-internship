const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status');
const { locationService } = require('../services');

const getLocationPincodes = catchAsync(async (req, res) => {
  const { q } = req.query;

  const sanitizedPincode = q.toString();

  const result = await locationService.queryLocationPincodes(sanitizedPincode);

  return res.status(httpStatus.OK).send(result);
});

module.exports = {
  getLocationPincodes,
};

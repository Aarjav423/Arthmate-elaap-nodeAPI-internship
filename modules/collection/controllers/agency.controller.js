const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { agencyService } = require('../services');

const getAgencies = catchAsync(async (req, res) => {
  const result = await agencyService.queryAgencies(req.query);
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Something went wrong');
  }

  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Agencies data fetched successfully.',
    data: result,
  });
});

const createAgency = catchAsync(async (req, res) => {
  const newAgency = await agencyService.createAgency(req.body);
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'New agency created successfully.',
    data: newAgency,
  });
});

const updateAgency = catchAsync(async (req, res) => {
  const { agencyId } = req.params;
  const UpdatedAgencyResult = await agencyService.updateAgency(agencyId, req.body);
  return res.status(httpStatus.OK).send(UpdatedAgencyResult)
});

module.exports = {
  getAgencies,
  createAgency,
  updateAgency,
};

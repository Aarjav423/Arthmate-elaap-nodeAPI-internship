const catchAsync = require('../utils/catchAsync');
const { User } = require('../models');
const { dashboardService, userService } = require('../services');
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

const getDashboardSummary = catchAsync(async (req, res) => {
  const queryFilter = pick(req.query, [
    'fosAgent',
    'assigned_start_date',
    'assigned_end_date',
    'company_code'
  ]);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await dashboardService.queryDashboardSummary(
    queryFilter,
    options,
  );

  res.send({
    success: true,
    message: 'Summary data fetched successfully.',
    data: result,
  });
});

const getDepositionStatusPercentage = catchAsync(async (req, res) => {
  const query = req.query; 
  const result =
    await dashboardService.getDepositionStatusPercentages(query); 

  res.send({
    success: true,
    message: 'Deposition summary fetched successfully.',
    data: result,
  });
});

const getDashboardOverview = catchAsync(async (req, res) => {
  const dashboardOverview = await dashboardService.dashboardOverview(req.query);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Case Overview fetch successfully.',
    data: dashboardOverview,
  });
});

module.exports = {
  getDashboardSummary,
  getDepositionStatusPercentage,
  getDashboardOverview
};

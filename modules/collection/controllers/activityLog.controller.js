const catchAsync = require('../utils/catchAsync');
const { activityLogService } = require('../services');
const { activityTypes } = require('../config/activity');

const httpStatus = require('http-status');

const getActivityLogs = catchAsync(async (req, res) => {
  const collectionId = req.params.collectionId;
  const result = await activityLogService.getActivityLogsByCollectionId(
    collectionId,
    req.query,
  );
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Activity logs fetched successfully.',
    data: result,
  });
});

const viewLoanDocumentLogs = catchAsync(async (req, res) => {
  const data = req.body;
  data.event_type = activityTypes.ADMIN_OPS;
  data.description = `Admin viewed the document.`;
  const result = await activityLogService.createLog(data);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Document view log created successfully.',
    data: result,
  });
});

module.exports = {
  getActivityLogs,
  viewLoanDocumentLogs,
};

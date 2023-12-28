const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Case, ActivityLog } = require('../models');
const { formatDate } = require('../utils/helpers');
const { statusTypes } = require('../config/collection');
const pick = require('../utils/pick');

/**
 *
 * @param {*} data
 * @returns  {*} creates a new object in activtyLog collections
 */
const createLog = async (data) => {
  var description = '';

  if (!data.event_type) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Please provide valid event type',
    );
  }

  if (!data.manager_id &&!data.userID._id ){
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      'There should be manager ID associated with this log',
    );
  }

  const activityPayload = {
    eventType: data.event_type,
    description: data.description,
    manager_id: data.manager_id || data.userID._id,
  };

  if (data.fos_id) activityPayload.user = data.fos_id;
  if (data.lms_id) activityPayload.lms_id = data.lms_id;
  if (data.case_id) activityPayload.case_id = data.case_id;
  if (data.status) activityPayload.status = data.status;

  const udpatedActivityLog = await ActivityLog.create(activityPayload);

  return udpatedActivityLog;
};

const getActivityLogsByCollectionId = async (collectionId, query) => {
  if (!collectionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Collection ID is required');
  }
  const collection = await Case.findOne({ coll_id: collectionId });
  if (!collection) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'This collection ID does not exist in our system.',
    );
  }
  let filter = { case_id: collectionId };
  let options = {};
  options = pick(query, ['sortBy', 'limit', 'page', 'populate']);
  const activityLogs = await ActivityLog.paginate(filter, options);
  return activityLogs;
};

module.exports = {
  createLog,
  getActivityLogsByCollectionId,
};

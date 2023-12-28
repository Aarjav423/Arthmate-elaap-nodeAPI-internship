const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { activityTypes } = require('../config/activity');
const { statusTypes, depositionStatusTypes } = require('../config/collection');

const activityLogSchema = mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        activityTypes.PAYMENT,
        activityTypes.VISIT,
        activityTypes.LOGIN,
        activityTypes.LOGOUT,
        activityTypes.ADMIN_OPS
      ],
      required: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'coll_users',
    },
    description: {
      type: String,
    },
    lms_id: {
      type: String,
    },
    case_id: {
      type: String,
    },
    manager_id: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        statusTypes.OPEN,
        statusTypes.CLOSED,
        statusTypes.ONGOING,
        statusTypes.PARTIALLY_PAID,
      ],
    },
    deposition_status: {
      type: String,
      enum: [
        depositionStatusTypes.PTP,
        depositionStatusTypes.BROKEN_PTP,
        depositionStatusTypes.DISPUTE,
        depositionStatusTypes.RTP,
        depositionStatusTypes.SHIFTED,
        depositionStatusTypes.SETTLEMENT,
        depositionStatusTypes.ADDRESS_NOT_FOUND,
        depositionStatusTypes.VISIT_PENDING,
        depositionStatusTypes.VISIT_SCHEDULED,
      ],
    },
    slot_id: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

// add plugin that converts mongoose to json
activityLogSchema.plugin(toJSON);
activityLogSchema.plugin(paginate);

/**
 * @typedef ActivityLog
 */
const ActivityLog = mongoose.model('coll_activity_logs', activityLogSchema);

module.exports = ActivityLog;

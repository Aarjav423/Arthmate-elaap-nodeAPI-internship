const mongoose = require('mongoose');
const { ActivityLogConstant } = require('../constants');

const activityLogsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [ActivityLogConstant.Types.ACTIVITY, ActivityLogConstant.Types.REMARKS, ActivityLogConstant.Types.CREDIT_UPDATE ],
      required: true,
    },
    updated_by: {
      type: Number,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [...Object.values(ActivityLogConstant.CategoryTypes)],
      required: true,
    },
    loan_app_id: {
      type: String,
      required: function () {
        return this.type === ActivityLogConstant.Types.REMARKS;
      },
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

/**
 * @typedef ActivityLog
 */
const ActivityLog = mongoose.model('msme_activity_logs', activityLogsSchema);

module.exports = ActivityLog;

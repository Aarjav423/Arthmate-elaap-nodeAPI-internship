const { BaseService } = require('../common');
const { ActivityLogs } = require('../models');

class ActivityLogsService extends BaseService {
  constructor() {
    super(ActivityLogs);
  }

  getByLoanAppId = async (loanAppId) => {
    const ActivityLogs = this.model
      .find({ loan_app_id: loanAppId })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'updated_by',
        select: 'username email',
      });
    return ActivityLogs;
  };
}

module.exports = ActivityLogsService;

const { check, validationResult } = require('express-validator');
const { BaseController } = require('../../common');
const { ActivityLogService } = require('../../services');

class GetActivityLogsController extends BaseController {
  constructor(request, response, activityLogService) {
    super(request, response);
    this.activityLogService = activityLogService;
  }

  async validate() {
    await Promise.all([
      check('loan_app_id')
        .exists()
        .withMessage('Loan_app_id is required')
        .isString()
        .withMessage('Loan_app_id must be a string')
        .notEmpty()
        .withMessage('Loan_app_id cannot be empty'),
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { loan_app_id } = this.request.params;
      const activityLogs = await this.activityLogService.getByLoanAppId(loan_app_id);
      return activityLogs;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let getActivityLogsController = new GetActivityLogsController(
      request,
      response,
      new ActivityLogService(),
    );
    return getActivityLogsController;
  }
}

module.exports = GetActivityLogsController;

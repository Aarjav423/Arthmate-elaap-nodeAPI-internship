const httpStatus = require('http-status');
const { query, check, validationResult } = require('express-validator');
const { ActivityLogService } = require('../../services');
const { BaseController } = require('../../common');
const { ActivityLogConstant } = require('../../constants');

class ActivityLogsController extends BaseController {
  constructor(request, response, activityLogService) {
    super(request, response);
    this.activityLogService = activityLogService;
  }
  async validate() {
    await Promise.all([
      check('type').isIn([ActivityLogConstant.Types.REMARKS, ActivityLogConstant.Types.ACTIVITY, ActivityLogConstant.Types.CREDIT_UPDATE]).withMessage('Invalid type').run(this.request),
      check('remarks').notEmpty().isString().withMessage('Invalid remarks').run(this.request),
      check('category')
        .isIn([...Object.values(ActivityLogConstant.CategoryTypes)])
        .run(this.request),
      check('loan_app_id').if(check('type').equals(ActivityLogConstant.Types.REMARKS)).notEmpty().withMessage('Loan_app_id is mandatory for remarks type').isString().withMessage('Invalid loan_app_id').run(this.request),
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { type, remarks, loan_app_id, category } = this.request.body;
      const activityLog = await this.activityLogService.create({
        type,
        updated_by: user_id,
        remarks,
        loan_app_id,
        category,
      });
      const response = {
        message: 'Comment added successfully',
        data: activityLog,
      };

      return response;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let activityLogsController = new ActivityLogsController(request, response, new ActivityLogService());
    return activityLogsController;
  }
}

module.exports = ActivityLogsController;

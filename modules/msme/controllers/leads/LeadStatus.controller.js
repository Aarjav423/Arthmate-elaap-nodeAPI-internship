const httpStatus = require('http-status');

const { LoanRequestService, ActivityLogService, SectionStatusService, EmailSendService } = require('../../services');
const { BaseController } = require('../../common');
const { leadConstant, ActivityLogConstant } = require('../../constants');
const { param, check, validationResult } = require('express-validator');
const { toLower } = require('lodash');
const moment = require('moment');

class LeadStatusController extends BaseController {
  constructor(request, response, loanRequestService, activityLogService, sectionStatusService, emailSendService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.activityLogService = activityLogService;
    this.sectionStatusService = sectionStatusService;
    this.emailSendService = emailSendService
  }

  async validate() {
    await Promise.all([param('loan_app_id').optional().isString().withMessage('Loan App ID must be a string').run(this.request), check('remarks').isString().withMessage('remarks is a required field.').run(this.request), param('status').isIn(Object.values(leadConstant.leadStatus)).optional().isString().withMessage('Status must be a string').run(this.request)]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { loan_app_id, status } = this.request.params;
      const remarks = this.request.body.remarks;
      let queryData = {
        lead_status: status,
        status: status,
      };

      let auditStatus = status;

      if (status == 'pending') {
        auditStatus = ActivityLogConstant.CategoryTypes.LEAD_REQUEST_UPDATE;
        await this.sectionStatusService.updateSectionStatus({ loan_app_id: loan_app_id, section_status: 'deviation' }, 'in_progress');
        this.emailSendService.sendStatusChangeEmail(loan_app_id)
      } else if (status == 'rejected') {
        auditStatus = ActivityLogConstant.CategoryTypes.LEAD_REJECT;
        queryData = {
          ...queryData,
          is_deleted: 1,
          delete_date_timestamp: Date.now(),
          deleted_by: user_id,
          loan_status: 'rejected',
          reason: remarks,
          updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        };
        this.emailSendService.sendStatusChangeEmail(loan_app_id)

      }

      await this.loanRequestService.updateByLoanAppId(loan_app_id, queryData);

      await this.activityLogService.create({
        type: 'remarks',
        updated_by: user_id,
        remarks: remarks,
        loan_app_id: loan_app_id,
        category: auditStatus,
      });

      return { message: 'Updated successfully', success: true };
    } catch (error) {
      console.log('Errors', error);
      throw error;
    }
  }

  static create(request, response) {
    let leadStatusController = new LeadStatusController(request, response, new LoanRequestService(), new ActivityLogService(), new SectionStatusService(), new EmailSendService());
    return leadStatusController;
  }
}

module.exports = LeadStatusController;

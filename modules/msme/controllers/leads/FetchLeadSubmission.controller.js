const httpStatus = require('http-status');
const { check, query, param, validationResult } = require('express-validator');

const { LeadSubmissionService } = require('../../services');
const { BaseController } = require('../../common');

class FetchLeadSubmissionController extends BaseController {
  constructor(request, response, leadSubmissionService) {
    super(request, response);
    this.leadSubmissionService = leadSubmissionService;
  }

  async validate() {
    await Promise.all([
      param('loan_app_id')
        .notEmpty()
        .withMessage('Loan_app_id cannot be empty')
        .isString()
        .withMessage('Loan_app_id must be a string'),
      param('sequence')
        .notEmpty()
        .withMessage('sequence is required')
        .isString()
        .withMessage('sequence must be a string'),
      param('code')
        .notEmpty()
        .withMessage('code is required')
        .isString()
        .withMessage('code must be a string'),
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { loan_app_id, code, sequence } = this.request.params;
      const leadSubmission = await this.leadSubmissionService.findOne({
        loan_app_id,
        code,
        sequence: String(sequence),
      });

      if (!leadSubmission) {
        throw {
          success: false,
          message:
            "Lead-Submission doesn't exist for te given loan_app_id, sequence and code",
        };
      }
      return {
        status: leadSubmission.status,
        remarks: leadSubmission.remarks,
        loan_app_id: leadSubmission.loan_app_id,
      };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let fetchLeadSubmissionController = new FetchLeadSubmissionController(
      request,
      response,
      new LeadSubmissionService(),
    );
    return fetchLeadSubmissionController;
  }
}

module.exports = FetchLeadSubmissionController;

const { query, check, validationResult } = require('express-validator');
const { ActivityLogService, SectionStatusService } = require('../../services');
const { BaseController } = require('../../common');
const { ActivityLogConstant } = require('../../constants');
const { leadSectionName } = require('../../constants/lead.constant');

class LeadSectionStausUpdateController extends BaseController {
  constructor(request, response, activityLogService, sectionStatusService) {
    super(request, response);
    this.activityLogService = activityLogService;
    this.sectionStatusService = sectionStatusService;
  }
  async validate() {
    await Promise.all([
      check('status')
        .isIn(['in_progress', 'deviation', 'approved', 'rejected'])
        .withMessage('Invalid status')
        .run(this.request),
      check('sequence').isNumeric().run(this.request),
      check('type')
        .isIn([
          ActivityLogConstant.Types.REMARKS,
          ActivityLogConstant.Types.ACTIVITY,
        ])
        .withMessage('Invalid type')
        .run(this.request),
      check('remarks')
        .notEmpty()
        .isString()
        .withMessage('Invalid remarks')
        .run(this.request),
      check('category')
        .notEmpty()
        .isIn([
          ActivityLogConstant.CategoryTypes.PRIMARY_APPLICANT,
          ActivityLogConstant.CategoryTypes.COAPPLICANT_DETAILS,
          ActivityLogConstant.CategoryTypes.ENTITY_DETAILS,
          ActivityLogConstant.CategoryTypes.GUARANTOR_DETAILS,
          ActivityLogConstant.CategoryTypes.FINANCIAL_DOCS,
          ActivityLogConstant.CategoryTypes.ADDITIONAL_DOCS,
        ])
        .run(this.request),
      check('loan_app_id')
        .notEmpty()
        .withMessage('Loan_app_id is mandatory for remarks type')
        .isString()
        .withMessage('Invalid loan_app_id')
        .run(this.request),
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
      const { type, remarks, category, status, sequence } = this.request.body;
      const { loan_app_id } = this.request.params;


      const activityLog = await this.activityLogService.create({
        type,
        updated_by: user_id,
        remarks,
        sequence,
        loan_app_id,
        category,
      });
      let name = category;

      await this.sectionStatusService.update(
        {
          section_code: name,
          loan_app_id,
          section_sequence_no: sequence,
        },
        { section_remarks: remarks, section_status: status },
      );
      return { message: 'Status updated Successfully', activityLog };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadSectionStausUpdateController = new LeadSectionStausUpdateController(
      request,
      response,
      new ActivityLogService(),
      new SectionStatusService(),
    );
    return leadSectionStausUpdateController;
  }
}

module.exports = LeadSectionStausUpdateController;

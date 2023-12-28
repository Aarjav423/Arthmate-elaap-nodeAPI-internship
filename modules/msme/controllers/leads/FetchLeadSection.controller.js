const httpStatus = require('http-status');
const { check, query, param, validationResult } = require('express-validator');

const { SectionStatusService } = require('../../services');
const { BaseController } = require('../../common');

class FetchLeadSectionController extends BaseController {
  constructor(request, response, sectionStatusService) {
    super(request, response);
    this.sectionStatusService = sectionStatusService;
  }

  async validate() {
    await Promise.all([
      param('loan_app_id')
        .exists()
        .withMessage('Loan_app_id is required')
        .isString()
        .withMessage('Loan_app_id must be a string')
        .notEmpty()
        .withMessage('Loan_app_id cannot be empty'),
      query('sequence')
        .exists()
        .withMessage('sequence is required')
        .isString()
        .withMessage('sequence must be a string')
        .notEmpty()
        .withMessage('sequence cannot be empty')
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
      let query = { loan_app_id };
      const { section_sequence_no } = this.request.query;
      if (section_sequence_no) {
        query = { ...query, section_sequence_no };
      }
      const leadSections = await this.sectionStatusService.findAll(query);

      if (!leadSections.length) {
        throw {
          success: false,
          message:
            "Lead-Section doesn't exist for te given loan_app_id, sequence and name",
        };
      }
      
      return leadSections;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let fetchLeadSectionController = new FetchLeadSectionController(
      request,
      response,
      new SectionStatusService(),
    );
    return fetchLeadSectionController;
  }
}

module.exports = FetchLeadSectionController;

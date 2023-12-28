const httpStatus = require('http-status');
const { check, validationResult } = require('express-validator');

const { LoanRequestService } = require('../../services');
const { BaseController } = require('../../common');

class LeadExportController extends BaseController {
  constructor(request, response, loanRequestService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
  }

  async validate() {
    await Promise.all([
      check('company_id')
        .isNumeric()
        .withMessage('company_id is a required field.')
        .run(this.request),
      check('product_id')
        .isNumeric()
        .withMessage('product_id is a required field.')
        .run(this.request),
      check('from_date')
        .optional()
        .isDate()
        .withMessage('from date must be a date')
        .run(this.request),
      check('to_date')
        .optional()
        .isDate()
        .withMessage('To date must be a date')
        .run(this.request),
      check('limit')
        .optional()
        .isNumeric()
        .withMessage('Limit must be a number')
        .run(this.request),
      check('page')
        .optional()
        .isNumeric()
        .withMessage('Page must be a number')
        .run(this.request),
      check('book_entity_id')
        .optional()
        .isNumeric()
        .withMessage('book_entity_id must be a number')
        .run(this.request),
      check('status')
        .optional()
        .isString()
        .withMessage('status must be a string')
        .run(this.request),
      check('str')
        .optional()
        .isString()
        .withMessage('str must be a string')
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
      const {
        company_id,
        product_id,
        from_date,
        to_date,
        str,
        book_entity_id,
        status,
      } = this.request.body;
      if (String(this.request.company._id) !== String(company_id))
        throw {
          message: 'Lead id is not associated with company',
        };
      if (String(this.request.product._id) !== String(product_id))
        throw {
          message: 'Lead id is not associated with product',
        };

      let leads = await this.loanRequestService.exportData({
        company_id,
        product_id,
        from_date,
        to_date,
        str,
        book_entity_id,
        status,
      });

      if (!leads || !leads.length)
        throw {
          message: 'No records found.',
        };

      return leads;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadExportController = new LeadExportController(
      request,
      response,
      new LoanRequestService(),
    );
    return leadExportController;
  }
}

module.exports = LeadExportController;

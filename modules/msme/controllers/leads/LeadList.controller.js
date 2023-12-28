const httpStatus = require('http-status');
const { query, validationResult } = require('express-validator');

const { LoanRequestService } = require('../../services');
const { BaseController } = require('../../common');

class LeadListController extends BaseController {
  constructor(request, response, loanRequestService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
  }

  async validate() {
    await Promise.all([
      query('company_id')
        .optional()
        .isNumeric()
        .withMessage('Company ID must be a number')
        .run(this.request),
      query('product_id')
        .optional()
        .isNumeric()
        .withMessage('Product ID must be a number')
        .run(this.request),
      query('from_date')
        .optional()
        .isDate()
        .withMessage('from date must be a date')
        .run(this.request),
      query('to_date')
        .optional()
        .isDate()
        .withMessage('To date must be a date')
        .run(this.request),
      query('limit')
        .optional()
        .isNumeric()
        .withMessage('Limit must be a number')
        .run(this.request),
      query('page')
        .optional()
        .isNumeric()
        .withMessage('Page must be a number')
        .run(this.request),
      query('status')
        .optional()
        .isString()
        .withMessage('status must be a string')
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
      const { company_id, product_id } = this.request.authData;
      const { to_date, from_date, limit, page, status, str } =
        this.request.query;
      const queryData = {
        company_id,
        product_id,
        ...(to_date !== undefined && to_date !== null && { to_date }),
        ...(from_date !== undefined && from_date !== null && { from_date }),
        ...(limit !== undefined && limit !== null && { limit }),
        ...(page !== undefined && page !== null && { page }),
        ...(status !== undefined && status !== null && { status }),
      };
      return await this.loanRequestService.fetchLeadsList(queryData);
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadListController = new LeadListController(
      request,
      response,
      new LoanRequestService(),
    );
    return leadListController;
  }
}

module.exports = LeadListController;

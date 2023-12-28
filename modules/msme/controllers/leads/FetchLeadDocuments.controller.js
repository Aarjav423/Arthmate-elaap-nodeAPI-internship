const httpStatus = require('http-status');
const { check, validationResult } = require('express-validator');

const { LoanRequestService, LoanDocumentService } = require('../../services');
const { BaseController } = require('../../common');
const { leadSectionStatus } = require('../../constants/lead.constant');

class FetchLeadDocumentsController extends BaseController {
  constructor(request, response, loanRequestService,loanDocumentService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.loanDocumentService = loanDocumentService;
  }

  async validate() {
    await Promise.all([]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();

      const { loan_app_id: loanAppId } = this.request.params;
      const {borrower_id: borrowerId} = this.request.query;
      let code=this.request.query.code || null
      // common loan Documents Check
      //If document code is provided

      const loanResponse =
        await this.loanRequestService.fetchLeadByLoanAppId(loanAppId);

      if (!loanResponse)
        throw {
          success: false,
          message:
            'loan app id does not exist.',
          loan_app_id: loanAppId,
        };

        const loanDocumentResponse =
        await this.loanDocumentService.fetchLoanDocuments(loanAppId,code,borrowerId);

      if (!loanDocumentResponse)
        throw {
          success: false,
          message:
            'Loan documents are not uploaded against provided loan_app_id',
          loan_app_id: loanAppId,
        };

      return loanDocumentResponse;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let fetchLeadDocumentsController = new FetchLeadDocumentsController(
      request,
      response,
      new LoanRequestService(),
      new LoanDocumentService()
    );
    return fetchLeadDocumentsController;
  }
}

module.exports = FetchLeadDocumentsController;

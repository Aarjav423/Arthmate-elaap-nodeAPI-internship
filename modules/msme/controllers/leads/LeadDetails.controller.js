const httpStatus = require('http-status');
const { check, validationResult } = require('express-validator');

const { LoanRequestService } = require('../../services');
const { BaseController } = require('../../common');
const { LeadDetailsSerialize } = require('../../serializers');

class LeadDetailsController extends BaseController {
  constructor(request, response, loanRequestService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
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
      const { loan_app_id: loanAppId } = this.request.params

      let leadData = await this.loanRequestService.fetchLeadDetails(loanAppId);

      if(!leadData){
        throw {
          success:false,
          message: 'Loan App Id associated with lead is not valid'
        }
      }
      const serializedData= LeadDetailsSerialize(leadData);
      return serializedData[0];

    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadDetailsController = new LeadDetailsController(
      request,
      response,
      new LoanRequestService(),
    );
    return leadDetailsController;
  }
}

module.exports = LeadDetailsController;

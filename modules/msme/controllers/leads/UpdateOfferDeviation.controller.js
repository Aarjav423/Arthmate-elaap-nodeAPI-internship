const { LoanRequestService, ActivityLogService, OfferDetailService, EmailSendService } = require('../../services');
const { BaseController } = require('../../common');
const { param, check, validationResult } = require('express-validator');
const { toLower } = require('lodash');
const { leadStatus } = require('../../constants/lead.constant');

class UpdateOfferDeviationController extends BaseController {
  constructor(request, response, loanRequestService, activityLogService, offerDetailService, emailSendService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.activityLogService = activityLogService;
    this.offerDetailService = offerDetailService;
    this.emailSendService = emailSendService
  }

  async validate() {
    await Promise.all([
      param('loan_app_id').optional().isString().withMessage('Loan App ID must be a string').run(this.request), 
      check('remarks').if(check('action').equals('request_to_update')).notEmpty().isString().run(this.request), 
      check('action').isString().isIn(['approve', 'request_to_update']).run(this.request)]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { loan_app_id } = this.request.params;
      let {remarks, action} = this.request.body;

      let lead = await this.loanRequestService.findOne({ loan_app_id });

      let auditStatus = null;

      if (lead.lead_status !== leadStatus.OfferDeviation) {
        throw new Error('Lead is not in deviation state');
      }

      let offer = await this.offerDetailService.findOne({ loan_app_id });
      offer = offer.toJSON()

      if (!offer) {
        throw new Error('Offer not generated yet for this lead');
      }

      let result = null;

      if(!offer.risk_cat || !offer.deviation_cat){
        throw new Error("It's not valid action for this lead.")
      }


      if (action === 'request_to_update') {
        result = await this.loanRequestService.updateByLoanAppId(loan_app_id, { lead_status: leadStatus.FollowUpDoc });
        remarks = remarks;
        auditStatus = leadStatus.FollowUpDoc;
      }
      else if (offer.risk_cat.toUpperCase() === 'High_Risk'.toUpperCase()) {
        result = await this.loanRequestService.updateByLoanAppId(loan_app_id, { lead_status: leadStatus.FollowUpKyC });
        remarks = 'Lead shifted to ' + leadStatus.FollowUpKyC;
        auditStatus = leadStatus.FollowUpKyC;
      } else if (offer.risk_cat.toUpperCase() === 'Low_Risk'.toUpperCase() || offer.risk_cat.toUpperCase() === 'Med_Risk'.toUpperCase()) {
        result = await this.loanRequestService.updateByLoanAppId(loan_app_id, { lead_status: leadStatus.OfferGenerated });
        remarks = 'Lead shifted to ' + leadStatus.OfferGenerated;
        auditStatus = leadStatus.OfferGenerated;
      }
      
      await this.activityLogService.create({
        type: 'remarks',
        updated_by: user_id,
        remarks: remarks,
        loan_app_id: loan_app_id,
        category: auditStatus,
      });
      
      this.emailSendService.sendStatusChangeEmail(loan_app_id)

      return { message: 'offer updated successfully', data:result, success: true };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let updateOfferDeviationController = new UpdateOfferDeviationController(request, response, new LoanRequestService(), new ActivityLogService(), new OfferDetailService(), new EmailSendService());
    return updateOfferDeviationController;
  }
}

module.exports = UpdateOfferDeviationController;

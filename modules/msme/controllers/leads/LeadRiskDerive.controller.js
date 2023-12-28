const { LoanRequestService, ActivityLogService, OfferDetailService, LeadSectionService } = require('../../services');
const { BaseController } = require('../../common');
const { leadConstant, ActivityLogConstant } = require('../../constants');
const { check, validationResult } = require('express-validator');
const { toLower } = require('lodash');
const { leadStatus } = require('../../constants/lead.constant');
const SinglDataTranslationService = require('../../services/SingleDataTranslation.service');

class LeadRiskDeriveController extends BaseController {
  constructor(request, response, loanRequestService, activityLogService, offerDetailService, leadSectionService, singlDataTranslationService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.activityLogService = activityLogService;
    this.offerDetailService = offerDetailService;
    this.leadSectionService = leadSectionService;
    this.singlDataTranslationService = singlDataTranslationService;
  }

  async validate() {
    await Promise.all([check('loan_app_id').optional().isString().withMessage('Loan App ID must be a string').run(this.request)]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { loan_app_id } = this.request.body;

      let lead = await this.loanRequestService.findOne({ loan_app_id });
      if (!lead) {
        throw new Error(`lead doesn't exist for this loan_app_id.`);
      }
      lead = lead.toJSON();

      let offer = await this.offerDetailService.findOne({ loan_app_id });

      if (!offer) {
        throw new Error(`offer is not generated yet.`);
      }

      offer = offer.toJSON();

      let auditStatus = ActivityLogConstant.CategoryTypes.OFFER_GENERATED;

      let deviation = await this.singlDataTranslationService.findOne({ type: 'offer_deviation', key: offer.deviation_cat });
      deviation = deviation.toJSON();

      await this.offerDetailService.update({ loan_app_id }, { responsibility: deviation.value });
      if (!deviation.value && (offer.risk_cat.toUpperCase() == 'Med_Risk'.toUpperCase() || offer.risk_cat.toUpperCase() == 'Low_Risk'.toUpperCase())) {
        await this.loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferGenerated });
      } else if (!deviation.value && offer.risk_cat.toUpperCase() == 'High_risk'.toUpperCase()) {
        await this.loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.FollowUpKyC });
        await this.leadSectionService.update({ loan_app_id, section_code: 'additional_doc' }, { section_status: 'in_progress' });
      } else if (deviation.value && (offer.risk_cat.toUpperCase() == 'Med_Risk'.toUpperCase() || offer.risk_cat.toUpperCase() == 'Low_Risk'.toUpperCase())) {
        await this.loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferDeviation });
      } else {
        await this.loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferDeviation });
      }

      await this.activityLogService.create({
        type: 'remarks',
        updated_by: user_id,
        remarks: 'Offer moved to ' + auditStatus,
        loan_app_id: loan_app_id,
        category: auditStatus,
      });

      return { message: 'updated successfully', success: true };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadRiskDeriveController = new LeadRiskDeriveController(request, response, new LoanRequestService(), new ActivityLogService(), new OfferDetailService(), new LeadSectionService(), new SinglDataTranslationService());
    return leadRiskDeriveController;
  }
}

module.exports = LeadRiskDeriveController;

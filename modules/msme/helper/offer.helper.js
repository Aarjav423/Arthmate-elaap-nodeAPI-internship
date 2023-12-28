const { LoanRequestService, SingleDataTranslationService, LeadSectionService, OfferAmendService, EmailSendService } = require('../services');
const { leadStatus } = require('../constants/lead.constant');

const loanRequestService = new LoanRequestService();
const singleDataTranslationService = new SingleDataTranslationService();
const leadSectionService = new LeadSectionService();
const offerAmendService = new OfferAmendService();
const emailSendService = new EmailSendService();

const moment = require('moment');

const offerDetail = async (offer, loan_app_id, user_id, partner_loan_app_id) => {
  try {
    if (!offer.loan_amount ?? offer.loan_amount === 0) {
      let leadUpdateObj = {
        is_deleted: 1,
        delete_date_timestamp: Date.now(),
        deleted_by: user_id,
        status: leadStatus.Rejected,
        loan_status: leadStatus.Rejected,
        lead_status: leadStatus.Rejected,
        remarks: "Due to offer rejection.",
        updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        partner_loan_app_id: `${partner_loan_app_id}-D${moment().format('DDMMYYYYHHMMSS')}`,
      };
      await loanRequestService.update({ loan_app_id }, leadUpdateObj);
      return
    }

    let responsibility = await singleDataTranslationService.findOne({ type: 'offer_deviation', key: offer.deviation_cat });
    responsibility = responsibility.toJSON();
    await offerAmendService.update({ loan_app_id }, { responsibility: responsibility.value });

    if (!responsibility.value && (offer.risk_cat.toUpperCase() == 'Med_Risk'.toUpperCase() || offer.risk_cat.toUpperCase() == 'Low_Risk'.toUpperCase())) {
      await loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferGenerated });
    } else if (!responsibility.value && offer.risk_cat.toUpperCase() == 'High_risk'.toUpperCase()) {
      await loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.FollowUpKyC });
    } else if (responsibility.value && (offer.risk_cat.toUpperCase() == 'Med_Risk'.toUpperCase() || offer.risk_cat.toUpperCase() == 'Low_Risk'.toUpperCase())) {
      await loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferDeviation });
    } else {
      await loanRequestService.update({ loan_app_id }, { lead_status: leadStatus.OfferDeviation });
    }

    emailSendService.sendStatusChangeEmail(loan_app_id)

    
  } catch (error) {
    throw new Error(`offer lead status update failed: ${error}`);
  }
};

module.exports = offerDetail;

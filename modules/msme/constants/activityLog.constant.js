const Types = {
  REMARKS: 'remarks',
  ACTIVITY: 'activity',
  CREDIT_UPDATE: 'credit_update'
};

const CategoryTypes = {
  PRIMARY_APPLICANT: 'primary',
  ENTITY_DETAILS: 'entity',
  COAPPLICANT_DETAILS: 'co_borrower',
  GUARANTOR_DETAILS: 'guarantor',
  FINANCIAL_DOCS: 'financial_doc',
  ADDITIONAL_DOCS: 'additional_doc',
  OFFER_IN_PROGRESS: 'offer_in_progress',
  LEAD_REJECT: 'lead_rejected', 
  LEAD_ACCEPTED: 'lead_accepted',
  LEAD_REQUEST_UPDATE: 'lead_request_update',
  CAMS_UPDATE:'cams_update',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEW: 'new',
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  IN_PROGRESS: 'in_progress',
  LEAD_DEVIATION: 'lead_deviation',
  OFFER_GENERATED: 'offer_generated',
  OFFER_DEVIATION: 'offer_deviation',
  FOLLOW_UP_DOC: 'follow_up_doc',
  FOLLOW_UP_KYC: 'follow_up_kyc',
  AMEND_OFFER_UPDATE:'amend_offer_update',

};

  

module.exports = { Types, CategoryTypes };

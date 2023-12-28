'use strict';

const msmeRoute = '/api/msme';

const leadStatus = {
  Approved: 'approved',
  Rejected: 'rejected',
  New: 'new',
  Pending: 'pending',
  InReview: 'in_review',
  InProgress: 'in_progress',
  Active: 'active',
  Draft: 'draft',
  LeadDeviation: 'lead_deviation',
  OfferInProgress: 'offer_in_progress',
  OfferGenerated: 'offer_generated',
  OfferDeviation: 'offer_deviation',
  FollowUpDoc: 'follow_up_doc',
  FollowUpKyC: 'follow_up_kyc',
};

const leadSectionStatus = {
  IN_PROGESS: 'IN_PROGESS',
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
};

const leadSectionName = {
  PRIMARY_APPLICANT: 'primary_applicant',
  ENTITY_DETAILS: 'entity_details',
  COAPPLICANT_DETAILS: 'co-applicant_details',
  GUARANTOR_DETAILS: 'guarantor_details',
  SHAREHOLDING_PATTERN: 'shareholding_pattern',
  FINANCIAL_DOCS: 'financial_documents',
  ADDITIONAL_DOCS: 'additional_documents',
};
const CREDIT_PERMISSION = 'tag_msme_lead_view_int_read_write'

const PurposeOfLoan = {
  WORKING_CAPITAL: 'working_capital',
  BUSINESS_EXPANSION: 'business_expansion',
  PURCHASE_OF_BUSINESS_FIXED_ASSETS: 'purchase_of_business_fixed_assets',
  INVENTORY: 'inventory',
  EXPANSION_OF_PREMISES: 'expansion_of_premises',
  PERSONAL_REQUIREMENT: 'personal_requirement',
  OTHERS: 'others',
}
module.exports = {
  leadStatus,
  msmeRoute,
  leadSectionStatus,
  leadSectionName,
  CREDIT_PERMISSION,
  PurposeOfLoan,
};

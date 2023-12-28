const httpStatus = require('http-status');
const { check, validationResult } = require('express-validator');

const { LoanRequestService, SectionStatusService } = require('../../services');
const { BaseController } = require('../../common');
const { LeadReviewDetailsSerialize } = require('../../serializers');
const { leadSectionName } = require('../../constants/lead.constant');
const {leadSubSectionFetch}= require("../../utils/helper")

class LeadReviewDetailsController extends BaseController {
  constructor(request, response, loanRequestService, sectionStatusService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.sectionStatusService = sectionStatusService;
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

      let leadData = await this.loanRequestService.fetchLeadDetails(loanAppId);

      if (!leadData) {
        throw {
          success: false,
          message: 'Loan App Id associated with lead is not valid',
        };
      }

      let result = LeadReviewDetailsSerialize(leadData)[0];

      for (const key of Object.keys(result)) {
        if (key === leadSectionName.COAPPLICANT_DETAILS) {
          for (const coapplicant in result[key]) {
            if (coapplicant.split('_')[0] == 'co-applicant') {
              const leadSection = await this.sectionStatusService.findOne({
                section_sequence_no: +(coapplicant.split('_')[1] - 1) + 300,
                loan_app_id: loanAppId,
              });
              if (leadSection) {
                result[key][coapplicant]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
                result[key][coapplicant]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
                var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
                result[key][coapplicant]['validation_checklist'] = subSectionStatus;
                result[key][coapplicant]['validation_checklist_remarks'] = subSectionValidationRemarks;
              }
            }
          }
          let allCoApplicantApproved = true;
          for (const coapplicant in result[key]) {
            if (coapplicant.split('_')[0] === 'co-applicant') {
              allCoApplicantApproved = allCoApplicantApproved && result[key][coapplicant].status.toUpperCase() === 'APPROVED';
              if(result[key][coapplicant].status.toUpperCase()=="REJECTED"){
                result[key]['status'] = 'rejected';
                break;
              }else if(result[key][coapplicant].status.toUpperCase()=="IN_PROGRESS"){
                result[key]['status'] = 'in_progress';
              }
            }
          }

          if (allCoApplicantApproved) {
            result[key]['status'] = 'approved';
          }
        } else if (key === leadSectionName.GUARANTOR_DETAILS) {
          for (const guarantor in result[key]) {
            if (guarantor.split('_')[0] == 'guarantor') {
              const leadSection = await this.sectionStatusService.findOne({
                section_sequence_no: +(guarantor.split('_')[1] - 1) + 400,
                loan_app_id: loanAppId,
              });
              if (leadSection) {
                result[key][guarantor]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
                result[key][guarantor]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
                var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
                result[key][guarantor]['validation_checklist'] = subSectionStatus;
                result[key][guarantor]['validation_checklist_remarks'] = subSectionValidationRemarks;
              }
            }
          }

          let allGurantorApproved = true;
          for (const gurantor in result[key]) {
            if (gurantor.split('_')[0] === 'guarantor') {
              allGurantorApproved = allGurantorApproved && result[key][gurantor].status.toUpperCase() === 'APPROVED';
              if(result[key][gurantor].status.toUpperCase()=="REJECTED"){
                result[key]['status'] = 'rejected';
                break;
              }else if(result[key][gurantor].status.toUpperCase()=="IN_PROGRESS"){
                result[key]['status'] = 'in_progress';
              }
            }
          }

          if (allGurantorApproved) {
            result[key]['status'] = 'approved';
          }
        } else if (key === leadSectionName.PRIMARY_APPLICANT) {
          const leadSection = await this.sectionStatusService.findOne({
            section_sequence_no: 100,
            loan_app_id: loanAppId,
          });

          if (leadSection) {
            result[`${key}`]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
            result[key]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
            var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
            result[key]['validation_checklist'] = subSectionStatus;
            result[key]['validation_checklist_remarks'] = subSectionValidationRemarks;
          }
        } else if (key === leadSectionName.ENTITY_DETAILS) {
          const leadSection = await this.sectionStatusService.findOne({
            section_sequence_no: 200,
            loan_app_id: loanAppId,
          });
          if (leadSection) {
            result[`${key}`]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
            result[key]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
            var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
            result[key]['validation_checklist'] = subSectionStatus;
            result[key]['validation_checklist_remarks'] = subSectionValidationRemarks;
          }
        } else if (key === leadSectionName.SHAREHOLDING_PATTERN) {
          const leadSection = await this.sectionStatusService.findOne({
            name: 700,
            loan_app_id: loanAppId,
          });
          
          if (leadSection) {
            result[`${key}`]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
            result[key]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
            var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
            result[key]['validation_checklist'] = subSectionStatus;
            result[key]['validation_checklist_remarks'] = subSectionValidationRemarks;
          }
        } else if (key === leadSectionName.FINANCIAL_DOCS) {
          const leadSection = await this.sectionStatusService.findOne({
            section_sequence_no: 500,
            loan_app_id: loanAppId,
          });
          if (leadSection) {
            result[`${key}`]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
            result[key]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
            var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
            result[key]['validation_checklist'] = subSectionStatus;
            result[key]['validation_checklist_remarks'] = subSectionValidationRemarks;
          }
        } else if (key === leadSectionName.ADDITIONAL_DOCS) {
          const leadSection = await this.sectionStatusService.findOne({
            section_sequence_no: 600,
            loan_app_id: loanAppId,
          });
          if (leadSection) {
            result[`${key}`]['status'] = leadSection.section_status == 'deviation' ? 'in_review' : leadSection.section_status;
            result[key]['remarks'] = leadSection.section_remarks ? leadSection.section_remarks : null;
            var {subSectionStatus,subSectionValidationRemarks}= leadSubSectionFetch(leadSection);
            result[key]['validation_checklist'] = subSectionStatus;
            result[key]['validation_checklist_remarks'] = subSectionValidationRemarks;
          }
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let leadReviewDetailsController = new LeadReviewDetailsController(request, response, new LoanRequestService(), new SectionStatusService());
    return leadReviewDetailsController;
  }
}

module.exports = LeadReviewDetailsController;

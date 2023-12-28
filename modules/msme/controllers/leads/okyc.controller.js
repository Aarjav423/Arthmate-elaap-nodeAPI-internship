const httpStatus = require('http-status');
const { SectionStatusService } = require('../../services');
const { BaseController } = require('../../common');

class OkycController extends BaseController {
  constructor(request, response, sectionStatusService) {
    super(request, response);
    this.sectionStatusService = sectionStatusService;
  }

  async execute() {
    try {
      const {loan_app_id, status} = this.request.body;
      const section_status = "in_progress";
      let section_code = ["primary", "co_borrower"];
      if(status === 'follow_up_doc') section_code = ["additional_doc"];
      const okycData = await this.sectionStatusService.changeStatus(loan_app_id,section_code,section_status);
      if(status === 'follow_up_doc') {
        return okycData;
      }
      let allApplicant = await this.sectionStatusService.findAll({loan_app_id,section_code,section_status});
      for (let applicant of allApplicant){
        let loanAppId = applicant.loan_app_id;
        let sectionCode = applicant.section_code;
        let sectionSequenceNo = applicant.section_sequence_no;
        let subSectionData = {
          sub_section_code : "applicant_okyc",
          sub_section_name : "Applicant OKYC Check",
          sub_section_sequence_no : applicant.subsections.length+1,
          sub_section_status : "in_progress",
          sub_section_remarks :"",
          is_section_submit : "Y"
        };
        await this.sectionStatusService.addSubsection(loanAppId, sectionCode, sectionSequenceNo, subSectionData)
      } 
      return okycData;
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let okycController = new OkycController(request, response, new SectionStatusService());
    return okycController;
  }
}

module.exports = OkycController;


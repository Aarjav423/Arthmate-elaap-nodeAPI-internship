const { LoanRequestService,  SectionStatusService } = require('../../services');
const { BaseController } = require('../../common');
const { param,  validationResult } = require('express-validator');;

class SubsectionDeleteController extends BaseController {
  constructor(request, response, loanRequestService, sectionStatusService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.sectionStatusService = sectionStatusService;
  }

  async validate() {
    await Promise.all([param('loan_app_id').notEmpty().isString().withMessage('Loan App ID must be a string').run(this.request),param('section_sequence_no').notEmpty().isNumeric().withMessage('Section Sequence No must be a string'), param('sub_section_code').notEmpty().isString().withMessage('Sub Section Code must be a string')]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { loan_app_id:loanAppId, section_sequence_no:sectionSequenceNo, sub_section_code:subSectionCode } = this.request.params;

      const leadSection = await this.sectionStatusService.findOne({
        section_sequence_no: sectionSequenceNo,
        loan_app_id: loanAppId,
      });

      if(!leadSection){
        throw new Error(`Either Loan App ID or Section Sequence No is invalid.`);
      }

      if(leadSection.section_status=="approved"){
        throw new Error(`Delete action is prohibited for approved section status.`)
      }

      const updatedDocument= await this.sectionStatusService.deleteSubsection(loanAppId,sectionSequenceNo,subSectionCode);

      return { message: 'Deleted Successfully', success: true,data:updatedDocument };
    } catch (error) {
      console.log('Errors', error);
      throw error;
    }
  }

  static create(request, response) {
    let subsectionDeleteController = new SubsectionDeleteController(request, response, new LoanRequestService(), new SectionStatusService());
    return subsectionDeleteController;
  }
}

module.exports = SubsectionDeleteController;

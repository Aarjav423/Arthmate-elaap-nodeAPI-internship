const httpStatus = require('http-status');
const { SectionStatusService, ValidationCheckService } = require('../../services');
const { BaseController } = require('../../common');
const { default: axios } = require('axios');

class AadhaarCheckController extends BaseController {
  constructor(request, response, sectionStatusService) {
    super(request, response);
    this.sectionStatusService = sectionStatusService;
  }

  async execute() {
    try {
      const { loan_app_id, aadhaar_no, otp,section_code,section_sequence_no } = this.request.body;
      const consent = 'Y';
      const currentDateTime = new Date();
      const consent_timestamp = currentDateTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const data = await this.sectionStatusService.findOne({ loan_app_id, section_code, section_sequence_no});
      const subSectionDatas = data.subsections;
      let remarks = "";
      for(let subSectionData of subSectionDatas)
      {
        if(subSectionData.sub_section_code === 'applicant_okyc')
        {
          remarks = subSectionData.sub_section_remarks;
        }
      }
      const request_id = remarks.split(" ")[0];
      const apiUrl = process.env.MSME_AADHAAR_VERIFY_URL;
      const status = 'approved';
      const requestBody = {
        request_id,
        aadhaar_no,
        otp,
        loan_app_id,
        consent,
        consent_timestamp,
      };
      try {
        const response = await axios.post(apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${process.env.MSME_AADHAAR_VERIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
        if (response?.data && response.data.data && response.data.data.statusCode === 101) {
          let allApplicant = await this.sectionStatusService.findAll({ loan_app_id, section_code, section_sequence_no });
          for (let applicant of allApplicant) {
            let loanAppId = applicant.loan_app_id;
            let sectionCode = applicant.section_code;
            let sectionSequenceNo = applicant.section_sequence_no;
            let subSectionData = {
              sub_section_code: 'applicant_okyc',
              sub_section_remarks: `${response.data.data.requestId} otp_verified`,
            };
            await this.sectionStatusService.addSubsection(loanAppId, sectionCode, sectionSequenceNo, subSectionData);
            await ValidationCheckService.validationCheck({
              loan_app_id: loanAppId,
              sub_section_code: 'applicant_okyc',
              section_sequence_no: sectionSequenceNo,
            });
          }
          const okycData = await this.sectionStatusService.changeStatusBySequenceNo(loan_app_id, section_sequence_no, status);
          return okycData;
        }
        throw new Error('Aadhaar not verified');
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let aadhaarCheckController = new AadhaarCheckController(request, response, new SectionStatusService() );
    return aadhaarCheckController;
  }
}

module.exports = AadhaarCheckController;

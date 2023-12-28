 const { LoanRequestService, SectionStatusService} = require('../../services');
 const { BaseController } = require('../../common');
 const { default: axios } = require('axios');
 const { AadhaarHelper } = require('../../helper');

 
 class AadharOtpController extends BaseController {
   constructor(request, response, loanRequestService, sectionStatusService) {
     super(request, response);
     this.loanRequestService = loanRequestService;
     this.sectionStatusService = sectionStatusService;
   }
 
   async execute() {
     try {
       const {loan_app_id, aadhaar_no,section_code,section_sequence_no} = this.request.body;
       const consent = 'Y';
       const currentDateTime = new Date();
       const consent_timestamp = currentDateTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
       const apiUrl = process.env.MSME_AADHAAR_OTP_URL;
       const requestBody = {
         aadhaar_no,
         loan_app_id,
         consent,
         consent_timestamp,
       };
       try{
         const leadDetails = await this.loanRequestService.fetchLeadDetails(loan_app_id);
         let aadhar_card_hash = leadDetails[0].aadhar_card_hash;
         if(section_code === 'co_borrower')
         {
            aadhar_card_hash = leadDetails[0].coborrower[section_sequence_no-300];
            aadhar_card_hash = aadhar_card_hash.cb_aadhaar_hash;
         }
         const new_aadhar_card_hash = AadhaarHelper.hashAadhaarNum(aadhaar_no);

         if(aadhar_card_hash != new_aadhar_card_hash) throw new Error("This aadhar do not matches the previously given aadhaar");

         const response = await axios.post(apiUrl, requestBody, {
           headers: {
             'Authorization': `Bearer ${process.env.MSME_AADHAAR_OTP_TOKEN}`,
             'Content-Type': 'application/json',
           },
         });
         
         if(response?.data  && response.data.data && response.data.data.statusCode === 101){
          let allApplicant = await this.sectionStatusService.findAll({loan_app_id,section_code,section_sequence_no});
          for (let applicant of allApplicant){
            let loanAppId = applicant.loan_app_id;
            let sectionCode = applicant.section_code;
            let sectionSequenceNo = applicant.section_sequence_no;
            let subSectionData = {
              sub_section_code : "applicant_okyc",
              sub_section_remarks :`${response.data.data.requestId} otp_sent`
            };
            await this.sectionStatusService.addSubsection(loanAppId, sectionCode, sectionSequenceNo, subSectionData);
          }
           return {message:"Aadhaar otp sent", success:true};
          }
          throw new Error("Aadhaar otp not send")
       }catch(error)
       {
         throw error;
       }
     } catch (error) {
       throw error;
     }
   }
 
   static create(request, response) {
     let aadharOtpController = new AadharOtpController(request, response, new LoanRequestService(), new SectionStatusService());
     return aadharOtpController;
   }
 }
 
	 module.exports = AadharOtpController;

const httpStatus = require('http-status');
const { LoanRequestService, LoanDocumentService, ValidationCheckService, LeadSectionService } = require('../../services');
const { BaseController } = require('../../common');
const UTIL = require('../../utils/functions');
const ID_HELPER = require('../../utils/helper');
const { AadhaarHelper } = require('../../helper');
const { leadStatus } = require('../../constants/lead.constant');
const { LoanRequest, SectionSchema, BorrowerinfoCommon } = require('../../models');

class LeadController extends BaseController {
  constructor(request, response, loanRequestService, leadSectionService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
    this.leadSectionService = leadSectionService;
  }

  static create(request, response) {
    let leadController = new LeadController(request, response, new LoanRequestService(), new LeadSectionService());
    return leadController;
  }

  cleanObject = (object) => {
    if (typeof object != 'object') return false;
    const clean_object = {};
    for (let k in object) {
      let item = object[k];
      if (item === null || item === undefined) continue;
      clean_object[k] = this.cleanObject(item) || item;
    }
    return clean_object;
  };

  formatShareHolder = (data = []) => {
    return data
      .map((el) => {
        return {
          borrower_id: el?.borrower_id ?? null,
          share_holder_name: el?.share_holder_name ?? null,
          share_holder_perc: isNaN(el?.share_holder_perc) ? null : el?.share_holder_perc,
        };
      })
      .filter((el) => el?.borrower_id && el?.share_holder_name);
  };

  dedupeCheck = async (appl_pan, company_id) => {
    const dedupeCheckResult = await LoanRequest.findOne({
      appl_pan,
      company_id,
    });
    return Boolean(dedupeCheckResult);
  };

  getLeads = async () => {
    try {
      const result = await this.loanRequestService.fetchLeadsList(this.request.query);
      this.response.status(httpStatus.OK).send(result);
    } catch (error) {
      this.response.status(error.code ? error.code : httpStatus.BAD_REQUEST).send(error.message);
    }
  };

  saveSection = async (data) => {
    try {
      let body = {
        loan_app_id: data.loan_app_id,
        section_code: data.section_code,
        section_name: data.section_name,
        section_sequence_no: data.section_sequence_no,
        section_status: 'in_progress',
      };
      if (data.sub_section_code) {
        body.subsections = [
          {
            sub_section_code: data.sub_section_code,
            sub_section_name: data.sub_section_name,
            sub_section_sequence_no: data.sub_section_sequence_no,
            sub_section_status: 'in_progress',
            sub_section_remarks: 'Initail Insertion',
            is_section_submit: 'N',
          },
        ];
      }
      const found = await SectionSchema.findOne({
        loan_app_id: data.loan_app_id,
        section_code: data.section_code,
        section_sequence_no: data.section_sequence_no,
      });
      if (!found) {
        await SectionSchema.create(body);
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  saveSubSection = async (data) => {
    try {
      const body = {
        sub_section_code: data.sub_section_code,
        sub_section_name: data.sub_section_name,
        sub_section_sequence_no: data.sub_section_sequence_no,
        sub_section_remarks: data.sub_section_remarks || 'Initial Insetion',
        sub_section_status: 'in_progress',
        is_section_submit: data.is_section_submit,
      };
      const found = await SectionSchema.findOne({
        loan_app_id: data.loan_app_id,
        section_sequence_no: data.section_sequence_no,
        'subsections.sub_section_code': data.sub_section_code,
      });
      if (!found) {
        await SectionSchema.updateOne(
          {
            loan_app_id: data.loan_app_id,
            section_sequence_no: data.section_sequence_no,
          },
          {
            $push: {
              subsections: body,
            },
          },
          {
            new: true,
          },
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  leadCreate = async () => {
    try {
      let body = this.request.body;
      let canPatch = false;

      if (!body?.appl_pan) {
        throw new Error('PAN number is required.');
      }

      const leads = await LoanRequest.find({
        company_id: Number(body?.company_id),
        appl_pan: body?.appl_pan,
        is_deleted: { $ne: 1 },
      });

      if (leads.length) {
        const LoanAppIds = await leads.map((item) => {
          return item.loan_app_id;
        });

        if (body?.loan_app_id && LoanAppIds.includes(body?.loan_app_id)) canPatch = true;

        if (!canPatch) {
          const loanAppIdAlreadyExist = await BorrowerinfoCommon.findByLoanAppIds(LoanAppIds);

          let activeLeadArray = [];
          leads.forEach((record) => {
            if (record.is_deleted !== 1) {
              activeLeadArray.push(record);
            }
          });

          let dedupe = loanAppIdAlreadyExist[0] !== null ? loanAppIdAlreadyExist[0]?.stage !== 999 && activeLeadArray.length : activeLeadArray.length;

          if (dedupe) {
            return UTIL.errorResponse(this.response, {}, `Pan number already exist.`, httpStatus.BAD_REQUEST);
          }
        }
      }

      if (canPatch) {
        await this.loanRequestService.updateByLoanAppId(body?.loan_app_id, this.cleanObject(body));
      } else {
        body.loan_app_id = ID_HELPER.getLoanAppID(body?.first_name?.trim());
        body.borrower_id = ID_HELPER.getBorrowerID(body?.appl_pan?.trim());
        body.status = leadStatus.Draft;
        body.lead_status = leadStatus.Draft;

        const result = await this.loanRequestService.addLoanRequest(this.cleanObject(body));

        if (!result) {
          return UTIL.badRequestError(this.response, {}, `Lead creation failed.`);
        }

        const section_data = {
          loan_app_id: body?.loan_app_id,
          section_code: body?.section_code || 'primary',
          section_name: body?.section_name || 'Primary Applicant',
          section_sequence_no: body?.section_sequence_no || 100,
          sub_section_code: body?.sub_section_code || 'primary_pan',
          sub_section_name: body?.sub_section_name || 'Primary Pan Check',
          sub_section_sequence_no: body?.sub_section_sequence_no || 1,
        };
        await this.saveSection(section_data);
      }

      ValidationCheckService.validationCheck({
        loan_app_id: body?.loan_app_id,
        sub_section_code: body?.sub_section_code || 'primary_pan',
        section_sequence_no: body?.section_sequence_no || 100,
      });

      return UTIL.okResponse(this.response, { loan_app_id: body?.loan_app_id }, `Lead created successfully.`);
    } catch (error) {
      console.log(error);
      return UTIL.errorResponse(this.response, {}, error.message ? error.message : `Lead creation failed.`, error.code ? error.code : httpStatus.BAD_REQUEST);
    }
  };

  updateLead = async () => {
    try {
      const loan_app_id = this.request.params.loan_app_id;
      let body = this.request.body;

      const lead = await this.loanRequestService.getByLoanAppId(loan_app_id);

      if (!lead) {
        return UTIL.errorResponse(this.response, null, 'Lead details not found. Please try again with a valid lead id.', httpStatus.BAD_REQUEST);
      }

      const sections = ['primary-applicants', 'entity-details', 'co-applicants', 'guarantors', 'share-holding-details', 'financial-documents', 'additional-documents'];
      if (!sections.includes(body.section)) throw new Error('Invalid request, please try again with a valid section name.');

      let finalData = {};

      if (body.section == 'primary-applicants') {
        if (body.type != 'credit' && !body.aadhar_card_num) throw new Error('Aadhar number is required.');

        finalData = {
          first_name: body?.first_name?? lead?.first_name,
          middle_name: body?.middle_name?? lead?.middle_name,
          last_name: body?.last_name?? lead?.last_name,
          appl_phone: body?.appl_phone?? lead?.appl_phone,
          father_fname: body?.father_fname??lead?.father_fname,
          gender: body?.gender??lead?.gender,
          email_id: body?.email_id ?? lead?.email_id,
          dob: body?.dob ?? lead?.dob,
          resi_addr_ln1: body.resi_addr_ln1 ?? lead?.resi_addr_ln1,
          resi_addr_ln2: body.resi_addr_ln2 ?? lead?.resi_addr_ln2,
          city: body.city ?? lead?.city,
          state: body.state ?? lead?.state,
          pincode: body.pincode ?? lead?.pincode,
          address_same: body?.address_same ?? lead?.address_same,
          per_addr_ln1: body.per_addr_ln1 ?? lead?.per_addr_ln1,
          per_addr_ln2: body.per_addr_ln2 ?? lead?.per_addr_ln2,
          per_city: body.per_city ?? lead?.per_city,
          per_state: body.per_state ?? lead?.per_state,
          per_pincode: body.per_pincode ?? lead?.per_pincode,
          loan_amount: body.loan_amount ?? lead?.loan_amount,
          loan_tenure: body.loan_tenure ?? lead?.loan_tenure,
          loan_interest_rate: body.loan_interest_rate ?? lead?.loan_interest_rate,
          purpose_of_loan: body.purpose_of_loan ?? lead?.purpose_of_loan
        };

        if(body.aadhar_card_num){
          finalData={
            ...finalData,
            aadhar_card_num: AadhaarHelper.maskAadhaarNum(lead?.aadhar_card_num ?? '', body?.aadhar_card_num ?? ''),
            aadhar_card_hash: AadhaarHelper.compareAadharNum(lead?.aadhar_card_hash ?? '', body?.aadhar_card_num ?? '')
          }
        }

        await this.loanRequestService.updateByLoanAppId(loan_app_id, this.cleanObject(finalData));

        if (body.sub_section_code === 'primary_section_submit') {
          const sub_section_data = {
            loan_app_id,
            sub_section_code: body.sub_section_code || 'primary_section_submit',
            sub_section_name: body.sub_section_name || 'Primary Verify And Next',
            sub_section_sequence_no: body.sub_section_sequence_no || 2,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'Y',
            sub_section_code: body.sub_section_code || 'primary_section_submit',
            section_sequence_no: body.section_sequence_no || 100,
          };
          await this.saveSubSection({ ...sub_section_data, loan_app_id });
          const validationData = {
            loan_app_id: loan_app_id,
            lending_token: this.request.headers['authorization'],
            sub_section_code: body.sub_section_code || 'primary_section_submit',
            section_sequence_no: body.section_sequence_no || 100,
          };
          ValidationCheckService.validationCheck(validationData);
        }
      }

      if (body.section == 'entity-details') {
        finalData = {
          entity_details: {
            entity_type: body.entity_type ?? lead?.entity_details?.entity_type,
            entity_name: body.entity_name ?? lead?.entity_details?.entity_name,
            date_of_incorporation: body.date_of_incorporation ?? lead?.entity_details?.date_of_incorporation,
            com_addr_ln1: body.com_addr_ln1 ?? lead?.entity_details?.com_addr_ln1,
            com_addr_ln2: body.com_addr_ln2 ?? lead?.entity_details?.com_addr_ln2,
            com_city: body.com_city ?? lead?.entity_details?.com_city,
            com_state: body.com_state ?? lead?.entity_details?.com_state,
            com_pincode: body.com_pincode ?? lead?.entity_details?.com_pincode,
            res_addr_ln1: body.res_addr_ln1 ?? lead?.entity_details?.res_addr_ln1,
            res_addr_ln2: body.res_addr_ln2 ?? lead?.entity_details?.res_addr_ln2,
            res_city: body.res_city ?? lead?.entity_details?.res_city,
            res_state: body.res_state ?? lead?.entity_details?.res_state,
            res_pincode: body.res_pincode ?? lead?.entity_details?.res_pincode,
            address_same: body?.address_same ?? lead?.entity_details?.address_same,
            pan_no: body.pan_no ?? lead?.entity_details?.pan_no,
            urc_no: body.urc_no ?? lead?.entity_details?.urc_no,
            cin_no: body.cin_no ?? lead?.entity_details?.cin_no,
            gst_no: body.gst_no ?? lead?.entity_details?.gst_no,
            udyam_vintage_flag: body.udyam_vintage_flag ?? lead?.entity_details?.udyam_vintage_flag,
            udyam_vintage: body.udyam_vintage ?? lead?.entity_details?.udyam_vintage,
            udyam_hit_count: body.udyam_hit_count ?? lead?.entity_details?.udyam_hit_count,
            gst_vintage_flag: body.gst_vintage_flag ?? lead?.entity_details?.gst_vintage_flag,
            gst_vintage: body.gst_vintage ?? lead?.entity_details?.gst_vintage,
          },
        };

        await this.loanRequestService.updateByLoanAppId(loan_app_id, this.cleanObject(finalData));

        const section_data = {
          loan_app_id,
          section_code: body.section_code || 'entity',
          section_name: body.section_name || 'Entity Details',
          section_sequence_no: body.section_sequence_no || 200,
        };
        await this.saveSection(section_data);

        let validationData = {};
        const pan_section = ['Private Limited', 'Public Limited', 'LLP', 'OPC', 'Society', 'Partnership', 'Trust'];
        if (pan_section.includes(body.entity_type) && body.pan_no) {
          const sub_section_data = {
            section_sequence_no: body.section_sequence_no || 200,
            sub_section_code: body.sub_section_code || 'entity_pan',
            sub_section_name: body.sub_section_name || 'Entity PAN Check',
            sub_section_sequence_no: body.sub_section_sequence_no || 1,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'N',
          };
          await this.saveSubSection({ ...sub_section_data, ...section_data });
          validationData = { pan: body.pan_no };
        }
        const urc_section = ['Proprietor', 'Private Limited', 'Public Limited', 'LLP', 'OPC'];
        if (urc_section.includes(body.entity_type) && body.urc_no) {
          const sub_section_data = {
            section_sequence_no: body.section_sequence_no || 200,
            sub_section_code: body.sub_section_code || 'entity_udyam',
            sub_section_name: body.sub_section_name || 'Entity Udyam Check',
            sub_section_sequence_no: body.sub_section_sequence_no || 2,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'N',
          };
          await this.saveSubSection({ ...sub_section_data, ...section_data });
          validationData = { vintage: this.request?.product?.vintage, lending_token: this.request.headers['authorization'] };
        }
        const gst_section = ['Proprietor', 'Private Limited', 'Public Limited', 'LLP', 'OPC'];
        if (gst_section.includes(body.entity_type) && body.gst_no) {
          const sub_section_data = {
            section_sequence_no: body.section_sequence_no || 200,
            sub_section_code: body.sub_section_code || 'entity_gst',
            sub_section_name: body.sub_section_name || 'Entity GST Check',
            sub_section_sequence_no: body.sub_section_sequence_no || 3,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'N',
          };
          await this.saveSubSection({ ...sub_section_data, ...section_data });
          validationData = { vintage: this.request?.product?.vintage, gstin: body.gst_no };
        }
        const cin_section = ['Private Limited', 'Public Limited', 'LLP', 'OPC'];
        if (cin_section.includes(body.entity_type) && body.cin_no) {
          const sub_section_data = {
            section_sequence_no: body.section_sequence_no || 200,
            sub_section_code: body.sub_section_code || 'entity_cin',
            sub_section_name: body.sub_section_name || 'Entity CIN Check',
            sub_section_sequence_no: body.sub_section_sequence_no || 4,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'N',
          };
          await this.saveSubSection({ ...sub_section_data, ...section_data });
          validationData = { entity_cin: body.cin_no };
        }
        if (body.sub_section_code && body.section_sequence_no && Object.keys(validationData).length > 0) {
          ValidationCheckService.validationCheck({ ...validationData, sub_section_code: body.sub_section_code, section_sequence_no: body.section_sequence_no, loan_app_id });
        }

        if (body.sub_section_code === 'entity_section_submit') {
          const sub_section_data = {
            sub_section_code: body.sub_section_code || 'entity_section_submit',
            sub_section_name: body.sub_section_name || 'Entity Verify And Next',
            sub_section_sequence_no: body.sub_section_sequence_no || 5,
            sub_section_status: 'in_progress',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insetion',
            is_section_submit: 'Y',
            sub_section_code: body.sub_section_code || 'entity_section_submit',
            section_sequence_no: body.section_sequence_no || 200,
          };
          await this.saveSubSection({ ...sub_section_data, ...section_data });
          const validationData = {
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'entity_section_submit',
            section_sequence_no: body.section_sequence_no || 200,
          };
          ValidationCheckService.validationCheck(validationData);
        }
      }

      if (body.section == 'co-applicants') {
        const borrowers = lead.coborrower ?? [];
        let sequence_no = borrowers?.length ? parseInt(borrowers[borrowers?.length - 1].sequence_no) + 1 : 300;

        const records = borrowers?.length ? borrowers?.filter((el) => el?._id?.toString() == body?._id?.toString()) : [];

        const borrower = records.length > 0 ? records[0] : {};

        if (body?._id && records?.length == 0) throw new Error('There is no such co-borrower to update.');

        if (body?._id && body?.delete && records?.length == 0) throw new Error('There is no such co-borrower to delete.');

        finalData = {
          _id: body?._id,
          delete: body?.delete,
          cb_fname: body?.cb_fname ?? borrower?.cb_fname,
          cb_mname: body?.cb_mname ?? borrower?.cb_mname,
          cb_lname: body?.cb_lname ?? borrower?.cb_lname,
          cb_dob: body?.cb_dob ?? borrower?.cb_dob,
          cb_gender: body?.cb_gender ?? borrower?.cb_gender,
          cb_mobile: body?.cb_mobile ?? borrower?.cb_mobile,
          cb_email: body?.cb_email ?? borrower?.cb_email,
          cb_father_name: body?.cb_father_name ?? borrower?.cb_father_name,
          cb_resi_addr_ln1: body?.cb_resi_addr_ln1 ?? borrower?.cb_resi_addr_ln1,
          cb_resi_addr_ln2: body?.cb_resi_addr_ln2 ?? borrower?.cb_resi_addr_ln2,
          cb_city: body?.cb_city ?? borrower?.cb_city,
          cb_state: body?.cb_state ?? borrower?.cb_state,
          cb_pincode: body?.cb_pincode ?? borrower?.cb_pincode,
          address_same: body?.address_same ?? borrower?.address_same,
          cb_per_addr_ln1: body?.cb_per_addr_ln1 ?? borrower?.cb_per_addr_ln1,
          cb_per_addr_ln2: body?.cb_per_addr_ln2 ?? borrower?.cb_per_addr_ln2,
          cb_per_city: body?.cb_per_city ?? borrower?.cb_per_city,
          cb_per_state: body?.cb_per_state ?? borrower?.cb_per_state,
          cb_per_pincode: body?.cb_per_pincode ?? borrower?.cb_per_pincode,
          cb_pan: body?.cb_pan ?? borrower?.cb_pan,
        };

        if (!(body?._id || body?.delete)) finalData.sequence_no = sequence_no;

        if (body?.cb_pan && body.sub_section_code === 'co_borrower_pan') {
          finalData.borrower_id = borrower?.borrower_id ?? ID_HELPER.getBorrowerID(body?.cb_pan);
        }

        if (body?.cb_aadhaar) {
          finalData.cb_aadhaar = AadhaarHelper.maskAadhaarNum(borrower?.cb_aadhaar ?? '', body?.cb_aadhaar ?? '');
          finalData.cb_aadhaar_hash = AadhaarHelper.compareAadharNum(borrower?.cb_aadhaar_hash ?? '', body?.cb_aadhaar ?? '');
        }

        await this.loanRequestService.updateCoBorrowerByLAid(loan_app_id, this.cleanObject(finalData));
        
        if(borrower?.sequence_no && body?.delete){
          await this.leadSectionService.delete({loan_app_id, section_sequence_no:borrower?.sequence_no})
        }

        if (body.sub_section_code === 'co_borrower_pan' && body.cb_pan && !body?.delete) {
          const final_sequence = body?._id ? borrower?.sequence_no : finalData?.sequence_no;
          const section_data = {
            loan_app_id,
            section_code: 'co_borrower',
            section_name: `Co-Borrower-${1 + (final_sequence % 10)}`,
            section_sequence_no: final_sequence,
            sub_section_code: 'co_borrower_pan',
            sub_section_name: 'Co-Borrower Check',
            sub_section_sequence_no: 1,
          };
          await this.saveSection(section_data);
          await ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: 'co_borrower_pan',
            section_sequence_no: section_data.section_sequence_no,
          });
        }

        if (body.sub_section_code === 'co_borrower_section_submit' && !body?.delete) {
          for (const data of borrowers) {
            if (!data?.sequence_no || !data?.borrower_id) continue;
            const section_data = {
              loan_app_id: loan_app_id,
              section_code: 'co_borrower',
              section_name: `Co-Borrower-${1 + (data?.sequence_no % 10)}`,
              section_sequence_no: data?.sequence_no,
              sub_section_code: 'co_borrower_section_submit',
              sub_section_name: 'Co-Borrower Verify And Next',
              sub_section_sequence_no: 2,
            };
            await this.saveSection(section_data);

            const sub_section_data = {
              loan_app_id: loan_app_id,
              sub_section_code: 'co_borrower_section_submit',
              sub_section_name: 'Co-Borrower Verify And Next',
              sub_section_sequence_no: 2,
              sub_section_status: 'in_progress',
              sub_section_remarks: 'Initial Insertion',
              is_section_submit: 'Y',
              section_sequence_no: data?.sequence_no,
            };
            await this.saveSubSection(sub_section_data);

            await ValidationCheckService.validationCheck({
              loan_app_id: loan_app_id,
              sub_section_code: 'co_borrower_section_submit',
              section_sequence_no: section_data.section_sequence_no,
              ca_index: borrowers?.indexOf(data),
              lending_token: this.request.headers['authorization'],
            });
          }
        }
      }

      if (body.section == 'guarantors') {
        const guarantors = lead?.guarantor ?? [];

        let sequence_no = guarantors?.length ? parseInt(guarantors[guarantors?.length - 1].sequence_no) + 1 : 400;

        const records = guarantors?.length ? guarantors?.filter((el) => el?._id?.toString() == body?._id?.toString()) : [];

        const guarantor = records.length > 0 ? records[0] : {};

        if (body?._id && records?.length == 0) throw new Error('There is no such guarantor to update.');

        if (body?._id && body?.delete && records?.length == 0) throw new Error('There is no such guarantor to delete.');

        finalData = {
          _id: body?._id,
          delete: body?.delete,
          gua_fname: body?.gua_fname ?? guarantor?.gua_fname,
          gua_mname: body?.gua_mname ?? guarantor?.gua_mname,
          gua_lname: body?.gua_lname ?? guarantor?.gua_lname,
          gua_dob: body?.gua_dob ?? guarantor?.gua_dob,
          gua_gender: body?.gua_gender ?? guarantor?.gua_gender,
          gua_mobile: body?.gua_mobile ?? guarantor?.gua_mobile,
          gua_email: body?.gua_email ?? guarantor?.gua_email,
          gua_father_name: body?.gua_father_name ?? guarantor?.gua_father_name,
          gua_resi_addr_ln1: body?.gua_resi_addr_ln1 ?? guarantor?.gua_resi_addr_ln1,
          gua_resi_addr_ln2: body?.gua_resi_addr_ln2 ?? guarantor?.gua_resi_addr_ln2,
          gua_city: body?.gua_city ?? guarantor?.gua_city,
          gua_state: body?.gua_state ?? guarantor?.gua_state,
          gua_pincode: body?.gua_pincode ?? guarantor?.gua_pincode,
          address_same: body?.address_same ?? guarantor?.address_same,
          gua_per_addr_ln1: body?.gua_per_addr_ln1 ?? guarantor?.gua_per_addr_ln1,
          gua_per_addr_ln2: body?.gua_per_addr_ln2 ?? guarantor?.gua_per_addr_ln2,
          gua_per_city: body?.gua_per_city ?? guarantor?.gua_per_city,
          gua_per_state: body?.gua_per_state ?? guarantor?.gua_per_state,
          gua_per_pincode: body?.gua_per_pincode ?? guarantor?.gua_per_pincode,
          gua_pan: body?.gua_pan ?? guarantor?.gua_pan,
        };

        if (!(body?._id || body?.delete)) finalData.sequence_no = sequence_no;

        if (body?.gua_pan && body.sub_section_code === 'guarantor_pan') {
          finalData.borrower_id = guarantor?.borrower_id ?? ID_HELPER.getBorrowerID(body?.gua_pan);
        }

        if (body?.gua_aadhaar) {
          finalData.gua_aadhaar = AadhaarHelper.maskAadhaarNum(guarantor?.gua_aadhaar ?? '', body?.gua_aadhaar ?? '');
          finalData.gua_aadhaar_hash = AadhaarHelper.compareAadharNum(guarantor?.gua_aadhaar_hash ?? '', body?.gua_aadhaar ?? '');
        }

        await this.loanRequestService.updateGuarantorByLAid(loan_app_id, this.cleanObject(finalData));

        if(guarantor?.sequence_no && body?.delete){
          await this.leadSectionService.delete({loan_app_id, section_sequence_no:guarantor?.sequence_no})
        }

        if (body.sub_section_code === 'guarantor_pan' && body.gua_pan && !body?.delete) {
          const final_sequence = body?._id ? guarantor?.sequence_no : finalData?.sequence_no;
          const section_data = {
            loan_app_id,
            section_code: 'guarantor',
            section_name: `Guarantor-${1 + (final_sequence % 10)}`,
            section_sequence_no: final_sequence,
            sub_section_code: 'guarantor_pan',
            sub_section_name: 'Guarantor Check',
            sub_section_sequence_no: 1,
          };
          await this.saveSection(section_data);
          await ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: 'guarantor_pan',
            section_sequence_no: section_data.section_sequence_no,
          });
        }

        if (body.sub_section_code === 'guarantor_section_submit' && !body?.delete) {
          for (const data of guarantors) {
            if (!data?.sequence_no || !data?.borrower_id) continue;
            const section_data = {
              loan_app_id: loan_app_id,
              section_code: 'guarantor',
              section_name: `Guarantor-${1 + (data?.sequence_no % 10)}`,
              section_sequence_no: data?.sequence_no,
              sub_section_code: 'guarantor_section_submit',
              sub_section_name: 'Guarantor Verify And Next',
              sub_section_sequence_no: 2,
            };
            await this.saveSection(section_data);

            const sub_section_data = {
              loan_app_id: loan_app_id,
              sub_section_code: 'guarantor_section_submit',
              sub_section_name: 'Guarantor Verify And Next',
              sub_section_sequence_no: 2,
              sub_section_status: 'in_progress',
              sub_section_remarks: 'Initial Insertion',
              is_section_submit: 'Y',
              section_sequence_no: data?.sequence_no,
            };
            await this.saveSubSection(sub_section_data);

            await ValidationCheckService.validationCheck({
              loan_app_id: loan_app_id,
              sub_section_code: 'guarantor_section_submit',
              section_sequence_no: section_data.section_sequence_no,
              ca_index: guarantors.indexOf(data),
            });
          }
        }
      }

      if (body.section == 'share-holding-details') {
        finalData = {
          share_holders: this.formatShareHolder(body.share_holders ?? lead?.share_holders),
        };
        await this.loanRequestService.updateByLoanAppId(loan_app_id, finalData);
        const section_data = {
          loan_app_id: loan_app_id,
          section_code: body.section_code || 'share_holding',
          section_name: body.section_name || `Share holding details`,
          section_sequence_no: body.section_sequence_no || 700,
        };
        await this.saveSection(section_data);

        if (body.sub_section_code === 'share_holding_section_submit') {
          const sub_section_data = {
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'share_holding_section_submit',
            sub_section_name: body.sub_section_name || 'Share holding Section Submit',
            sub_section_sequence_no: body.sub_section_sequence_no || 2,
            sub_section_status: 'deviation',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insertion',
            is_section_submit: 'Y',
            section_sequence_no: body.section_sequence_no || 700,
          };
          await this.saveSubSection(sub_section_data);

          ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'share_holding_section_submit',
            section_sequence_no: body.section_sequence_no || 700,
          });
        }
      }

      if (body.section == 'financial-documents') {
        finalData = {
          fina_docs_gstin: body.fina_docs_gstin ?? lead?.fina_docs_gstin,
          borro_bank_code: body.borro_bank_code ?? lead?.borro_bank_code,
          borro_bank_name: body.borro_bank_name ?? lead?.borro_bank_name,
          borro_bank_branch: body.borro_bank_branch ?? lead?.borro_bank_branch,
          borro_bank_acc_num: body.borro_bank_acc_num ?? lead?.borro_bank_acc_num,
          borro_bank_ifsc: body.borro_bank_ifsc ?? lead?.borro_bank_ifsc,
          borro_bank_type: body.borro_bank_type ?? lead?.borro_bank_type,
        };
        await this.loanRequestService.updateByLoanAppId(loan_app_id, this.cleanObject(finalData));

        if (body.doc_key && body.doc_code) {
          new LoanDocumentService().updateLoanDocuments(
            {
              loan_app_id: loan_app_id,
              code: body.doc_code,
            },
            { doc_key: body.doc_key },
          );
        }

        const section_data = {
          loan_app_id: loan_app_id,
          section_code: body.section_code || 'financial_doc',
          section_name: body.section_name || 'Financial Document',
          section_sequence_no: body.section_sequence_no || 500,
        };
        await this.saveSection(section_data);

        if (body.sub_section_code === 'financial_doc_gst') {
          const sub_section_data = {
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'financial_doc_gst',
            sub_section_name: body.sub_section_name || 'Financial Document GST Check',
            sub_section_sequence_no: body.sub_section_sequence_no || 1,
            sub_section_status: 'deviation',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insertion',
            is_section_submit: 'N',
            section_sequence_no: body.section_sequence_no || 500,
          };
          await this.saveSubSection(sub_section_data);

          ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'financial_doc_gst',
            section_sequence_no: body.section_sequence_no || 500,
          });
        }
        if (body.sub_section_code === 'financial_doc_section_submit') {
          const sub_section_data = {
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'financial_doc_section_submit',
            sub_section_name: body.sub_section_name || 'Financial Doc Verify And Next',
            sub_section_sequence_no: body.sub_section_sequence_no || 2,
            sub_section_status: 'deviation',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insertion',
            is_section_submit: 'Y',
            section_sequence_no: body.section_sequence_no || 500,
          };
          await this.saveSubSection(sub_section_data);

          ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'financial_doc_section_submit',
            section_sequence_no: body.section_sequence_no || 500,
          });
        }
      }
      if (body.section == 'additional-documents') {
        if (lead.lead_status === leadStatus.FollowUpDoc) {
          finalData = {
            lead_status: leadStatus.OfferDeviation,
            status: leadStatus.OfferDeviation,
            addi_docs_comment: body.addi_docs_comment ?? lead?.addi_docs_comment,
          };
          await this.loanRequestService.updateByLoanAppId(loan_app_id, this.cleanObject(finalData));
        } else {
          finalData = {
            lead_status: leadStatus.InProgress,
            status: body?.status ?? leadStatus.InProgress,
            addi_docs_comment: body.addi_docs_comment ?? lead?.addi_docs_comment,
          };
          await this.loanRequestService.updateByLoanAppId(loan_app_id, this.cleanObject(finalData));
        }
        if (body.sub_section_code === 'additional_doc_section_submit') {
          const section_data = {
            loan_app_id: loan_app_id,
            section_code: body.section_code || 'additional_doc',
            section_name: body.section_name || 'Additional Document',
            section_sequence_no: body.section_sequence_no || 600,
          };
          await this.saveSection(section_data);
          const sub_section_data = {
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'additional_doc_section_submit',
            sub_section_name: body.sub_section_name || 'Additional Document Section Submit',
            sub_section_sequence_no: body.sub_section_sequence_no || 1,
            sub_section_status: 'deviation',
            sub_section_remarks: body.sub_section_remarks || 'Initial Insertion',
            is_section_submit: 'Y',
            section_sequence_no: body.section_sequence_no || 600,
          };
          await this.saveSubSection(sub_section_data);
          ValidationCheckService.validationCheck({
            loan_app_id: loan_app_id,
            sub_section_code: body.sub_section_code || 'additional_doc_section_submit',
            section_sequence_no: body.section_sequence_no || 600,
          });
        }
      }
      return UTIL.okResponse(this.response, {}, 'Lead updated successfully.');
    } catch (error) {
      console.log(error);
      return UTIL.errorResponse(this.response, null, error.message ?? 'Failed to update lead details.', httpStatus.INTERNAL_SERVER_ERROR);
    }
  };
}

module.exports = LeadController;

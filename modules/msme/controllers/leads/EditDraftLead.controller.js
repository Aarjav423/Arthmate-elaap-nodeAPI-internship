const httpStatus = require('http-status');
const { check, validationResult } = require('express-validator');

const { LoanRequestService, LoanDocumentService } = require('../../services');
const { BaseController } = require('../../common');
const { leadSectionStatus } = require('../../constants/lead.constant');

class EditDraftLeadController extends BaseController {
  constructor(request, response, loanRequestService) {
    super(request, response);
    this.loanRequestService = loanRequestService;
  }

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

  async validate() {
    const section = this.request.body.section;
    if (section === 'primary-applicants') {
      await Promise.all([
        check('first_name').optional().isString().run(this.request),
        check('middle_name').optional().isString().run(this.request),
        check('last_name').optional().isString().run(this.request),
        check('age').optional().isString().run(this.request),
        check('gender').optional().isString().run(this.request),
        check('appl_phone').optional().isString().run(this.request),
        check('email_id').optional().isString().run(this.request),
        check('father_fname').optional().isString().run(this.request),
        check('appl_pan').optional().isString().run(this.request),
        check('aadhar_card_num').optional().isString().run(this.request),
        check('resi_addr_ln1').optional().isString().run(this.request),
        check('resi_addr_ln1').optional().isString().run(this.request),
        check('city').optional().isString().run(this.request),
        check('state').optional().isString().run(this.request),
        check('pincode').optional().isString().run(this.request),
        check('address_same').optional().isNumeric().run(this.request),
        check('residence_status').optional().isString().run(this.request),
        check('per_addr_ln1').optional().isString().run(this.request),
        check('per_addr_ln2').optional().isString().run(this.request),
        check('per_city').optional().isString().run(this.request),
        check('per_state').optional().isString().run(this.request),
        check('per_pincode').optional().isString().run(this.request),
        check('residence_status').optional().isString().run(this.request),
      ]);
    } else if (section === 'entity-details') {
      await Promise.all([
        check('entity_type').optional().isString().run(this.request),
        check('entity_name').optional().isString().run(this.request),
        check('date_of_incorporation').optional().isString().run(this.request),
        check('com_addr_ln1').optional().isString().run(this.request),
        check('com_addr_ln2').optional().isString().run(this.request),
        check('com_city').optional().isString().run(this.request),
        check('com_state').optional().isString().run(this.request),
        check('com_pincode').optional().isString().run(this.request),
        check('address_same').optional().isNumeric().run(this.request),
        check('res_addr_ln1').optional().isString().run(this.request),
        check('res_addr_ln2').optional().isString().run(this.request),
        check('res_city').optional().isString().run(this.request),
        check('res_state').optional().isString().run(this.request),
        check('res_pincode').optional().isString().run(this.request),
        check('pan_no').optional().isString().run(this.request),
        check('urc_no').optional().isString().run(this.request),
        check('cin_no').optional().isString().run(this.request),
        check('gst_no').optional().isString().run(this.request),
      ]);
    } else if (section === 'co-applicants') {
      await Promise.all([
        check('_id').optional().isString().run(this.request),
        check('cb_fname').optional().isString().run(this.request),
        check('cb_mname').optional().isString().run(this.request),
        check('cb_lname').optional().isString().run(this.request),
        check('cb_father_fname').optional().isString().run(this.request),
        check('cb_phone').optional().isString().run(this.request),
        check('cb_father_mname').optional().isString().run(this.request),
        check('cb_father_lname').optional().isString().run(this.request),
        check('cb_resi_addr_ln1').optional().isString().run(this.request),
        check('cb_resi_addr_ln2').optional().isString().run(this.request),
        check('cb_city').optional().isString().run(this.request),
        check('cb_state').optional().isString().run(this.request),
        check('cb_pincode').optional().isNumeric().run(this.request),
        check('address_same').optional().isNumeric().run(this.request),
        check('cb_per_addr_ln1').optional().isString().run(this.request),
        check('cb_per_addr_ln2').optional().isString().run(this.request),
        check('cb_per_city').optional().isString().run(this.request),
        check('cb_per_state').optional().isString().run(this.request),
        check('cb_per_pincode').optional().isNumeric().run(this.request),
        check('cb_pan').optional().isString().run(this.request),
        check('cb_aadhaar').optional().isString().run(this.request),
        check('cb_dob').optional().isString().run(this.request),
        check('cb_gender').optional().isString().run(this.request),
        check('cb_relation_entity').optional().isString().run(this.request),
        check('cb_monthly_income').optional().isNumeric().run(this.request),
        check('cb_is_guar').optional().isString().run(this.request),
      ]);
    } else if (section === 'guarantors') {
      await Promise.all([
        check('gua_fname').optional().isString().run(this.request),
        check('gua_mname').optional().isString().run(this.request),
        check('gua_lname').optional().isString().run(this.request),
        check('gua_father_fname').optional().isString().run(this.request),
        check('gua_father_mname').optional().isString().run(this.request),
        check('gua_father_lname').optional().isString().run(this.request),
        check('gua_resi_addr_ln1').optional().isString().run(this.request),
        check('gua_resi_addr_ln2').optional().isString().run(this.request),
        check('gua_city').optional().isString().run(this.request),
        check('gua_state').optional().isString().run(this.request),
        check('gua_pincode').optional().isString().run(this.request),
        check('address_same').optional().isNumeric().run(this.request),
        check('gua_per_addr_ln1').optional().isString().run(this.request),
        check('gua_per_addr_ln2').optional().isString().run(this.request),
        check('gua_per_city').optional().isString().run(this.request),
        check('gua_per_state').optional().isString().run(this.request),
        check('gua_per_pincode').optional().isString().run(this.request),
        check('gua_pan').optional().isString().run(this.request),
        check('gua_aadhaar').optional().isString().run(this.request),
        check('gua_dob').optional().isString().run(this.request),
        check('gua_gender').optional().isString().run(this.request),
        check('gua_mobile').optional().isString().run(this.request),
        check('gua_email').optional().isString().run(this.request),
        check('guar_relation_entity').optional().isString().run(this.request),
        check('gua_monthly_income').optional().isString().run(this.request),
      ]);
    } else if (section === 'share-holding-details') {
      await Promise.all([check('share_holders').isArray().withMessage('share_holders must be an array')]);
    } else if (section === 'financial-documents') {
      await Promise.all([
        check('fina_docs_gstin').optional().isString().run(this.request),
        check('borro_bank_code').optional().isString().run(this.request),
        check('borro_bank_name').optional().isString().run(this.request),
        check('borro_bank_branch').optional().isString().run(this.request),
        check('borro_bank_acc_num').optional().isString().run(this.request),
        check('borro_bank_ifsc').optional().isString().run(this.request),
        check('borro_bank_type').optional().isString().run(this.request),
        check('doc_key').optional().isString().run(this.request),
        check('doc_code').optional().isString().run(this.request),
      ]);
    } else if (section === 'additional-documents') {
      await Promise.all([
        check('addi_docs_comment').optional().isString().run(this.request),
      ]);
    }

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const section = this.request.body.section;
      delete this.request.body.section;
      if (!['entity-details', 'co-applicants', 'guarantors', 'share-holding-details', 'financial-documents', 'additional-documents'].includes(section)) {
        throw new Error('section is not valid');
      }

      const { loanAppId } = this.request.params;

      if (section === 'co-applicants') {
        return await this.loanRequestService.updateCoBorrowerByLAid(loanAppId, {
          ...this.request.body,
          primary_status: leadSectionStatus.DRAFT,
        });
      } else if (section === 'guarantors') {
        return await this.loanRequestService.updateGuarantorByLAid(loanAppId, {
          ...this.request.body,
          primary_status: leadSectionStatus.DRAFT,
        });
      } else if (section === 'entity-details') {
        return await this.loanRequestService.update(
          { loan_app_id: loanAppId },
          {
            entity_details: {
              ...this.request.body,
              primary_status: leadSectionStatus.DRAFT,
            },
          },
        );
      } else if (section === 'primary-applicants') {
        return await this.loanRequestService.update({ loan_app_id: loanAppId }, { ...this.request.body, primary_status: leadSectionStatus.DRAFT });
      } else if (section === 'financial-documents') {
        const result =  await this.loanRequestService.update(
          { loan_app_id: loanAppId },
          {
              ...this.request.body,
          },
        );
        if (this.request.body.doc_key && this.request.body.doc_code) {
          new LoanDocumentService().updateLoanDocuments(
            {
              loan_app_id: loanAppId,
              code: this.request.body.doc_code,
            },
            { doc_key: this.request.body.doc_key },
          );
        }
        return result;
      } else if (section === 'share-holding-details') {
        return await this.loanRequestService.updateByLoanAppId(loanAppId, { share_holders: this.formatShareHolder(body.share_holders) });
      } else if (section === 'additional-documents') {
        return await this.loanRequestService.update(
          { loan_app_id: loanAppId },
          {
            addi_docs_comment : this.request.body?.addi_docs_comment,
          },
        );
      }
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let editDraftLeadController = new EditDraftLeadController(request, response, new LoanRequestService());
    return editDraftLeadController;
  }
}

module.exports = EditDraftLeadController;

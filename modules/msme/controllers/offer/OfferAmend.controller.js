const httpStatus = require('http-status');
const { OfferAmendService, ActivityLogService, ProductService, LoanRequestService } = require('../../services');
const { BaseController } = require('../../common');
const { ActivityLogConstant, leadConstant } = require('../../constants');
const { param, check, validationResult } = require('express-validator');
const { OfferHelper } = require('../../helper');
const axios = require('axios');
const moment = require('moment');

const offerApiUrl = process.env.OFFER_API_URL;
const authToken = process.env.SERVICE_MS_TOKEN; // Replace with your actual authorization token

class OfferAmendController extends BaseController {
  constructor(request, response, offerAmendService, activityLogService, loanRequestService, productService) {
    super(request, response);
    this.offerAmendService = offerAmendService;
    this.activityLogService = activityLogService;
    this.loanRequestService = loanRequestService;
    this.productService = productService;
  }

  async validate() {
    await Promise.all([
      check('loan_app_id').isString().withMessage('loan_app_id is a required field.').run(this.request), 
      check('offered_amount').optional().isNumeric().withMessage('offered_amount is a required field.').run(this.request), 
      check('offered_int_rate').optional().isNumeric().withMessage('offered_int_rate is a required field.').run(this.request), 
      check('offered_tenure').optional().isNumeric().withMessage('tenure is a required field.').run(this.request)
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { user_id } = this.request.authData;
      const { loan_app_id, offered_amount, offered_int_rate, offered_tenure } = this.request.body;
      let lead = await this.loanRequestService.findOne({ loan_app_id });
      if (!lead) {
        throw new Error(`lead doesn't exist for this loan_app_id.`);
      }
      const requiredPermission = leadConstant.CREDIT_PERMISSION;

      const hasPermission = this.request.authData.access_metrix_tags && this.request.authData.access_metrix_tags.includes(requiredPermission);
      //if not credit team then call offer api
      if (!hasPermission) {
        let product = await this.productService.findOne({ _id: lead?.product_id });
        if (!product.product_type_code) {
          throw new Error(`product_type_code doesn't exist for this loan_app_id.`);
        }
        
        //offer payload
        const payload_data = {
          loan_app_id,
          pan: lead?.appl_pan,
          product_type_code: product.product_type_code,
          company_id: lead?.company_id,
          loan_amount: offered_amount? offered_amount: lead.loan_amount,
          loan_tenure: offered_tenure? offered_tenure: lead.loan_tenure,
          interest_rate: offered_int_rate? offered_int_rate: lead.loan_interest_rate,
          product_id: lead?.product_id,
          consent:"Y",
          consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        const config = {
          headers: {
            Authorization: `${authToken}`,
            'Content-Type': 'application/json',
          },
        };
        const offer = await axios.post(offerApiUrl, payload_data, config);
                let { data } = offer;
        if (!data || !data.success) {
          throw new Error(`offer api failed`);
        }

        const new_data = {
          offered_amount: data.data.loan_amount,
          offered_int_rate: data.data.pricing,
          tenure: offered_tenure? offered_tenure: lead.loan_tenure,
          risk_cat: data.data.risk_cat,
          deviation_cat: data.data.deviation_cat,
          rejection_reasons: data.data.reasons ? data.data.reasons:[],
          program_type : data.data.program_type
        };
        //adding amend offer data
        await this.offerAmendService.updateofferByLAid(loan_app_id, new_data);
        await OfferHelper(data?.data, loan_app_id, user_id, lead?.partner_loan_app_id);
      } else {
        const new_data = {
          offered_amount,
          offered_int_rate,
          tenure: offered_tenure,
        };
        //adding amend offer data
        await this.offerAmendService.updateofferByLAid(loan_app_id, new_data);
      }
      
      //creating activity log
      await this.activityLogService.create({
        type: ActivityLogConstant.Types.REMARKS,
        updated_by: user_id,
        remarks: 'Amend offer detail updated',
        loan_app_id: loan_app_id,
        category: ActivityLogConstant.CategoryTypes.AMEND_OFFER_UPDATE,
        fields: this.request.body,
      });

      return { message: 'Offer updated successfully', success: true };
    } catch (error) {
      if(error && error.toJSON() && error.toJSON().status === 500){
        const { loan_app_id } = this.request.body;
        const { user_id } = this.request.authData;
        let lead = await this.loanRequestService.findOne({ loan_app_id });
        await OfferHelper({ loan_amount: 0}, loan_app_id, user_id, lead?.partner_loan_app_id);
      }
      throw error;
    }
  }

  static create(request, response) {
    let offerAmendController = new OfferAmendController(request, response, new OfferAmendService(), new ActivityLogService(), new LoanRequestService(), new ProductService());
    return offerAmendController;
  }
}

module.exports = OfferAmendController;

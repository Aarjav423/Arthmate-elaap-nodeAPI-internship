const { param, validationResult } = require('express-validator');

const { CamsDetailService } = require('../../services');
const { BaseController } = require('../../common');
const UTIL = require('../../utils/functions');
const httpStatus = require('http-status');
const { LoanSchema, ActivityLogs } = require('../../models');

class CamsDetailController extends BaseController {
  constructor(request, response, camsDetailService) {
    super(request, response);
    this.camsDetailService = camsDetailService;
  }

  static create(request, response) {
    let camsDetailController = new CamsDetailController(request, response, new CamsDetailService());
    return camsDetailController;
  }

  //get cams details
  getCamsDetails = async () => {
    try {
      const loan_app_id = this.request.params.loan_app_id;
      if (!loan_app_id) {
        return UTIL.errorResponse(this.response, {}, `loan_app_id required`, httpStatus.BAD_REQUEST);
      }
      const camsData = await this.camsDetailService.getByLoanAppId(loan_app_id);
      return UTIL.okResponse(this.response, camsData, `Cams details`);
    } catch (error) {
      return UTIL.errorResponse(this.response, {}, `Cams fetch failed`, httpStatus.BAD_REQUEST);
    }
  };

  //update cams details
  updateCamsDetails = async () => {
    const loan_app_id = this.request.params.loan_app_id;
    const body = this.request.body;
    if (!loan_app_id) {
      return UTIL.errorResponse(this.response, {}, `loan_app_id required`, httpStatus.BAD_REQUEST);
    }
    //check for loan
    const loanData = await LoanSchema.findOne({ loan_app_id });
    if (loanData) {
      return UTIL.errorResponse(this.response, {}, `cams can not be updated as loan exist`, httpStatus.BAD_REQUEST);
    }
    const camsData = await this.camsDetailService.updateByLoanAppId(loan_app_id, body);

    if (!camsData) {
      return UTIL.errorResponse(this.response, {}, `Cams detail update failed`, httpStatus.BAD_REQUEST);
    }
    //updating activity logs
    const cams_log_data = {
      type: 'activity',
      updated_by: this.request.user._id,
      remarks: 'cams fields updated',
      loan_app_id,
      category: 'cams_update',
      fields: body,
    };
    await ActivityLogs.create(cams_log_data);
    return UTIL.okResponse(this.response, camsData, `Cams details updated successfully`);
  };
}

module.exports = CamsDetailController;

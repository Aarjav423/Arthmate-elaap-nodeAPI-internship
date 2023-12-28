const { BaseService } = require('../common');
const { CamsDetailSchema } = require('../models');

class CamsDetailService extends BaseService {
  constructor() {
    super(CamsDetailSchema);
  }

  getByLoanAppId = async (loanAppId) => {
    return await this.model.findByLAID(loanAppId);
  };

  updateByLoanAppId = async (loanAppId, data) => {
    return await this.model.updateCamsDetails(loanAppId, data);
  };
}

module.exports = CamsDetailService;

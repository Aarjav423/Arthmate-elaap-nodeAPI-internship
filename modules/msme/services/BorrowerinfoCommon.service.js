const { BaseService } = require('../common');
const { BorrowerinfoCommon } = require('../models');

class BorrowerinfoCommonService extends BaseService {
  constructor() {
    super(BorrowerinfoCommon);
  }
  
  findByLoanAppIds = async (loanAppIds) => {
    return await this.model.findByLoanAppIds(loanAppIds);
  };

  findOneWithKBI = async(borrower_id) => {
    let query = {
      borrower_id: borrower_id,
    };
    return await this.model.findOne(query);
  };
}

module.exports = BorrowerinfoCommonService;

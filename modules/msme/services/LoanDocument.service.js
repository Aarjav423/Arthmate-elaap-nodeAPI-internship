const { BaseService } = require('../common');
const { LoanDocument } = require('../models');

class LeadDocumentService extends BaseService {
  constructor() {
    super(LoanDocument);
  }

  fetchLoanDocuments = async (loanAppId, code,borrowerId) => {
    if (code) {
      return this.model.findByCodeAndLoanAppID(code, loanAppId, borrowerId);
    }
    var query={
      loan_app_id: loanAppId
    }

    if(borrowerId){
      query= {
        ...query,
        borrower_id: borrowerId
      }
    }

    const loanDocuments = await this.model.find(query);
    return loanDocuments;
  };

  findByIdAndCodeThenUpdate = async(code, loan_app_id, data) => {
    var query = {
      loan_app_id: loan_app_id,
      code: code,
    };
    return await this.model.findOneAndUpdate(query, data, {});
  };

  updateLoanDocuments = async (query, payload) => {
    return await this.model.updateOne(query, { $set: payload });
  };
}

module.exports = LeadDocumentService;

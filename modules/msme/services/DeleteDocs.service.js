const { BaseService } = require('../common');
const { LoanDocument } = require('../models');

class DeleteDocumentService extends BaseService {
  constructor() {
    super(LoanDocument);
  }

  deleteDocumentById = async (loanAppId, code) => {
    const loanDocuments = await this.model.deleteDocs(loanAppId, code);
    return loanDocuments;
  };

  deleteDocumentsByIds = async (loanAppId, borrowerId, codes, codeIndex) => {
    const deletedDocuments = [];
    for (const code of codes) {
      if (code === '041') continue;
      let docsData = [];
      if (borrowerId) docsData = await this.model.findByCondition({ loan_app_id: loanAppId, borrower_id: borrowerId, code: code });
      else docsData = await this.model.findByCondition({ loan_app_id: loanAppId, code: code });
      if (docsData) {
        if (codeIndex && parseInt(codeIndex) >= 0) {
          const finalIndex = parseInt(codeIndex) - 1;
          let additional_file_url = docsData?.additional_file_url;
          if (additional_file_url && additional_file_url?.length > 1) {
            const file_url = additional_file_url[finalIndex];
            additional_file_url[finalIndex] = '';
            additional_file_url = additional_file_url.filter((el) => el);
            await this.model.findByIdAndCodeThenUpdate(code, loanAppId, { additional_file_url });
            deletedDocuments.push({ file_url });
          }
        } else {
          const deletedDocument = await this.model.deleteDocs(loanAppId, code, borrowerId);
          deletedDocuments.push(deletedDocument);
        }
      }
    }
    return deletedDocuments;
  };
}

module.exports = DeleteDocumentService;

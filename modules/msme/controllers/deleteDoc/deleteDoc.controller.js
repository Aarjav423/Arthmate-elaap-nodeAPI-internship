const httpStatus = require('http-status');

const { DeleteDocumentService } = require('../../services');
const { BaseController } = require('../../common');
const S3Helper = require('../../../../util/s3helper');

class DeleteDocumentController extends BaseController {
  constructor(request, response, deleteDocumentService) {
    super(request, response);
    this.deleteDocumentService = deleteDocumentService;
  }

  async execute() {
    try {
      const loanAppId = this.request.body.loanAppId;
      const borroweId = this.request.body?.borrowerId ? this.request.body.borrowerId : null;
      const code = this.request.body.code;
      const codeIndex = this.request.body.codeIndex;
      const datas = await this.deleteDocumentService.deleteDocumentsByIds(loanAppId, borroweId, code, codeIndex);
      const s3Urls = [];
      for (const data of datas) {
        const s3Url = data.file_url;
        s3Urls.push(s3Url);
      }
      await S3Helper.deleteS3Objects(s3Urls);
      return { message: 'Deleted successfully', success: true };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let deleteDocumentController = new DeleteDocumentController(request, response, new DeleteDocumentService());
    return deleteDocumentController;
  }
}

module.exports = DeleteDocumentController;

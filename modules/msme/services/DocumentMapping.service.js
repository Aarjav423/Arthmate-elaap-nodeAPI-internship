const { BaseService } = require('../common');
const { DocumentMapping } = require('../models');

class DocumentMappingService extends BaseService {
    constructor() {
        super(DocumentMapping);
    }

    getAll = async() => {
        return await this.model.find();
      };
}

module.exports = DocumentMappingService;

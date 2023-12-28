const { BaseService } = require('../common');
const { SectionSchema } = require('../models');

class LeadSectionService extends BaseService {
  constructor() {
    super(SectionSchema);
  }

  async delete(query){
    return await this.model.findOneAndDelete({...query})
  }
}

module.exports = LeadSectionService;

const { BaseService } = require('../common');
const { LeadSubmission } = require('../models');

class LeadSubmissionService extends BaseService {
  constructor() {
    super(LeadSubmission);
  }
}

module.exports = LeadSubmissionService;

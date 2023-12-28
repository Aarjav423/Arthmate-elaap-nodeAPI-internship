const { BaseService } = require('../common');
const { SingleDataTranslation } = require('../models');

class SinglDataTranslationService extends BaseService {
  constructor() {
    super(SingleDataTranslation);
  }
}

module.exports = SinglDataTranslationService;
const { BaseService } = require('../common');
const { OfferDetails } = require('../models');

class OfferDetailsService extends BaseService {
  constructor() {
    super(OfferDetails);
  }
}

module.exports = OfferDetailsService;

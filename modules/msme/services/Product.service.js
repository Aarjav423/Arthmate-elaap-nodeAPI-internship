const { BaseService } = require('../common');
const { Products } = require('../models');

class ProductService extends BaseService {
  constructor() {
    super(Products);
  }
}

module.exports = ProductService;

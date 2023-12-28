const axios = require('axios');
const jwt = require('../util/jwt');
const bodyParser = require('body-parser');
const productSchema = require('../models/product-schema.js');
const validationsConfigSchema = require('../models/validation-config-schema.js');

module.exports = (app, connection) => {


  app.get('/api/validation-checks', async (req, res) => {
    try {
      const validations = await validationsConfigSchema.find({});
      res.status(200).json(validations);
    } catch (error) {
      res.status(400).json(error);
    }
  });
}

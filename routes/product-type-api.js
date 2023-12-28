const bodyParser = require('body-parser');
const ProductType = require('../models/product-type-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/product-type', async (req, res) => {
    try {
      const productType = await ProductType.getAll();
      res.send(productType);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/product-type', async (req, res) => {
    try {
      const userData = req.body;
      const userRes = await ProductType.addOne(userData);
      if (!userRes)
        throw {
          message: 'Error while adding product data to database',
        };
      return res.send({
        message: 'Product created successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

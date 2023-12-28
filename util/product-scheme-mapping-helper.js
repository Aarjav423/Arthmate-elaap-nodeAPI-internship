const bodyParser = require('body-parser');
const ProductSchemeMappingSchema = require('../models/product-scheme-mapping-schema.js');

const isProductSchemeRelationCorrect = async (req, res, next) => {
  try {
    const product_id = req.body.product_id;
    const scheme_id = req.body.scheme_id;
    if (parseInt(product_id) !== req.product._id) {
      throw {
        success: false,
        message: 'Product_id Mismatched',
      };
    }
    //check if row exist
    let rowExist = await ProductSchemeMappingSchema.getByProductAndSchemeId({
      product_id: product_id,
      scheme_id: scheme_id,
    });
    if (rowExist) {
      throw {
        success: false,
        message: 'Combination already exist',
      };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = {
  isProductSchemeRelationCorrect,
};

const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const jwt = require('../../util/jwt');
const Product = require('../../models/product-schema.js');
const productSchemeMapping = require('../../models/product-scheme-mapping-schema.js');
const productSchemeMappingHelper = require('../../util/product-scheme-mapping-helper');
const ProductSchemeMappingSchema = require('../../models/product-scheme-mapping-schema.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to Fetch All Product
  app.get(
    '/api/product-scheme/products/all',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const productList = await ProductSchemeMappingSchema.getAll();
        if (!productList.length)
          throw {
            message: 'No records found',
          };
        const productIds = productList.map((ele) => ele.product_id);
        let resp = await Product.findByPIds(productIds);
        const filteredList = resp.map((ele) => ({
          key: ele.name,
          value: ele._id,
        }));
        res.json(filteredList);
      } catch (error) {
        console.log('error::', error);
        return res.status(400).send({
          error,
        });
      }
    },
  );

  app.get('/api/product-scheme/active', [jwt.verifyToken], async (req, res) => {
    try {
      const activeProductList = await Product.findAllActive();
      if (!activeProductList.length)
        throw {
          message: 'No active products found',
        };
      const filteredList = activeProductList.map((ele) => ({
        key: ele.name,
        value: ele._id,
      }));
      res.json(filteredList);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  //API to Fetch All Product-scheme
  app.get(
    '/api/product-scheme/scheme/:product_id',
    [jwt.verifyToken, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { product_id } = req.params;
        const schemeList =
          await productSchemeMapping.getAllSchemeByProductId(product_id);
        if (!schemeList.length)
          throw {
            message: 'No records found',
          };
        res.json(schemeList);
      } catch (error) {
        console.log('error::', error);
        return res.status(400).send({
          error,
        });
      }
    },
  );
  // API to fetch product scheme mapping
  app.get(
    '/api/product-scheme/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const { page, limit } = req.params;
        const { product_id, scheme_id, status } = req.query;
        if (
          status &&
          String(status).toLowerCase() !== 'true' &&
          String(status).toLowerCase() !== 'false'
        ) {
          throw {
            sucess: false,
            message: 'Invalid status',
          };
        }
        const productSchemeMappingResp =
          await ProductSchemeMappingSchema.getFilteredProductSchemeMapping({
            scheme_id,
            product_id,
            page,
            limit,
            status,
          });
        if (!productSchemeMappingResp.rows.length)
          throw {
            sucess: false,
            message: 'No Product Scheme Mapping Exist For Provided Filter',
          };
        return res
          .status(200)
          .send({ success: true, data: productSchemeMappingResp });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );
  // API to filter product scheme mapping
  app.post(
    '/api/product-scheme',
    [
      jwt.verifyToken,
      jwt.verifyProduct,
      jwt.verifyUser,
      [
        check('product_id').notEmpty().withMessage('product_id is required'),
        check('scheme_id').notEmpty().withMessage('scheme_id  is required'),
      ],
      productSchemeMappingHelper.isProductSchemeRelationCorrect,
    ],
    async (req, res) => {
      try {
        let inputs = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };

        //insert into collection
        let insertResp = await ProductSchemeMappingSchema.addNew({
          product_id: inputs?.product_id,
          scheme_id: inputs?.scheme_id,
          created_by: req?.user?.email || null,
          status: true,
        });
        if (!insertResp)
          throw {
            sucess: false,
            message: 'DB insertion failed',
          };
        return res.status(200).json({
          success: true,
          message: 'Product Scheme mapping is added successfully',
        });
      } catch (err) {
        return res.status(400).json(err);
      }
    },
  );
  // API to UPDATE product scheme STATUS
  app.put(
    '/api/product-scheme/:id',
    [
      jwt.verifyToken,
      jwt.verifyProduct,
      [
        check('status').notEmpty().withMessage('status is required'),
        check('status')
          .trim()
          .isBoolean()
          .withMessage('Status must be a boolean true or false'),
      ],
    ],

    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const { id } = req.params;
        let sts = false;
        //update collection
        if (req.body.status == '1') {
          sts = true;
        }
        let updateResp = await ProductSchemeMappingSchema.updateStatus(id, sts);
        if (!updateResp)
          throw {
            sucess: false,
            message: 'Status Updation failed',
          };
        return res.status(200).json({
          success: true,
          message: 'Product Scheme mapping updated successfully',
        });
      } catch (err) {
        return res.status(400).json(err);
      }
    },
  );
};

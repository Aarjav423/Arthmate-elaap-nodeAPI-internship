bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const auth = require('../services/auth/auth.js');
const Product = require('../models/product-schema.js');
const Company = require('../models/company-schema.js');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const validate = require('../util/validate-req-body');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const LoanSchemaModel = require('../models/loanschema-schema.js');
const { generateLoanKey } = require('../util/product-helper.js');

module.exports = (app) => {
  app.use(bodyParser.json());

  const pad = (num, size) => {
    const repeatTime =
      num.toString().length < size ? size - num.toString().length : 0;
    return '0'.repeat(repeatTime) + num;
  };

  const generateRandomString = (length, chars) => {
    var result = '';
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  //get all products
  app.get('/api/product/all', async (req, res) => {
    try {
      const productList = await Product.getAll();
      if (!productList.length)
        throw {
          message: 'No records found',
        };
      res.json(productList);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  //get all active loan products
  app.get('/api/product/active', async (req, res) => {
    try {
      const activeProductList = await Product.findAllActive();
      if (!activeProductList.length)
        throw {
          message: 'No active products found',
        };
      res.json(activeProductList);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  //get products by id
  app.get('/api/product/:_id', async (req, res) => {
    try {
      const productById = await Product.findById(req.params._id);
      if (!productById)
        throw {
          message: 'No products found',
        };
      res.json(productById);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  //get product by company_id
  app.get('/api/get_products_by_company_id/:company_id', async (req, res) => {
    try {
      const productByCompanyId = await Product.findByCompanyId(
        req.params.company_id,
      );
      if (!productByCompanyId.length)
        throw {
          message: 'No products found',
        };
      res.send(productByCompanyId);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //get product by loc company_id
  app.get(
    '/api/get_products_by_loc_company_id/:company_id',
    async (req, res) => {
      try {
        const productByCompanyId = await Product.findByLocCompanyId(
          req.params.company_id,
        );
        if (!productByCompanyId.length)
          throw {
            message: 'No products found',
          };
        res.send(productByCompanyId);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // create or update product by api url
  app.post(
    '/api/product/:company_id/:loan_schema_id/:product_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    validate.validateProductData,
    generateLoanKey,
    async (req, res, next) => {
      try {
        // Capture parameters passed in api url
        const { company_id, loan_schema_id, product_id } = req.params;
        // Check for mandatory company_id and loan_schema_id in url params
        if (
          !company_id ||
          !loan_schema_id ||
          company_id === 'null' ||
          company_id === 'undefined' ||
          loan_schema_id === 'null' ||
          loan_schema_id === 'undefined'
        )
          throw {
            success: false,
            message:
              'company_id and loan_schema_id are required and cannot be undefined or null',
          };
        // Check whether company_id in url and in token are matching
        if (company_id != req.company._id) {
          throw {
            success: false,
            message: 'company_id mismatch in url and token',
          };
        }
        // Check whether loan_schema_id belongs to company_id passed
        const validateLoanSchema = await LoanSchemaModel.findOneWithCondition({
          _id: loan_schema_id,
          company_id,
        });
        if (!validateLoanSchema) {
          throw {
            success: false,
            message: 'Provided loan_schema_id does not belongs to company_id',
          };
        }
        if (!validateLoanSchema.status) {
          throw {
            success: false,
            message: 'Unable to perform action as loan_schema is inactive.',
          };
        }
        if (
          req.body.is_lender_selector_flag === 'Y' &&
          req.body.product_type_name === ''
        ) {
          throw {
            success: false,
            message: 'please select a product type',
          };
        }
        if (
          req.body.is_lender_selector_flag === 'Y' &&
          req.body.co_lenders.length == 0
        ) {
          throw {
            success: false,
            message: 'please select a colender',
          };
        }
        if (
          req.body.is_lender_selector_flag === 'Y' &&
          req.body.days_in_year === ''
        ) {
          throw {
            success: false,
            message: 'please select  Days in Calender Year',
          };
        }
        if (
          req.body.is_msme_automation_flag === 'Y' &&
          req.body.vintage === ''
        ) {
          throw {
            success: false,
            message: 'please select vintage',
          };
        }
        if (
          req.body.is_msme_automation_flag === 'Y' &&
          req.body.first_installment_date === ''
        ) {
          throw {
            success: false,
            message: 'please select First Installment Date',
          };
        }

        // Validate mandatory parameters in body
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = req.body;

        data.company_id = company_id;
        data.loan_schema_id = loan_schema_id;
        // add GST, CGST, SGST, IGST % in DATA
        data.cgst_on_pf_perc = 9;
        data.sgst_on_pf_perc = 9;
        data.igst_on_pf_perc = 18;
        data.gst_on_pf_perc = 18;
        // Validate the product name as per regular expression
        const regexp = /^[a-zA-Z0-9-_]+$/;
        if (!regexp.test(req.body.name)) {
          throw {
            success: false,
            message: 'Special characters are not allowed in product name.',
          };
        }
        // If product_id in the url params is null
        if (product_id === 'null' || product_id === 'undefined') {
          // check the uniqueness of product

          const productAlreadyExist = await Product.findByProductName(
            data.name,
          );
          if (productAlreadyExist) {
            throw {
              success: false,
              message: 'This product name is already in use',
            };
          }

          //add the product data in product table.

          const addProduct = await Product.addNew(data);
          if (!addProduct) {
            throw {
              success: false,
              message: 'Something went wrong while adding product data',
            };
          }
          if (addProduct) {
            return res.status(200).send({
              success: true,
              message: 'Product created successfully',
              productData: addProduct,
            });
          }
        }
        // If product id in the url is not null
        if (product_id && product_id !== 'null') {
          // IF product_id is provided check whether product belongs to company_id and loan_schema_id
          const validateProductOwnership = await Product.findByCondition({
            _id: product_id,
            company_id,
            loan_schema_id,
          });
          if (!validateProductOwnership) {
            throw {
              success: false,
              message:
                'product_id does not belongs to passed company_id and loan_schema_id',
            };
          }
          //check if any loan is already booked under that product id
          const loanAlreadyBooked =
            await LoanRequestSchema.findByProductId(product_id);
          //update if there is a change in penny drop
          const productData = await Product.findProductId(product_id)
          if (req.body.penny_drop !== productData.penny_drop) {
            const body = req.body;
            const productID = {
              _id: product_id,
            };
            const updatePennyDrop = {
              penny_drop: body.penny_drop,
            };
            const updateProduct = await Product.updateData(
              updatePennyDrop,
              productID,
            );
            if (!updateProduct) {
              throw {
                success: false,
                message: 'Error while updating penny drop',
              };
            }
            if (updateProduct) {
              return res.status(200).send({
                success: true,
                message: 'Penny drop updated successfully',
                data: updateProduct,
              });
            }
          } else {
            //if loan is already booked then dont allow to modify the product and throw the error.
            if (loanAlreadyBooked.length && loanAlreadyBooked[0] !== null) {
              throw {
                success: false,
                message:
                  'Unable to modify the product as loans are already booked under this product',
              };
            }
          }
          //update already existing product by product_id
          delete data.product_id;
          delete data.company_id;
          delete data.loan_schema_id;
          delete data.name;
          const updateProduct = await Product.updateData(data, {
            _id: product_id,
          });
          if (!updateProduct) {
            throw {
              success: false,
              message: 'Error while updating product data',
            };
          }
          if (updateProduct) {
            return res.status(200).send({
              success: true,
              message: 'Product data updated successfully',
              data: updateProduct,
            });
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // create new product
  app.post(
    '/api/product',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    [
      check('name').notEmpty().withMessage('product_name is required'),
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('loan_schema_id')
        .notEmpty()
        .withMessage('loan_schema_id is required'),
      check('auto_check_credit')
        .notEmpty()
        .withMessage('auto_check_credit is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const productBody = req.body;
        const regexp = /^[a-zA-Z0-9-_]+$/;
        const validateProductName =
          req.body.name.search(regexp) === -1 ? true : false;
        if (validateProductName)
          return res.status(422).json({
            message: 'Special characters not allowed in product name.',
          });
        if (
          productBody.auto_check_credit === 1 &&
          !productBody.credit_rule_grid_id
        )
          return res.status(400).json({
            message: 'Please select credit grid',
          });
        productBody.android_links = productBody.product_app
          ? productBody.android_links.toString()
          : '';
        productBody.ios_links = productBody.ios_links
          ? productBody.ios_links.toString()
          : '';
        productBody.other_links = productBody.other_links
          ? productBody.other_links.toString()
          : '';
        productBody.bureau_partner_id = productBody.bureau_partner_id;
        productBody.bureau_partner_name = productBody.bureau_partner_name;
        productBody.company_id = req.company._id;
        productBody.loan_schema_id = productBody.loan_schema_id;
        productBody.updated_by = req.user._id;
        productBody.code = `${req.company.code.substring(0, 3)}`;
        productBody.disburse_first_approach =
          productBody.disburse_first_approach;
        productBody.automatic_check_credit = productBody.auto_check_credit;
        productBody.loan_key = generateRandomString(
          3,
          '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        );
        const companyCount = await Company.getCompanyCount();
        const productCount = await Product.getProductCount();
        const productExist = await Product.findIfExistsByName(productBody.name);
        if (productExist)
          throw {
            message: 'This product name is already in use',
          };
        const company_code_digit = companyCount
          ? Number(companyCount) + Number(productCount) + 1
          : '001';
        productBody.va_num =
          process.env.IDFC_PREFIX + pad(Number(company_code_digit), 4);
        const addProduct = await Product.addNew(productBody);
        if (addProduct)
          return res.send({
            message: 'Product added successfully.',
            addProduct,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post('/api/get_product_data_by_id', async (req, res) => {
    try {
      const productResponse = await Product.findById(req.body.product_id);
      if (!productResponse)
        throw {
          message: 'No products found',
          success: false,
        };
      return res.send(productResponse);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  //change the product status (Active or Inactive)
  app.put(
    '/api/product/status',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res) => {
      try {
        const UpdateStatus = await Product.updateStatus(
          req.body.id,
          req.body.status,
        );
        if (!UpdateStatus)
          throw {
            message: 'Error while updating product status.',
          };
        const msg = req.body.status == 1 ? 'activated' : 'deactivated';
        res.send({
          message: `Product ${msg}.`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //update bureau partner against product
  app.put(
    '/api/product/bureau_partner',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        const productExist = await Product.findById(data.product_id);
        if (!productExist)
          throw {
            message: 'Product does not exist in database',
          };
        const updateData = {
          bureau_partner_id: data.bureau_partner_id,
          bureau_partner_name: data.bureau_partner_name,
        };
        const updateCondition = {
          _id: data.product_id,
        };
        const UpdateBureauPartner = await Product.updateData(
          updateData,
          updateCondition,
        );
        if (!UpdateBureauPartner)
          throw {
            message: 'Error while updating bureau partner against product.',
          };
        res.send({
          message: 'Bureau partner updated successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //get product by co_lenders

  app.get('/api/co-lenders-product/:co_lender_id', async (req, res) => {
    try {
      const productByColenderId = await Product.findByColenders(
        parseInt(req.params.co_lender_id),
      );
      if (!productByColenderId.length)
        throw {
          message: `No products coresponding to co_lender_id ${req.params.co_lender_id} found`,
        };

      let returnObjArr = await Promise.all(
        productByColenderId.map(async (product) => {
          let company = await Company.getById(product.company_id);

          return {
            product_id: product._id,
            product_name: product?.name || null,
            company_id: product.company_id,
            company_name: company?.name || null,
          };
        }),
      );

      res.send(returnObjArr);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //get product by msme company_id
  app.get(
    '/api/get_products_by_msme_company_id/:company_id',
    async (req, res) => {
      try {
        const productByCompanyId = await Product.findByMsmeCompanyId(
          req.params.company_id,
        );
        if (!productByCompanyId.length)
          throw {
            message: 'No products found',
          };
        res.send(productByCompanyId);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

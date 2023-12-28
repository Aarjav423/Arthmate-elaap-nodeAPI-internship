bodyParser = require("body-parser");
const jwt = require("../util/jwt");
bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const Tokens = require('../models/tokens-schema.js');
const Product = require('../models/product-schema.js');
const moment = require('moment');
const ColenderProfile = require('../models/co-lender-profile-schema')

module.exports = (app) => {
  app.use(bodyParser.json());

  app.get('/api/tokens', async (req, res) => {
    try {
      const listTokens = await Tokens.listAll();
      if (!listTokens.length)
        throw {
          message: 'No tokens found.',
        };
      return res.send(listTokens);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get("/api/tokens/:company_id/:product_id/:co_lender_id", async (req, res) => {
    try {
      if(req.params.co_lender_id !== 'null') {
        const query = {
          co_lender_id: req.params.co_lender_id,
        };
        const tokenByCoLenderId = await Tokens.findByCoLenderId(query);
        if (!tokenByCoLenderId.length)
        throw {
          success: false,
          message: "No records found."
        };
        return res.send(tokenByCoLenderId);
      }
      const query = {
        company_id: req.params.company_id,
        product_id: req.params.product_id,
      };
      const tokenByCompanyIdProducutId =
        await Tokens.getByCpompanyIdProductID(query);
      if (!tokenByCompanyIdProducutId.length)
        throw {
          success: false,
          message: 'No records found.',
        };
      return res.send(tokenByCompanyIdProducutId);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/tokens',
    [
      check('token_id').notEmpty().withMessage('Token id is required'),
      check('company_id').notEmpty().withMessage('Company id is required'),
    ],
    async (req, res) => {
      try {
        //Validate data in the payload.
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const reqData = req.body;
        let tokenData = {
          token_id: reqData.token_id,
          company_id: reqData.company_id,
          company_code: reqData.company_code ? reqData.company_code : '',
          product_id: reqData.product_id ? reqData.product_id : '',
          type: reqData.type,
          user_id: reqData.user_id,
          user_name: reqData.user_name ? reqData.user_name : '',
          status: 1,
        };
        if (reqData.product_id) {
          //Check product exist by product_id.
          const findProduct = await Product.findById(reqData.product_id);
          if (!findProduct)
            throw {
              success: false,
              message: 'Error while checking product details',
            };
          //Validate the status of fetched product.
          if (!findProduct.status)
            throw { success: false, message: 'Product is not active.' };
          tokenData.name =
            findProduct.name + '-' + moment().format('YYYY-MM-DD');
        } else {
          tokenData.name =
            reqData.company_code + '-' + moment().format('YYYY-MM-DD');
        }
        // Record token in token schema
        const recordToken = await Tokens.addNew(tokenData);
        if (!recordToken)
          throw { success: false, message: 'Error while registering token' };
        if (recordToken) {
          return res.status(200).send({
            success: true,
            message: 'Token registered successfully.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put('/api/tokens/status', async (req, res) => {
    try {
      //Check if token exist by token_id
      const tokenExist = await Tokens.findByTokenId(req.body.token_id);
      if (!tokenExist)
        throw { success: false, message: 'Token does not exist.' };
      if (tokenExist.expired === req.body.expired)
        return res
          .status(200)
          .send({ success: true, message: 'Token updated successfully.' });
      const msg = req.body.expired == 1 ? 'Inactive' : 'Active';
      const updateTokenStatus = await Tokens.updateStatus(
        req.body.token_id,
        req.body.expired,
      );
      if (updateTokenStatus)
        return res.send({
          message: `Token status changed to ${msg}`,
        });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/tokens_delete', async (req, res) => {
    try {
      // check if token exist by token_id
      const tokenExist = await Tokens.findByTokenId(req.body.token_id);
      if (!tokenExist)
        throw { success: false, message: 'Token does not exist.' };
      const deleteToken = await Tokens.deleteById(req.body.token_id);
      if (!deleteToken)
        throw { success: false, message: 'Error while deleting token.' };
      return res
        .status(200)
        .send({ success: true, message: 'Token deleted successfully.' });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  // generate token for co-lender
  app.post(
    "/api/token-co-lenders",
    [jwt.verifyToken, jwt.verifyUser],
    [
      check("token_id")
        .notEmpty()
        .withMessage("Token id is required"),
      check("co_lender_id")
        .notEmpty()
        .withMessage("Co-lender id is required"),
      check("co_lender_shortcode")
        .notEmpty()
        .withMessage("Co-lender shortcode is required")
    ],
    async(req,res) => {
      try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({
            message : errors.errors[0]["msg"]
          });
        }
        const data = req.body;
        const colender = await ColenderProfile.findByCoLenderIdAndShortCode(data.co_lender_id,data.co_lender_shortcode);
        if(!colender) {
          throw {
            success : false,
            message : "Co-lender not found in the system"
          }
        }
        if(colender.status !== 1) {
          throw {
            success : false,
            message : "Co-lender is not active"
          }
        }
        let tokenData = {
          token_id : data.token_id,
          co_lender_id : colender.co_lender_id,
          co_lender_shortcode : colender.co_lender_shortcode,
          name : colender.co_lender_shortcode + "-" + moment().format("YYYY-MM-DD"),
          type : data.type,
          user_id : data.user_id,
          user_name : data.user_name ? data.user_name : "",
          status : 1
        };
        const savedTokendata = await Tokens.addNew(tokenData);
        if(!savedTokendata) {
          throw {
            success : false,
            message : "Failed to generate token data"
          }
        }
        
        return res.status(200).send({
          success : true,
          message : "Token data generated successfully"
        })
      } catch(err) {
        return res.status(400).status(err)
      }
    }
  )
};

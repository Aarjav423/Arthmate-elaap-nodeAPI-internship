"use strict";
const ColenderProfileSchema = require("../models/co-lender-profile-schema.js");
const jwt = require('jsonwebtoken');
const UserSchema = require('../models/user-schema');
const CompanySchema = require('../models/company-schema');
const ProductSchema = require('../models/product-schema');
const LoanSchemaModel = require('../models/loanschema-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LeadSchema = require('../models/loan-request-schema.js');
const moment = require('moment');
const RoleMetrix = require('../models/roles-schema.js');
const cache = require('memory-cache');
const TokenSchema = require('../models/tokens-schema.js');
const CACHE_EXPIRE = 60 * 5 * 1;

const verifyToken = async (req, res, next) => {
  try {
    const bearerHeader = req.headers['authorization'];
    // const company_code = req.headers["company_code"] || "";
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      throw {
        message: 'Forbidden',
        success: false,
      };
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    const authData = jwt.verify(bearerToken, process.env.SECRET_KEY);
    if (!authData)
      throw {
        message: 'Forbidden',
        success: false,
      };
    if (
      authData.type !== 'api' &&
      authData.type !== 'dash-api' &&
      authData.type !== 'dash' &&
      authData.type !== 'service'
    )
      throw {
        message: 'Forbidden invalid type of token',
        success: false,
      };
    if (authData.environment !== process.env.ENVIRONMENT)
      throw {
        message: 'Forbidden cross environment',
        success: false,
      };
    //Validate if token is exist and active
    if (authData.type === 'api' || authData.type === 'service') {
      //Verify if token exist by token id
      const tokenExist = await TokenSchema.findByTokenId(authData.token_id);
      if (!tokenExist)
        throw { success: false, message: 'Forbiden, invalid token!' };
      //Verify if the token is in active status
      if (tokenExist.expired === 1)
        throw { success: false, message: 'Forbidden, inactive token!' };
      //Valiadate company_id of authdata with the comapny_id  of fetched token
      if (authData.company_id !== Number(tokenExist.company_id))
        throw { success: false, message: 'Forbidden,company_id mismatch!' };
      if (authData.type === 'api' && tokenExist.product_id) {
        //Valiadate product_id of authdata with the product_id  of fetched token
        if (authData.product_id !== Number(tokenExist.product_id))
          throw { success: false, message: 'Forbidden,product_id mismatch!' };
      }
    }
    if (
      authData.hasOwnProperty('user_id') &&
      (authData.type === 'dash' || authData.type === 'dash-api')
    ) {
      //Fetch user data aginst user_id.
      let userData = await UserSchema.findById(authData.user_id);
      userData = JSON.parse(JSON.stringify(userData));
      //If user status is inavtive throw error.
      if (!userData.status) throw { success: false, message: 'Forbidden!' };
      // If user.last_login_at then check the diff between current date and last_login_at.
      if (userData.hasOwnProperty('last_login_at')) {
        if (userData.last_login_at) {
          const diffFromLastLogin = moment().diff(
            moment(userData.last_login_at),
            'days',
          );
          if (diffFromLastLogin > 0)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Login session expired.',
            });
        }
      }
      //If user.password_updated_at then check the diff between today and password_updated_at, if it is greater than 180 days throw error.
      if (userData.hasOwnProperty('password_updated_at')) {
        if (userData.password_updated_at) {
          const passwordUpdatedDiff = moment().diff(
            moment(userData.password_updated_at),
            'days',
          );
          if (passwordUpdatedDiff > 180)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Password is expired,please reset password.',
            });
        }
      }
    }
    req.authData = authData;
    next();
  } catch (error) {
    console.log('error', error);
    return res.status(400).send(error);
  }
};

const verifyUser = async (req, res, next) => {
  try {
    var user = await UserSchema.findById(req.authData.user_id);
    if (!user)
      throw {
        message: 'Invalid user',
      };
    if (!user.status)
      throw {
        message: 'User is not active',
      };
    let roleMatrixData = [];
    user = JSON.parse(JSON.stringify(user));
    await Promise.all(
      user?.role_metrix.map(async (role) => {
        const data = await RoleMetrix.findIfExistById(role.id);
        roleMatrixData = [...roleMatrixData, ...data.tags];
      }),
    );
    user.roleMatrixData = roleMatrixData;
    req.user = user;
    next();
  } catch (err) {
    console.log('error', err);
    return res.status(400).send(err);
  }
};
/**
 * Middleware to verify provided JWT to be of valid admin user.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
const verifyAdminUser = async (req, res, next) => {
  try {
    const bearerHeader = req.headers['authorization'];
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      //Throw exception if header is missing.
      throw {
        message: 'Forbidden',
        success: false,
      };
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    const authData = jwt.verify(bearerToken, process.env.SECRET_KEY);
    const roles = authData.userroles;
    if (!roles.find((role) => role.toLowerCase() == 'admin')) {
      //Throw exception if user does not have role as admin.
      throw {
        message: 'Forbidden',
        success: false,
      };
    }
    next();
  } catch (error) {
    //Return 400
    return res.status(400).send(error);
  }
};

const verifyCompany = async (req, res, next) => {
  try {
    if (req.authData?.skipCIDPID) return next();

    var company = await CompanySchema.findById(req.authData.company_id);
    if (!company)
      throw {
        message: 'Invalid company',
      };
    if (
      (!company.status && req.authData.type === 'api') ||
      (!company.status && req.authData.type === 'service') ||
      (!company.status && req.authData.type === 'dash-api')
    )
      throw {
        message: 'Company is not active',
      };
    req.company = company;
    next();
  } catch (error) {
    console.log('verifyCompany err', error);
    return res.status(400).send(error);
  }
};

const verifyCompanyForAllPartners = async (req, res, next) => {
  try {
    if (req.authData.company_id != '00') {
      var company = await CompanySchema.findById(req.authData.company_id);
      if (!company)
        throw {
          message: 'Invalid company',
        };
      if (
        (!company.status && req.authData.type === 'api') ||
        (!company.status && req.authData.type === 'service') ||
        (!company.status && req.authData.type === 'dash-api')
      )
        throw {
          message: 'Company is not active',
        };
      req.company = company;
    }
    next();
  } catch (err) {
    return res.status(400).send({
      err,
    });
  }
};

const verifyCompanyCached = (req, res, next) => {
  var recentCachedData;
  var cacheKey;
  if (req.authData.company_id) {
    cacheKey = 'utils-jwt-verify-company.' + req.authData.company_id;
  }
  var recentCachedData = cache.get(cacheKey);
  if (recentCachedData) {
    req.company = recentCachedData;
    return next();
  }
  CompanySchema.findById(req.authData.company_id, (err, company) => {
    if (err || !company)
      return res.status(403).send({
        message: 'Invalid company',
      });
    if (
      (!company.status && req.authData.type === 'api') ||
      (!company.status && req.authData.type === 'service') ||
      (!company.status && req.authData.type === 'dash-api')
    )
      return res.status(403).send({
        message: 'Company is not active',
      });
    req.company = company;
    if (cacheKey) {
      cache.put(cacheKey, company, CACHE_EXPIRE);
    }
    next();
  });
};

const verifyProduct = async (req, res, next) => {
  try {
    if (req.authData?.skipCIDPID) return next();
    const product = await ProductSchema.findById(req.authData.product_id);
    if (!product)
      throw {
        message: 'Product not found',
      };
    if (
      (!product.status && req.authData.type === 'api') ||
      (!product.status && req.authData.type === 'dash-api')
    )
      throw {
        message: 'Product not active',
      };
    req.product = product;
    const schema = await LoanSchemaModel.findById(product.loan_schema_id);
    if (!schema)
      throw {
        message: 'Schema not found',
      };
    if (!schema.status)
      throw {
        message: 'Schema not active',
      };
    req.loanSchema = schema;
    next();
  } catch (error) {
    console.log('verifyProduct error', error);
    return res.status(400).send(error);
  }
};

const verifyLoanSchema = async (req, res, next) => {
  try {
    const schema = await LoanSchemaModel.findById(req.product.loan_schema_id);
    if (!schema)
      throw {
        message: 'Schema not found',
      };
    if (!schema.status)
      throw {
        message: 'Schema not active',
      };
    req.loanSchema = schema;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const verifyBodyLengthDynamic = (req, res, next) => {
  if (
    req.authData.type === 'api' &&
    req.body.length > req.product.multiple_record_count
  )
    return res.status(402).send({
      message: `Please send only ${req.product.multiple_record_count} record`,
    });
  next();
};

const verifyBodyLength = (req, res, next) => {
  if (req.authData.type === 'api' && req.body.length > 1)
    return res.status(402).send({
      message: `Please send only 1 record`,
    });
  next();
};

const verifyAuthWithBodyData = (req, res, next) => {
  let reqData = {};

  req.authData.company_id
    ? (reqData['company_id'] = req.authData.company_id)
    : null;
  req.authData.product_id
    ? (reqData['product_id'] = req.authData.product_id)
    : null;
  req.body.partner_loan_id
    ? (reqData['partner_loan_id'] = req.body.partner_loan_id)
    : null;
  req.body.loan_schema_id
    ? (reqData['loan_schema_id'] = req.body.loan_schema_id)
    : null;
  req.body.partner_borrower_id
    ? (reqData['partner_borrower_id'] = req.body.partner_borrower_id)
    : null;
  req.body.loan_id ? (reqData['loan_id'] = req.body.loan_id) : null;
  req.body.borrower_id ? (reqData['borrower_id'] = req.body.borrower_id) : null;
  BorrowerinfoCommon.findBiForAuth(reqData, (err, brRes) => {
    if (err)
      return res.status(403).send({
        message: 'Error validating request data',
      });
    if (!brRes)
      return res.status(403).send({
        message: 'Please send valid data related to company',
      });
    next();
  });
};

const generateToken = (req, res, next) => {
  const token = jwt.sign(
    {
      company_id: req.loanRequestData.company_id || '',
      loan_schema_id: req.loanRequestData.loan_schema_id || '',
      product_id: req.loanRequestData.product_id || '',
      type: 'dash',
      environment: process.env.ENVIRONMENT,
    },
    process.env.SECRET_KEY,
  );
  req.headers['authorization'] = `Bearer ${token}`;
  req.headers['company_code'] = req.loanRequestData.company_id || '';
  next();
};

const generateTokenForService = (req, res, next) => {
  let jwtData = {
    company_id: req.company_id,
    product_id: req.product_id,
    type: req.type,
    environment: process.env.ENVIRONMENT,
    company_code: req.company_code,
  };
  if (req.user_id) {
    jwtData.user_id= req.user_id
  }
  return jwt.sign(jwtData, process.env.SECRET_KEY);
};

const generateTokenForProduct = async (req, res, next) => {
  const reqData = req.body;
  let tokenData = {
    token_id: req.token_id,
    company_id: req.company._id,
    company_code: req.company.company_code ? req.company.company_code : '',
    product_id: req.product.product_id ? req.product.product_id : '',
    type: 'service',
    user_id: req.user._id,
    user_name: req.user.user_name ? req.user.user_name : '',
    status: 1,
  };
  if (req?.product?._id) {
    //Check product exist by product_id.
    const findProduct = await ProductSchema.findById(req?.product?._id);
    if (!findProduct)
      throw {
        success: false,
        message: 'Error while checking product details',
      };
    //Validate the status of fetched product.
    if (!findProduct.status)
      throw { success: false, message: 'Product is not active.' };
    tokenData.name = findProduct.name + '-' + moment().format('YYYY-MM-DD');
  } else {
    tokenData.name = reqData.company_code + '-' + moment().format('YYYY-MM-DD');
  }
  // Record token in token schema
  const recordToken = await TokenSchema.addNew(tokenData);
  if (!recordToken)
    throw { success: false, message: 'Error while registering token' };
  if (recordToken) {
    return recordToken;
  } else {
    return null;
  }
};

const verifyLender = async (req, res, next) => {
  try {
    var lender = await BankingEntity.findById(req.authData.lender_id);
    if (!lender)
      throw {
        message: 'Invalid lender',
      };
    if (
      (!lender.status && req.authData.type === 'api') ||
      (!lender.status && req.authData.type === 'service') ||
      (!lender.status && req.authData.type === 'dash-api')
    )
      throw {
        message: 'Lender is not active',
      };
    req.lender = lender;
    next();
  } catch (err) {
    return res.status(400).send({
      err,
    });
  }
};

const verifyWebhookToken = (req, res, next) => {
  try {
    const bearerHeader = req.headers['authorization'];
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      throw {
        message: 'Forbidden',
        success: false,
      };
    if (bearerHeader !== process.env.WIREOUT_SECRET)
      throw { success: false, message: 'Invalid token.' };
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const verifyCoLenderDecisionApiToken = (req, res, next) => {
  try {
    const bearerHeader = req.headers['authorization'];
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      throw {
        message: 'Forbidden',
        success: false,
      };
    if (bearerHeader !== process.env.CO_LENDER_DECISION_SECRET)
      throw { success: false, message: 'Invalid token.' };
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
const verifyLoanAppIdCompanyProduct = async (req, loan_app_id) => {
  try {
    //fetch loan request data by loan_app_id.
    const leadData = await LeadSchema.findIfExists(loan_app_id);
    if (!leadData)
      throw {
        success: false,
        message: `No lead found against ${loan_app_id}`,
      };
    //fetch company_id from loan request data.
    let company_id = leadData.company_id;

    //fetch product_id from loan request data
    let product_id = leadData.product_id;

    //validate company_id from req with company_id from loan request data
    if (req.company._id !== company_id)
      throw { success: false, message: 'company_id mismatch in authorization' };
    //validate product_id from req with product_id from loan request data
    if (req.product._id !== product_id)
      throw { success: false, message: 'product_id mismatch in authorization' };
    return { success: true };
  } catch (error) {
    return error;
  }
};
const verifyTokenSkipCIDPID = async (req, res, next) => {
  try {
    const {
      company_id,
      product_id,
      from_date,
      to_date,
      str,
      book_entity_id,
      page,
      limit,
      status,
    } = req.params;
    const bearerHeader = req.headers['authorization'];
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      throw {
        message: 'Forbidden',
        success: false,
      };
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    let authData = jwt.verify(bearerToken, process.env.SECRET_KEY);
    if (!authData)
      throw {
        message: 'Forbidden',
        success: false,
      };
    if (
      authData.type !== 'api' &&
      authData.type !== 'dash-api' &&
      authData.type !== 'dash' &&
      authData.type !== 'service'
    )
      throw {
        message: 'Forbidden invalid type of token',
        success: false,
      };
    if (authData.environment !== process.env.ENVIRONMENT)
      throw {
        message: 'Forbidden cross environment',
        success: false,
      };
    //Validate if token is exist and active
    if (authData.type === 'api' || authData.type === 'service') {
      //Verify if token exist by token id
      const tokenExist = await TokenSchema.findByTokenId(authData.token_id);
      if (!tokenExist)
        throw { success: false, message: 'Forbiden, invalid token!' };
      //Verify if the token is in active status
      if (tokenExist.expired === 1)
        throw { success: false, message: 'Forbidden, inactive token!' };
      //Valiadate company_id of authdata with the comapny_id  of fetched token
      if (authData.company_id !== Number(tokenExist.company_id))
        throw { success: false, message: 'Forbidden,company_id mismatch!' };
      if (authData.type === 'api' && tokenExist.product_id) {
        //Valiadate product_id of authdata with the product_id  of fetched token
        if (authData.product_id !== Number(tokenExist.product_id))
          throw { success: false, message: 'Forbidden,product_id mismatch!' };
      }
    }
    if (
      authData.hasOwnProperty('user_id') &&
      (authData.type === 'dash' || authData.type === 'dash-api')
    ) {
      //Fetch user data aginst user_id.
      let userData = await UserSchema.findById(authData.user_id);
      userData = JSON.parse(JSON.stringify(userData));
      //If user status is inavtive throw error.
      if (!userData.status) throw { success: false, message: 'Forbidden!' };
      // If user.last_login_at then check the diff between current date and last_login_at.
      if (userData.hasOwnProperty('last_login_at')) {
        if (userData.last_login_at) {
          const diffFromLastLogin = moment().diff(
            moment(userData.last_login_at),
            'days',
          );
          if (diffFromLastLogin > 0)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Login session expired.',
            });
        }
      }
      //If user.password_updated_at then check the diff between today and password_updated_at, if it is greater than 180 days throw error.
      if (userData.hasOwnProperty('password_updated_at')) {
        if (userData.password_updated_at) {
          const passwordUpdatedDiff = moment().diff(
            moment(userData.password_updated_at),
            'days',
          );
          if (passwordUpdatedDiff > 180)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Password is expired,please reset password.',
            });
        }
      }
    }
    authData['skipCIDPID'] =
      (!company_id ||
        company_id === 'null' ||
        !product_id ||
        product_id === 'null' ||
        !from_date ||
        from_date === 'null' ||
        !to_date ||
        to_date === 'null') &&
      (str !== '' || str !== null || str !== 'null');
    req.authData = authData;
    next();
  } catch (error) {
    console.log('verifyTokenSkipCIDPID error', error);
    return res.status(400).send(error);
  }
};

const verifyTokenSkipCIDPIDPost = async (req, res, next) => {
  try {
    const {
      company_id,
      product_id,
      from_date,
      to_date,
      str,
      book_entity_id,
      page,
      limit,
      status,
    } = req.body;
    const bearerHeader = req.headers['authorization'];
    // const company_code = req.headers["company_code"] || "";
    if (
      !bearerHeader ||
      bearerHeader == 'undefined' ||
      bearerHeader == undefined
    )
      throw {
        message: 'Forbidden',
        success: false,
      };
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    let authData = jwt.verify(bearerToken, process.env.SECRET_KEY);
    if (!authData)
      throw {
        message: 'Forbidden',
        success: false,
      };
    if (
      authData.type !== 'api' &&
      authData.type !== 'dash-api' &&
      authData.type !== 'dash' &&
      authData.type !== 'service'
    )
      throw {
        message: 'Forbidden invalid type of token',
        success: false,
      };
    if (authData.environment !== process.env.ENVIRONMENT)
      throw {
        message: 'Forbidden cross environment',
        success: false,
      };
    //Validate if token is exist and active
    if (authData.type === 'api' || authData.type === 'service') {
      //Verify if token exist by token id
      const tokenExist = await TokenSchema.findByTokenId(authData.token_id);
      if (!tokenExist)
        throw { success: false, message: 'Forbiden, invalid token!' };
      //Verify if the token is in active status
      if (tokenExist.expired === 1)
        throw { success: false, message: 'Forbidden, inactive token!' };
      //Valiadate company_id of authdata with the comapny_id  of fetched token
      if (authData.company_id !== Number(tokenExist.company_id))
        throw { success: false, message: 'Forbidden,company_id mismatch!' };
      if (authData.type === 'api' && tokenExist.product_id) {
        //Valiadate product_id of authdata with the product_id  of fetched token
        if (authData.product_id !== Number(tokenExist.product_id))
          throw { success: false, message: 'Forbidden,product_id mismatch!' };
      }
    }
    if (
      authData.hasOwnProperty('user_id') &&
      (authData.type === 'dash' || authData.type === 'dash-api')
    ) {
      //Fetch user data aginst user_id.
      let userData = await UserSchema.findById(authData.user_id);
      userData = JSON.parse(JSON.stringify(userData));
      //If user status is inavtive throw error.
      if (!userData.status) throw { success: false, message: 'Forbidden!' };
      // If user.last_login_at then check the diff between current date and last_login_at.
      if (userData.hasOwnProperty('last_login_at')) {
        if (userData.last_login_at) {
          const diffFromLastLogin = moment().diff(
            moment(userData.last_login_at),
            'days',
          );
          if (diffFromLastLogin > 0)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Login session expired.',
            });
        }
      }
      //If user.password_updated_at then check the diff between today and password_updated_at, if it is greater than 180 days throw error.
      if (userData.hasOwnProperty('password_updated_at')) {
        if (userData.password_updated_at) {
          const passwordUpdatedDiff = moment().diff(
            moment(userData.password_updated_at),
            'days',
          );
          if (passwordUpdatedDiff > 180)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Forbidden. Password is expired,please reset password.',
            });
        }
      }
    }
    authData['skipCIDPID'] =
      !company_id ||
      company_id === 'null' ||
      !product_id ||
      product_id === 'null' ||
      !from_date ||
      from_date === 'null' ||
      !to_date ||
      to_date === 'null' ||
      str !== '';
    req.authData = authData;
    next();
  } catch (error) {
    console.log('verifyTokenSkipCIDPID error', error);
    return res.status(400).send(error);
  }
};

const verifyCoLenderToken = async(req,res,next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (
      !bearerHeader ||
      bearerHeader == "undefined" ||
      bearerHeader == undefined
    )
      throw {
        message: "Forbidden",
        success: false,
      };
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    const authData = jwt.verify(bearerToken, process.env.CO_LENDER_SECRET_KEY);
    if (!authData)
      throw {
        message: "Forbidden",
        success: false,
      };
    if (authData.type !== "co-lender-api")
      throw {
        message: "Forbidden invalid type of token",
        success: false,
      };
    if (authData.environment !== process.env.ENVIRONMENT)
      throw {
        message: "Forbidden cross environment",
        success: false,
      };
    const tokenExist = await TokenSchema.findByTokenId(authData.token_id);
    if (!tokenExist) {
      throw { success: false, message: "Forbiden, invalid token!" };
    }
    if (tokenExist.expired === 1) {
      throw { success: false, message: "Forbiden, inactive token!" };
    }
    const coLender = await ColenderProfileSchema.findByCoLenderIdAndShortCode(authData.co_lender_id,authData.co_lender_shortcode);
    if(!coLender){
      throw {
        success : false,
        message : "Forbiden, co-lender not found"
      }
    }
    if(coLender.status !== 1){
      throw {
        success : false,
        message : "Forbiden co-lender not active"
      }
    }
    req.authData = authData;
    req.co_lender = coLender;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
}

const generateTokenAndStore = async (data) => {
  try {
    if (data.type === 'api') {
      data.token_id = `${data.company_id}-${data.product_id}-${Date.now()}`;
    }
    if (data.type === 'service') {
      data.token_id = `${data.company_id}-${data.company_code}-${Date.now()}`;
    }
    data.environment = process.env.ENVIRONMENT;

    let tokenData = {
      token_id: data.token_id,
      company_id: data.company_id,
      company_code: data.company_code ? data.company_code : '',
      product_id: data.product_id ? data.product_id : '',
      type: data.type,
      user_id: data.user_id,
      username: data.user_name,
      environment: process.env.ENVIRONMENT,
      status: 1,
    };

    if (data.product_id) {
      //Check product exist by product_id.
      const findProduct = await ProductSchema.findById(data.product_id);
      if (!findProduct)
        throw {
          success: false,
          message: 'Error while finding product details in ',
        };
      //Validate the status of fetched product.
      if (!findProduct.status)
        throw { success: false, message: 'Product is not active.' };
    }
    if (data.type !== 'service') {
      tokenData.name = findProduct.name + '-' + moment().format('YYYY-MM-DD');
    } else {
      tokenData.name = data.company_code + '-' + moment().format('YYYY-MM-DD');
    }
    // Record token in token schema
    const recordToken = await TokenSchema.addNew(tokenData);
    if (!recordToken) return null;
    if (recordToken) return jwt.sign(tokenData, process.env.SECRET_KEY);
  } catch (error) {
    console.log('error in generate token', error);
  }
};
const verifyCollectionAdminUser = async (req, res, next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (
      !bearerHeader ||
      bearerHeader == "undefined" ||
      bearerHeader == undefined
    )
      //Throw exception if header is missing.
      throw {
        message: "Forbidden",
        success: false
      };
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    const authData = jwt.verify(bearerToken, process.env.SECRET_KEY);

    if (
      !authData ||
      authData == "undefined" ||
      authData == undefined
    ){
      //Throw exception if header is missing.
      throw {
        message: "Forbidden",
        success: false
      };
    }

    const roles = authData.userroles;
    if (!roles || !roles.find(role => role == "CollSuperAdmin")) {
      //Throw exception if user does not have role as admin.
      throw {
        message: "Forbidden",
        success: false
      };
    }

    req.authData= authData;
    req.authData.user_id=authData._id;
    next();
  } catch (error) {
    //Return 400
    console.log(error);
    return res.status(400).send(error);
  }
};

module.exports = {
  verifyToken,
  verifyUser,
  verifyCompany,
  verifyCompanyCached,
  verifyProduct,
  verifyLoanSchema,
  verifyBodyLengthDynamic,
  verifyBodyLength,
  verifyAuthWithBodyData,
  generateToken,
  verifyLender,
  generateTokenForService,
  generateTokenForProduct,
  verifyWebhookToken,
  verifyCoLenderDecisionApiToken,
  verifyAdminUser,
  verifyLoanAppIdCompanyProduct,
  verifyCompanyForAllPartners,
  verifyCoLenderToken,
  verifyTokenSkipCIDPID,
  verifyTokenSkipCIDPIDPost,
  generateTokenAndStore,
  verifyCollectionAdminUser
};

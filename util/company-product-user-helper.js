'use strict';
const jwt = require('jsonwebtoken');
const UserSchema = require('../models/user-schema');
const CompanySchema = require('../models/company-schema');
const ProductSchema = require('../models/product-schema');

const cache = require('memory-cache');
const TokenSchema = require('../models/tokens-schema.js');
const CACHE_EXPIRE = 60 * 5 * 1;

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
    req.user = user;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    var companies = await CompanySchema.getAll();

    req.companies = companies;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    var products = await ProductSchema.getAll();

    req.products = products;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = { getProducts, getCompanies };

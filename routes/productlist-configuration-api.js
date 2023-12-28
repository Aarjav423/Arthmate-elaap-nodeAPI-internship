bodyParser = require('body-parser');
const Product = require('../models/product-schema.js');
const { check, validationResult } = require('express-validator');
const intrestDpdConfigRevision = require('../models/intrest-dpd-config-revision-schema.js');
const jwt = require('../util/jwt');
const moment = require('moment');

module.exports = (app) => {
  app.use(bodyParser.json());

  app.put(
    '/api/product_dues',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('fees')
        .notEmpty()
        .withMessage('fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid fees'),
      check('subvention_fees')
        .notEmpty()
        .withMessage('subvention_fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid subvention_fees'),
      check('processing_fees')
        .notEmpty()
        .withMessage('processing_fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid processing_fees'),
      check('usage_fee')
        .notEmpty()
        .withMessage('usage_fee is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid usage_fee'),
      check('upfront_interest')
        .notEmpty()
        .withMessage('upfront_interest is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA)$/)
        .withMessage('Please enter valid upfront_interest'),
      check('int_value')
        .notEmpty()
        .withMessage('int_value is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(A|P)$/)
        .withMessage('Please enter valid int_value'),
      check('interest_free_days')
        .notEmpty()
        .withMessage('interest_free_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid interest_free_days')
        .isNumeric()
        .withMessage('interest_free_days should be numeric'),
      check('exclude_interest_till_grace_period')
        .notEmpty()
        .withMessage('exclude_interest_till_grace_period is required'),
      check('tenure_in_days')
        .notEmpty()
        .withMessage('tenure_in_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid tenure_in_days')
        .isNumeric()
        .withMessage('tenure_in_days should be numeric'),
      check('grace_period')
        .notEmpty()
        .withMessage('grace_period is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid grace_period')
        .isNumeric()
        .withMessage('grace_period should be numeric'),
      check('overdue_charges_per_day')
        .notEmpty()
        .withMessage('overdue_charges_per_day is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(RA|RP)$/)
        .withMessage('Please enter valid overdue_charges_per_day'),
      check('penal_interest')
        .notEmpty()
        .withMessage('penal_interest is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(RA|RP)$/)
        .withMessage('Please enter valid penal_interest'),
      check('overdue_days')
        .notEmpty()
        .withMessage('overdue_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid overdue_days')
        .isNumeric()
        .withMessage('overdue_days should be numeric'),
      check('penal_interest_days')
        .notEmpty()
        .withMessage('penal_interest_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid penal_interest_days')
        .isNumeric()
        .withMessage('penal_interest_days should be numeric'),
      check('upfront_interest_days')
        .notEmpty()
        .withMessage('upfront_interest_days are required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid upfront_interest_days')
        .isNumeric()
        .withMessage('upfront_interest_days should be numeric'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
            success: false,
          };
        let intrestDpdLogData = {
          user_id: req.user._id,
          user_name: req.user.username,
          added_date: moment().toLocaleString(),
          company_id: req.company._id,
          product_id: req.product._id,
          destination: 'product',
          fees: req.body.fees,
          subvention_fees: req.body.subvention_fees,
          processing_fees: req.body.processing_fees,
          usage_fee: req.body.usage_fee,
          upfront_interest: req.body.upfront_interest,
          int_value: req.body.int_value,
          interest_free_days: req.body.interest_free_days,
          exclude_interest_till_grace_period:
            req.body.exclude_interest_till_grace_period,
          tenure_in_days: req.body.tenure_in_days,
          grace_period: req.body.grace_period,
          overdue_charges_per_day: req.body.overdue_charges_per_day,
          penal_interest: req.body.penal_interest,
          overdue_days: req.body.overdue_days,
          penal_interest_days: req.body.penal_interest_days,
          upfront_interest_days: req.body.upfront_interest_days,
        };
        const logres = await intrestDpdConfigRevision.addLog(intrestDpdLogData);
        if (!logres)
          throw {
            message: 'Error while adding revision log',
            success: false,
          };
        const productDueResp = await Product.updateData(req.body, {
          _id: req.product._id,
          company_id: req.company._id,
          loan_schema_id: req.loanSchema._id,
        });
        if (!productDueResp)
          throw {
            message: 'No products found',
            success: false,
          };
        return res.send({
          message: 'Product dues data updated Successfully',
          success: true,
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/product_dues',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        const dpdrecords = await Product.findOneWithCompanyAndProductId(data);
        if (!dpdrecords)
          throw {
            message: 'Something went wrong while fetching DPD configurations',
          };
        return await res.json({
          dpdrecords,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

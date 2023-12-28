const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const validate = require('../util/validate-req-body');
const InsuranceSettingsSchema = require('../models/insurance-settings-schema.js');
const InsurancePricingSchema = require('../models/insurance-pricing-schema.js');
const InsuranceMasterDataSchema = require('../models/insurance-master-data-schema');
const PolicyPremiumRateSchema = require('../models/insurance-base-policy-premium-rate-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/insurance-settings',
    [
      check('digit_api_reference_number')
        .notEmpty()
        .withMessage('digit_api_reference_number is required'),
      check('product_key').notEmpty().withMessage('product_key is required'),
      check('package_name').notEmpty().withMessage('package_name is required'),
      check('master_policy_number')
        .notEmpty()
        .withMessage('master_policy_number is required'),
      check('insured_product_code')
        .notEmpty()
        .withMessage('insured_product_code is required')
        .isNumeric()
        .withMessage('insured_product_code should be numeric'),
      check('partner_api_key')
        .notEmpty()
        .withMessage('partner_api_key is required'),
      check('imd_code')
        .notEmpty()
        .withMessage('imd_code is required')
        .isNumeric()
        .withMessage('imd_code should be numeric'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const insuranceSettings = await InsuranceSettingsSchema.addNew(data);
        if (!insuranceSettings)
          throw {
            success: false,
            message: 'error while adding insurance settings',
          };
        if (insuranceSettings)
          return res.status(200).send({
            success: true,
            message: 'Insurance settings recorded successfuly.',
            data: insuranceSettings,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/insurance-pricing',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyProduct, jwt.verifyCompany],
    [
      check('company_id')
        .notEmpty()
        .withMessage('company_id is required')
        .isNumeric()
        .withMessage('company_id should be numeric'),
      check('product_id')
        .notEmpty()
        .withMessage('product_id is required')
        .isNumeric()
        .withMessage('product_id should be numeric'),
      check('master_policy_number')
        .notEmpty()
        .withMessage('master_policy_number is required'),
      check('premium_multiplier')
        .notEmpty()
        .withMessage('premium_multiplier is required')
        .isNumeric()
        .withMessage('premium_multiplier should be numeric'),
    ],
    async (req, res) => {
      try {
        //Validate the request data
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        //Validate if _id is associated with selected company
        if (Number(data.company_id) !== req.company._id)
          throw {
            success: false,
            message: 'company_id is not associated with selected company.',
          };
        if (Number(data.product_id) !== req.product._id)
          throw {
            success: false,
            message: 'product_id is not associated with selected product.',
          };
        data.company_name = req.company.name;
        data.product_name = req.product.name;
        const productInsuranceConfigure =
          await InsurancePricingSchema.addNew(data);

        if (!productInsuranceConfigure)
          throw {
            success: false,
            message: 'Error while adding product insurance config',
          };
        if (productInsuranceConfigure)
          return res.status(200).send({
            success: true,
            message: 'Product insurance configuration added successfully.',
            data: productInsuranceConfigure,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/insurance-premium-calculation',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyProduct, jwt.verifyCompany],
    [
      check('borrower_age')
        .notEmpty()
        .withMessage('Kindly enter valid age of the borrower')
        .isInt()
        .withMessage('Kindly enter valid age of the borrower'),
      check('co_borrower_age')
        .optional({ checkFalsy: false })
        .isInt()
        .withMessage('Kindly enter valid age of the co_borrower'),
      check('loan_tenure_in_months')
        .notEmpty()
        .withMessage('loan_tenure_in_months is required')
        .isInt({ min: 1, max: 60 })
        .withMessage(
          'Kindly enter valid loan_tenure_in_months in the range of 1 to 60.',
        ),
      check('loan_amount')
        .notEmpty()
        .withMessage('loan_amount is required')
        .isNumeric()
        .withMessage('loan_amount should be numeric'),
    ],
    async (req, res) => {
      try {
        //Validate the request data
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const data = req.body;
        let borrowerInsurancePremium = 0;
        let coBorrowerInsurancePremium = 0;
        let totalPremiumIncGST = 0;
        //Validate for positive loan amount.
        if (data.loan_amount <= 0)
          throw {
            success: false,
            message: 'Loan amount should be greater than 0.',
          };
        //Validate if insurance flag is checked.
        if (!req.product.insurance_charges)
          throw {
            success: false,
            message: 'Exception: Insurance charge is not configured',
          };
        //Validate if records available in insurance pricing schema.
        const insurancePricingRecord =
          await InsurancePricingSchema.findByCIDPID(
            req.company._id,
            req.product._id,
          );
        if (!insurancePricingRecord)
          throw {
            success: false,
            message: 'Product is not configured for insurance premium.',
          };
        //Validate for the premium_multiplier.
        if (!insurancePricingRecord.premium_multiplier)
          throw {
            success: false,
            message: 'premium_multiplier should be configured.',
          };
        // Calculate borrower insurance premium inc gst.
        const calculateBorrowerPremium = await calculatePremium(
          data.borrower_age,
          data.loan_tenure_in_months,
          data.loan_amount,
          insurancePricingRecord.premium_multiplier,
        );
        if (!calculateBorrowerPremium.success) throw calculateBorrowerPremium;
        borrowerInsurancePremium = calculateBorrowerPremium.policyPremiumIncGST;
        //Calculate co borrower insurance premium inc gst.
        if (data.co_borrower_age) {
          const calculateCoBorrowerPremium = await calculatePremium(
            data.co_borrower_age,
            data.loan_tenure_in_months,
            data.loan_amount,
            insurancePricingRecord.premium_multiplier,
          );
          if (!calculateCoBorrowerPremium.success)
            throw calculateCoBorrowerPremium;
          coBorrowerInsurancePremium =
            calculateCoBorrowerPremium.policyPremiumIncGST;
        }
        totalPremiumIncGST =
          Math.round(
            ((borrowerInsurancePremium + coBorrowerInsurancePremium) * 1 +
              Number.EPSILON) *
              100,
          ) / 100;
        const responseObj = {
          borrower_insurance_premium: borrowerInsurancePremium,
          coborrower_insurance_premium: coBorrowerInsurancePremium,
          total_premium_inc_gst: totalPremiumIncGST,
        };
        //Return response
        return res.status(200).send({ success: true, data: responseObj });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  const calculatePremium = async (
    age,
    tenureInMonths,
    loanAmount,
    premiumMultiplier,
  ) => {
    try {
      //Using age and tenure determine the policy premium using Base Policy Premium Rate Sheet
      const policyPremiumByAge = await PolicyPremiumRateSchema.findByAge(age);
      if (!policyPremiumByAge)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumObj = JSON.parse(JSON.stringify(policyPremiumByAge));
      delete policyPremiumObj.max_age;
      delete policyPremiumObj.min_age;
      const keys = Object.keys(policyPremiumObj);
      let tenureArray = [];
      keys.forEach((key) => {
        if (tenureInMonths == key * 1 || tenureInMonths < key * 1) {
          tenureArray.push(key);
        }
      });
      if (!tenureArray.length)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumByTenure = policyPremiumByAge[`${tenureArray[0]}`];
      //Calculate policy premium
      policyPremium =
        ((loanAmount * 1) / 1000) *
        policyPremiumByTenure *
        Number(premiumMultiplier);
      //18% of GST should be applied on the above calculated policy premium amount to arrive at the Total premium inclusive of GST
      gstOnPolicyPremium = policyPremium * 0.18;
      policyPremiumIncGST = policyPremium + gstOnPolicyPremium;
      policyPremiumIncGST =
        Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;
      return { success: true, policyPremiumIncGST };
    } catch (error) {
      return error;
    }
  };
};

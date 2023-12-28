bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const PartnerSchema = require('../models/partner-schema.js');
const CompanySchema = require('../models/company-schema.js');
const ErrorStrings = require('../constants/error-strings');
const { generateCustomCode } = require('../util/partner-helper.js');

const pad = (num, size) => {
  const repeatTime =
    num.toString().length < size ? size - num.toString().length : 0;
  return '0'.repeat(repeatTime) + num;
};

module.exports = (app, connection) => {
  app.get('/api/partner', async (req, res) => {
    try {
      const partnerList = await PartnerSchema.listAll();
      if (!partnerList)
        throw {
          message: 'No partners found',
        };
      res.send(partnerList);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  app.post(
    '/api/partner',
    [
      check('name')
        .notEmpty()
        .withMessage('Partner name must be alphabet letters and is required'),
      check('cin')
        .notEmpty()
        .isAlphanumeric()
        .isLength({
          min: 21,
          max: 21,
        })
        .withMessage(
          'CIN should be alphanumeric with 21 character and is required',
        ),
      check('business_phone')
        .notEmpty()
        .withMessage('Business landline is required'),
      check('company_address')
        .notEmpty()
        .withMessage('Company address is required'),
      check('pin_code')
        .notEmpty()
        .isNumeric()
        .isLength({
          min: 6,
          max: 6,
        })
        .withMessage(
          'Pincode should be numeric having length 6 and is required',
        ),
      check('city').notEmpty().withMessage('Please enter city name'),
      check('state').notEmpty().withMessage('Please enter state'),
      check('gstin')
        .optional({
          checkFalsy: true,
        })
        .isAlphanumeric()
        .isLength({
          min: 15,
          max: 15,
        })
        .withMessage('GSTIN should be alphanumeric having length 15'),
      check('tin')
        .optional({
          checkFalsy: true,
        })
        .isNumeric()
        .isLength({
          min: 11,
          max: 11,
        })
        .withMessage('Please enter valid TIN'),
      check('directors')
        .isArray()
        .notEmpty()
        .withMessage('Atleast one director is required'),
      check('website').notEmpty().withMessage('Please enter valid website url'),
      check('lms_version').notEmpty().withMessage('Please enter lms version'),
      check('gro_name')
        .notEmpty()
        .withMessage('Please enter GRO Name'),
      check('gro_designation')
        .notEmpty()
        .withMessage('Please enter GRO Designation'),
      check('gro_address')
        .notEmpty()
        .withMessage('Please enter GRO Address'),
      check('gro_email_id')
        .notEmpty()
        .isEmail()
        .withMessage('Please enter a valid GRO email'),
      check('gro_contact_number')
        .notEmpty()
        .isNumeric()
        .isLength({
          min: 10,
          max: 10,
        })
        .withMessage('Please enter a valid GRO contact number'),
      check('digital_lending_app_name')
        .notEmpty()
        .withMessage('Please enter digital lending app name'),
      generateCustomCode,
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const requestData = req.body;
        const partnerAlreadyExist = await PartnerSchema.search(requestData);
        if (partnerAlreadyExist)
          throw {
            message:
              'Partner already exists with same name, email, business_phone',
          };
        //create partner code
        const pname = requestData.name.trim().toUpperCase();
        const partner_code = `${pname.substr(0, 1)}${pname.substr(
          2,
          1,
        )}${pname.substr(4, 1)}${Math.floor(10000 + Math.random() * 99999)}`;
        requestData.code = partner_code;
        const companyInputData = {
          is_parent_company_in_abroad: requestData.is_parent_company_in_abroad,
          name: requestData.name,
          billing_name: requestData.name,
          business_phone: requestData.business_phone,
          company_address: requestData.company_address,
          billing_address: requestData.company_address,
          pin_code: requestData.pin_code,
          city: requestData.city,
          state: requestData.state,
          gstin: requestData.gstin,
          tin: requestData.tin,
          cin: requestData.cin,
          website: requestData.website,
          directors: requestData.directors,
          check_sub_company_exists: 1,
          service_delivery_state: requestData.state,
          is_igst_applicable: 1,
          lms_version: requestData.lms_version,
          custom_code: requestData.custom_code,
          short_code: requestData.short_code ? requestData.short_code : '',
          gro_name: requestData.gro_name,
          gro_designation: requestData.gro_designation,
          gro_address: requestData.gro_address,
          gro_email_id: requestData.gro_email_id,
          gro_contact_number: requestData.gro_contact_number,
          digital_lending_app_name: requestData.digital_lending_app_name,
        };
        const addPartner = await PartnerSchema.addPartner(requestData);
        if (!addPartner)
          throw {
            message:
              'Something went wrong while inserting partner. Please try again',
          };
        const companyAlreadyExist = await CompanySchema.findByName(
          requestData.name,
        );
        if (companyAlreadyExist)
          throw {
            message: 'Company already exists with same name',
          };
        const companyCount = await CompanySchema.getCompanyCount();

        const company_code_digit = companyCount
          ? Number(companyCount) + 1
          : '001';
        companyInputData.code =
          requestData.name
            .trim()
            .replace(/ /g, '')
            .substring(0, 3)
            .toUpperCase() + pad(Number(company_code_digit), 4);
        companyInputData.va_num =
          process.env.IDFC_PREFIX + pad(Number(company_code_digit), 4);
        companyInputData.partner_id = addPartner._id;
        const addCompany = await CompanySchema.addNew(companyInputData);
        return res.send({
          message:
            'Partner added successfully and default company is created for partner',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to get partner by id
  app.get('/api/partner/:id', async (req, res) => {
    try {
      const partnerById = await PartnerSchema.findById(req.params.id);

      if (!partnerById)
        throw {
          message: 'No partner found against provided id',
        };
      res.json(partnerById);
    } catch (error) {
      console.log('error', error);
      return res.status(400).send({
        error,
      });
    }
  });
};

bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AnchorSchema = require('../models/anchor-schema.js');
const CompanySchema = require('../models/company-schema.js');
const ErrorStrings = require('../constants/error-strings');

const pad = (num, size) => {
  const repeatTime =
    num.toString().length < size ? size - num.toString().length : 0;
  return '0'.repeat(repeatTime) + num;
};

module.exports = (app, connection) => {
  app.get('/api/anchor/:page/:limit/:str', async (req, res) => {
    try {
      const anchorList = await AnchorSchema.listAllPaginatedSearch(
        req.params.page,
        req.params.limit,
        req.params.str,
      );
      if (!anchorList) throw { message: 'No anchors found' };
      res.send(anchorList);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/anchor',
    [
      check('name')
        .notEmpty()
        .withMessage('Anchor name must be alphabet letters and is required'),
      check('anchor_address')
        .notEmpty()
        .withMessage('Anchor address is required'),
      check('state').notEmpty().withMessage('Anchor state is required'),
      check('city').notEmpty().withMessage('Anchor city is required'),
      check('pin_code').notEmpty().withMessage('Anchor pin_code is required'),
      check('business_phone')
        .notEmpty()
        .withMessage('Business phone is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw { success: false, message: errors.errors[0]['msg'] };
        const requestData = req.body;
        const anchorAlreadyExist = await AnchorSchema.search(requestData);
        if (anchorAlreadyExist && anchorAlreadyExist.length)
          throw {
            success: false,
            message: 'Anchor already exists with same name',
          };
        //create anchor code
        const aname = requestData.name.trim().toUpperCase();
        const anchor_code = `${aname.substr(0, 1)}${aname.substr(
          2,
          1,
        )}${aname.substr(4, 1)}${Math.floor(10000 + Math.random() * 99999)}`;
        requestData.code = anchor_code;
        const anchorInputData = {
          is_parent_company_in_abroad: requestData.is_parent_company_in_abroad,
          name: requestData.name,
          business_phone: requestData.business_phone,
          anchor_address: requestData.company_address,
          pin_code: requestData.pin_code,
          city: requestData.city,
          state: requestData.state,
          gstin: requestData.gstin,
          tin: requestData.tin,
          cin: requestData.cin,
          website: requestData.website,
          directors: requestData.directors,
        };
        const addAnchor = await AnchorSchema.addAnchor(anchorInputData);
        if (!addAnchor)
          throw {
            message:
              'Something went wrong while inserting anchor. Please try again',
          };
        anchorInputData.anchor_id = addAnchor._id;
        return res.send({
          message: 'Anchor added successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to get anchor by id
  app.get('/api/anchor/:id', async (req, res) => {
    try {
      const anchorById = await AnchorSchema.findByAnchorId(req.params.id);
      if (!anchorById)
        throw {
          message: 'No anchor found against provided id',
        };
      res.json(anchorById);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });
};

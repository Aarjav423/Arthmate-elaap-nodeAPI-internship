const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const SchemeSchema = require('../models/scheme-schema');
const { checkSchemeAlreadyExist } = require('../util/scheme-helper');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/scheme',
    jwt.verifyToken,
    jwt.verifyUser,
    [
      check('scheme_name').notEmpty().withMessage('Scheme name is required'),
      check('interest_rate')
        .notEmpty()
        .isNumeric()
        .withMessage('Interest rate is required'),
      check('interest_type')
        .notEmpty()
        .matches(/Upfront|Rear-end/)
        .withMessage('Interest type is required'),
      check('penal_rate')
        .notEmpty()
        .isNumeric()
        .withMessage('Penal rate is required'),
      check('bounce_charge')
        .notEmpty()
        .isNumeric()
        .withMessage('Bounce charge is required'),
      check('repayment_days')
        .notEmpty()
        .isNumeric()
        .withMessage('Repayment Days is required'),
    ],
    checkSchemeAlreadyExist,
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };

        let data = req.body;
        let {
          scheme_name,
          interest_rate,
          interest_type,
          bounce_charge,
          penal_rate,
          repayment_days,
        } = data;
        let schemeAddedData = await SchemeSchema.addNew({
          scheme_name,
          interest_rate,
          interest_type,
          bounce_charge,
          penal_rate,
          repayment_days,
          created_by: req?.user?.email,
          updated_by: req?.user?.email,
          status: true,
        });
        if (!schemeAddedData) {
          throw {
            success: false,
            message: 'Failed to add scheme',
          };
        }
        return res
          .status(200)
          .send({ success: true, message: 'Scheme Added Successfully' });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );
  // API to UPDATE scheme STATUS
  app.put(
    '/api/scheme/:id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
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
        let updateResp = await SchemeSchema.updateStatus(id, sts);
        if (!updateResp)
          throw {
            sucess: false,
            message: 'Status Updation failed',
          };
        return res.status(200).json({
          success: true,
          message: 'Scheme updated successfully',
        });
      } catch (err) {
        return res.status(400).json(err);
      }
    },
  );
  app.get(
    '/api/scheme/:page/:limit',
    jwt.verifyToken,
    async (req, res, next) => {
      try {
        let { page = 1, limit = 10 } = req.params;
        let { search } = req.query;
        let filter = {};
        if (search) {
          if (isNaN(search)) {
            filter.scheme_name = search;
          } else {
            filter._id = parseInt(search);
          }
        }
        let schemeData = await SchemeSchema.findByConditionWithLimit(
          filter,
          false,
          page,
          limit,
        );
        return res.status(200).send({
          success: true,
          data: schemeData || [],
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );
};

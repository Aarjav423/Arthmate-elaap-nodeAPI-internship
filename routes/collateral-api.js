const bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const CollateralSchema = require('../models/collateral-schema.js');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const moment = require('moment');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const dateRegex = /^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/;

  const validateCollateralData = [
    check('loan_id').notEmpty().withMessage('loan_id is required'),
    // check("invoice_number")
    //   .notEmpty()
    //   .withMessage("invoice_number is required"),
    // check("invoice_date")
    //   .notEmpty()
    //   .withMessage("invoice_date is required")
    //   .matches(dateRegex)
    //   .withMessage("Please enter valid invoice_date in YYYY-MM-DD format"),
    // check("invoice_amount")
    //   .notEmpty()
    //   .withMessage("invoice_amount is required"),
    // check("engine_number")
    //   .notEmpty()
    //   .withMessage("engine_number is required"),
    // check("chassis_number")
    //   .notEmpty()
    //   .withMessage("chassis_number is required"),
    // check("insurance_partner_name")
    //   .notEmpty()
    //   .withMessage("insurance_partner_name is required"),
    // check("policy_number")
    //   .notEmpty()
    //   .withMessage("policy_number is required"),
    // check("policy_issuance_date")
    //   .notEmpty()
    //   .withMessage("policy_issuance_date is required")
    //   .matches(dateRegex)
    //   .withMessage(
    //     "Please enter valid policy_issuance_date in YYYY-MM-DD format"
    //   ),
    // check("policy_expiry_date")
    //   .notEmpty()
    //   .withMessage("policy_expiry_date is required")
    //   .matches(dateRegex)
    //   .withMessage("Please enter valid policy_expiry_date in YYYY-MM-DD format")
  ];

  //Api to get collateral record by id
  app.get('/api/collateral_record/:id', async (req, res) => {
    try {
      const collateralRecordById = await CollateralSchema.getRecordById(
        req.params.id,
      );
      if (!collateralRecordById)
        throw {
          success: false,
          message: 'No collateral record found against provided id',
        };
      return res.status(200).send(collateralRecordById);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  //Api to fetch paginated collateral records
  app.post(
    '/api/collateral/list',
    [jwt.verifyToken],
    [
      check('company_id').notEmpty().withMessage('company_id is required')
    ],
    async (req, res) => {
      try {
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const {
          company_id,
          product_id,
          from_date,
          to_date,
          loan_id,
          page,
          limit,
        } = req.body;
        if (from_date || to_date) {
          let fromDate = moment(from_date, 'YYYY-MM-DD');
          let toDate = moment(to_date, 'YYYY-MM-DD');
          if (from_date && to_date) {
            // Validate from date should not be greater than to date
            if (toDate.isBefore(fromDate))
              throw {
                success: false,
                message: 'from_date should be less than to_date',
              };
          }
        }
        if(from_date === null){
          delete req.body.from_date;
        }
        if(to_date === null){
          delete req.body.to_date;
        }
        // Fetch collateral records according to the filters
        const collateralRecords =
          await CollateralSchema.getFilteredCollateralRecords(req.body);
        if (!collateralRecords?.rows?.length)
          throw {
            success: false,
            message: 'No collateral records found against provided filter',
          };

        // Prepare an array of loan ids in colaateral response
        const loanIds = collateralRecords.rows.map((row) => {
          return row.loan_id;
        });

        // Fetch loan data by loan_id
        const loanResp = await BorrowerinfoCommon.findKLIByIds(loanIds);
        if (loanResp[0] == null || !loanResp.length) {
          throw {
            message: 'No record found in borrowerInfo for loan id',
          };
        }
        const loanData = JSON.parse(JSON.stringify(loanResp));
        const collateralData = JSON.parse(JSON.stringify(collateralRecords));
        // Prepare combined data from loan and collateral response to send in response
        collateralData.rows.forEach((item) => {
          var loanRecord = loanData.find(
            (record) => record.loan_id === item.loan_id,
          );
          item.first_name = loanRecord.first_name ? loanRecord.first_name : '';
          item.last_name = loanRecord.last_name ? loanRecord.last_name : '';
          item.loan_app_id = loanRecord.loan_app_id
            ? loanRecord.loan_app_id
            : '';
        });
        return res.status(200).send(collateralData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to record collateral data
  app.post(
    '/api/collateral_details',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    validateCollateralData,
    async (req, res) => {
      try {
        const {
          loan_id,
          invoice_number,
          invoice_date,
          invoice_amount,
          engine_number,
          chassis_number,
          insurance_partner_name,
          policy_number,
          policy_issuance_date,
          policy_expiry_date,
          vehicle_registration_number,
          battery_serial_number
        } = req.body;
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });

        //Validate if loan_id belongs to company in the token
        const loanBelongsToCompany = await BorrowerinfoCommon.findByCIDPID(
          loan_id,
          req.company._id,
          req.product._id,
        );
        if (!loanBelongsToCompany)
          throw {
            success: false,
            message: 'loan_id does not belongs to company.',
          };

        //Validate date format
        if (invoice_date && !dateRegex.test(invoice_date))
          throw {
            success: false,
            message: 'Please enter valid invoice_date in YYYY-MM-DD format',
          };
        if (policy_issuance_date && !dateRegex.test(policy_issuance_date))
          throw {
            success: false,
            message:
              'Please enter valid policy_issuance_date in YYYY-MM-DD format',
          };
        if (policy_expiry_date && !dateRegex.test(policy_expiry_date))
          throw {
            success: false,
            message:
              'Please enter valid policy_expiry_date in YYYY-MM-DD format',
          };
        //Record data in collateral table
        req.body.company_id = req.company._id;
        req.body.product_id = req.product._id;
        req.body.company_name = req.company.name;
        req.body.product_name = req.product.name;
        req.body.vehicle_brand = req.body.vehicle_brand
          ? req.body.vehicle_brand
          : '';
        req.body.vehicle_model = req.body.vehicle_model
          ? req.body.vehicle_model
          : '';
        req.body.vehicle_sub_model = req.body.vehicle_sub_model
          ? req.body.vehicle_sub_model
          : '';
        req.body.vehicle_type = req.body.vehicle_type
          ? req.body.vehicle_type
          : '';
          req.body.battery_serial_number = req.body.battery_serial_number
          ? req.body.battery_serial_number
          : '';
        const recordCollateralData = await CollateralSchema.addNew(req.body);
        if (!recordCollateralData)
          throw {
            success: false,
            message: 'Error while recording collateral data.',
          };
        return res.status(200).send({
          success: true,
          message: 'Collateral data recorded successfully!',
          data: recordCollateralData,
        });
      } catch (error) {
        let msg = '';
        if (error.code === 11000) {
          const key = Object.keys(error.keyValue);
          let msg = `${key[0]} already exist.`;
          return res.status(400).send({
            success: false,
            message: msg,
          });
        }
        return res.status(400).send(error);
      }
    },
  );

  //Api to update record collateral data
  app.put(
    '/api/collateral_details/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        //Validate if loan_id belongs to company in the token
        const loanBelongsToCompany = await BorrowerinfoCommon.findByCIDPID(
          data.loan_id,
          req.company._id,
          req.product._id,
        );
        if (!loanBelongsToCompany)
          throw {
            success: false,
            message: 'loan_id does not belongs to company.',
          };

        //Check whether collateral record already exist by id
        const collateralRecord = await CollateralSchema.getRecordById(
          req.params.id,
        );
        if (!collateralRecord)
          throw {
            success: false,
            message: 'No record found for collateral records',
          };
        delete data.loan_id;
        delete data.created_at;
        if (req.authData.type === 'api') {
          data.updated_by = req.company.name;
        } else if (req.authData.type === 'dash') {
          data.updated_by = req.user.username;
        }
        //update collateral record  by id
        const updateCollateralData = await CollateralSchema.updateRecordById(
          data,
          req.params.id,
        );
        if (!updateCollateralData)
          throw {
            success: false,
            message: 'Error while updating collateral record.',
          };
        return res.status(200).send({
          success: true,
          message: 'Collateral record updated successfully.',
          data: updateCollateralData,
        });
      } catch (error) {
        let msg = '';
        if (error.code === 11000) {
          const key = Object.keys(error.keyValue);
          let msg = `${key[0]} already exist.`;
          return res.status(400).send({
            success: false,
            message: msg,
          });
        }
        return res.status(400).send(error);
      }
    },
  );
};

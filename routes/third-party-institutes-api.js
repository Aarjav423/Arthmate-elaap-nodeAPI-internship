bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const ThirdPartyInstitute = require('../models/third-party-institutes-schema.js');
const jwt = require('../util/jwt');
const reqUtils = require('../util/req');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/third_party_onboarding',
    [
      check('third_party_name')
        .notEmpty()
        .withMessage('third_party_name is requried'),
      check('bank_name').notEmpty().withMessage('bank_name is requried'),
      check('bank_account_no')
        .notEmpty()
        .withMessage('bank_account_no is required')
        .isLength({
          min: 8,
          max: 30,
        })
        .withMessage('Please enter valid bank_account_no')
        .isAlphanumeric()
        .withMessage('bank_account_no should be Alphanumeric'),
      check('ifsc_code')
        .notEmpty()
        .withMessage('ifsc_code is required')
        .matches(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
        .withMessage('Please enter valid ifsc_code'),
      check('bank_account_type')
        .notEmpty()
        .withMessage('Please enter bank_account_type')
        .matches(/^(saving|SAVING|current|CURRENT*)$/)
        .withMessage(
          'Please enter valid bank_account_type i.e SAVING / CURRENT',
        ),
      check('gstin_no')
        .notEmpty()
        .withMessage('Please enter gstin_no')
        .isAlphanumeric()
        .isLength({
          min: 15,
          max: 15,
        })
        .withMessage('gstin_no should be alphanumeric having length 15'),
      check('address').notEmpty().withMessage('address is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        const reqData = req.body;
        if (req.company._id === '' && req.company.name === '')
          throw {
            message: 'company_name and company_id is required',
          };
        reqData.company_id = req.company._id;
        reqData.company_name = req.company.name;
        const condition = {
          $or: [
            {
              third_party_name: reqData.third_party_name,
            },
            {
              bank_account_no: reqData.bank_account_no,
            },
            {
              gstin_no: reqData.gstin_no,
            },
          ],
        };
        const checkDuplicate =
          await ThirdPartyInstitute.checkAlreadyExists(condition);
        if (checkDuplicate) {
          if (checkDuplicate.bank_account_no === reqData.bank_account_no)
            throw {
              message: 'bank_account_no already exist',
            };
          if (checkDuplicate.gstin_no === reqData.gstin_no)
            throw {
              message: 'gstin_no already exist',
            };
          if (checkduplicate.institute_name === reqData.institute_name)
            throw {
              message: 'institute_name already exist',
            };
        }
        const thirdPartyInstituteResult =
          await ThirdPartyInstitute.addNew(reqData);
        if (!thirdPartyInstituteResult)
          throw {
            message:
              'Something went wrong while inserting third party institute data.',
          };
        return res.status(200).send({
          success: true,
          data: thirdPartyInstituteResult,
          message: 'institute details inserted successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/institute_list',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const paginatedData =
          await ThirdPartyInstitute.getPaginateddata(reqData);
        if (!paginatedData.rows.length)
          throw {
            message: 'No records found for third party institutes.',
          };
        const dataCount = await ThirdPartyInstitute.getCount(reqData);
        return res.status(200).send({
          success: true,
          data: paginatedData.rows,
          count: dataCount,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post('/api/institute_by_id', async (req, res, next) => {
    try {
      const data = req.body;
      const dataByFilter = await ThirdPartyInstitute.findByCondition({
        _id: data._id,
      });
      return res.status(200).send({
        success: true,
        data: dataByFilter,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.put(
    '/api/institute_status',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const data = {};
        data.approved_by = req.user.username;
        reqData.status == 1
          ? (data.status = 'active')
          : (data.status = 'inactive');
        const updateThirdPartyStatus =
          await ThirdPartyInstitute.updateStatusById(reqData.id, data);
        if (!updateThirdPartyStatus)
          throw {
            message: 'Error while updating third party institute status',
          };
        const msg = reqData.status == 1 ? 'activated' : 'deactivated';
        return res.status(200).send({
          success: true,
          message: `Third party institute status ${msg} successfully.`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/institute_data',
    [
      check('id').notEmpty().withMessage('id is requried'),
      check('third_party_name')
        .notEmpty()
        .withMessage('third_party_name is required'),
      check('bank_name').notEmpty().withMessage('bank_name is requried'),
      check('bank_account_no')
        .notEmpty()
        .withMessage('bank_account_no is required')
        .isLength({
          min: 8,
          max: 30,
        })
        .withMessage('Please enter valid bank_account_no')
        .isAlphanumeric()
        .withMessage('bank_account_no should be Alphanumeric'),
      check('ifsc_code')
        .notEmpty()
        .withMessage('ifsc_code is required')
        .matches(/^[A-Za-z]{4}[a-zA-Z0-9]{7}$/)
        .withMessage('Please enter valid ifsc_code'),
      check('bank_account_type')
        .notEmpty()
        .withMessage('Please enter bank_account_type')
        .matches(/^(saving|SAVING|current|CURRENT*)$/)
        .withMessage(
          'Please enter valid bank_account_type i.e SAVING / CURRENT',
        ),
      check('gstin_no')
        .notEmpty()
        .withMessage('Please enter gstin_no')
        .isAlphanumeric()
        .isLength({
          min: 15,
          max: 15,
        })
        .withMessage('gstin_no should be alphanumeric having length 15'),
      check('address').notEmpty().withMessage('address is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        const reqData = req.body;
        if (req.company.id === '' && req.company.name === '')
          throw {
            message: 'company_name and company_id is required.',
          };
        reqData.company_id = req.company._id;
        reqData.company_name = req.company.name;
        const updateResp = await ThirdPartyInstitute.updateData(
          reqData.id,
          reqData,
        );
        if (!updateResp)
          throw {
            message: 'Error while updating institute details',
          };
        return res.status(200).send({
          message: 'institute details updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

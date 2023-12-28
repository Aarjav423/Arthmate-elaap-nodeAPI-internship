const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const bankDetailsData = require('../models/master-bank-details-schema.js');
const MasterBankDetailHelper = require('../util/master-bank-details-helper');
const moment = require('moment');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //dynamic filter for GET API
  app.get(
    '/api/bank-details/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { page, limit } = req.params;
        const search = req?.query?.search || '';
        let status = null;
        if (req?.query?.status) {
          if (
            req.query.status !== 'Success' &&
            req.query.status !== 'Failure'
          ) {
            throw {
              sucess: false,
              message: 'Invalid status',
            };
          }
          status = req.query.status;
        }
        const bankDetailResp = await bankDetailsData.findByPageWithLimit({
          search: search == 'null' ? null : search,
          page: parseInt(page),
          limit: parseInt(limit),
          status,
        });

        if (!bankDetailResp.rows.length)
          throw {
            sucess: false,
            message: 'No Bank data exists',
          };

        return res.status(200).send({
          success: true,
          count: bankDetailResp.count,
          data: bankDetailResp.rows,
        });
      } catch (error) {
        return res.status(400).json(error?.message || 'Something went Wrong!');
      }
    },
  );

  //POST API for bank account verification with PENNY DROP Integration
  app.post(
    '/api/bank-details',
    [jwt.verifyToken, jwt.verifyUser],
    MasterBankDetailHelper.validateBankDetailsData,
    [
      check('bene_bank_name')
        .isAlphanumeric('en-US', { ignore: ' ' })
        .withMessage('bene_bank_name is required'),
      check('bene_bank_acc_num')
        .isAlphanumeric()
        .withMessage('bene_bank_acc_num is required'),
      check('bene_bank_ifsc')
        .isAlphanumeric()
        .matches(/^[A-Z]{4}[0]{1}[a-zA-Z0-9]{6}$/)
        .withMessage('bene_bank_ifsc is required'),
      check('bene_bank_account_type')
        .isAlphanumeric()
        .withMessage('bene_bank_account_type is required'),
    ],
    async (req, res) => {
      try {
        // Validate the input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const data = req.body;
        // Request Body
        const bankData = {
          bene_bank_name: req.body.bene_bank_name,
          bene_bank_acc_num: req.body.bene_bank_acc_num,
          bene_bank_ifsc: req.body.bene_bank_ifsc,
          bene_bank_account_holder_name: req.body.bene_bank_account_holder_name,
          bene_bank_account_type: req.body.bene_bank_account_type,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          created_by: req?.user?.email || '',
          updated_by: req?.user?.email || '',
        };
        const duplicateBbankDetails =
          await bankDetailsData.checkIfBankExistWithoutId(data);
        if (duplicateBbankDetails) {
          throw {
            success: false,
            message: 'Same bank account number exists.',
          };
        }
        //add data to bank
        const bankDetails = await bankDetailsData.addNew(bankData);
        //Penny Drop Bank account data
        const pennyDropResponseData =
          await MasterBankDetailHelper.pennyDropAPICalling(data);
        const pennyDropFinalResp = JSON.parse(
          JSON.stringify(pennyDropResponseData.data),
        );
        if (
          pennyDropFinalResp.data &&
          pennyDropFinalResp.data['status-code'] === '101' &&
          pennyDropFinalResp.data.result &&
          pennyDropFinalResp.data.result.bankTxnStatus === true
        ) {
          bankData.penny_drop_status = 'Success';
        } else {
          bankData.penny_drop_status = 'Failure';
        }

        await bankDetailsData.updatePennyStatusById(
          bankDetails._id,
          bankData.penny_drop_status,
        );

        return res.status(200).send({
          success: true,
          message: 'Bank details added successfully.',
        });
      } catch (error) {
        return res.status(400).send(error?.message || 'Something went Wrong!');
      }
    },
  );

  //PUT API for bank account verification for Updation of data incase of failure
  app.put(
    '/api/bank-details/:id',
    [jwt.verifyToken, jwt.verifyUser],
    MasterBankDetailHelper.validateBankDetailsData,
    [
      check('bene_bank_name')
        .isAlphanumeric('en-US', { ignore: ' ' })
        .withMessage('bene_bank_name is required'),
      check('bene_bank_acc_num')
        .isAlphanumeric()
        .withMessage('bene_bank_acc_num is required'),
      check('bene_bank_ifsc')
        .isAlphanumeric()
        .matches(/^[A-Z]{4}[0]{1}[a-zA-Z0-9]{6}$/)
        .withMessage('bene_bank_ifsc is required'),
      check('bene_bank_account_type')
        .isAlphanumeric()
        .withMessage('bene_bank_account_type is required'),
    ],
    async (req, res) => {
      try {
        // Validate the input payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const data = req.body;
        const bankData = await bankDetailsData.findById(req.params.id);
        if (!bankData)
          throw {
            success: false,
            message: 'Bank details not found.',
          };
        // CALL the function for Penny drop API
        const bankDetails = await bankDetailsData.checkIfBankExistWithId(
          data,
          req.params.id,
        );
        if (bankDetails) {
          throw {
            success: false,
            message: 'Same bank account number exists.',
          };
        }
        const pennyDropResponseData =
          await MasterBankDetailHelper.pennyDropAPICalling(data);
        pennyDropFinalResp = JSON.parse(
          JSON.stringify(pennyDropResponseData.data),
        );
        // Update the bankData
        bankData.bene_bank_name = data.bene_bank_name;
        bankData.bene_bank_acc_num = data.bene_bank_acc_num;
        bankData.bene_bank_ifsc = data.bene_bank_ifsc;
        bankData.bene_bank_account_holder_name =
          data.bene_bank_account_holder_name;
        bankData.bene_bank_account_type = data.bene_bank_account_type;

        if (
          pennyDropFinalResp.data &&
          pennyDropFinalResp.data['status-code'] === '101' &&
          pennyDropFinalResp.data.result &&
          pennyDropFinalResp.data.result.bankTxnStatus === true
        ) {
          bankData.penny_drop_status = 'Success';
        } else {
          bankData.penny_drop_status = 'Failure';
        }

        // Save the updated bankData
        const updatedBankData = await bankDetailsData.updateById(
          req.params.id,
          bankData,
        );
        if (!updatedBankData)
          throw {
            success: false,
            message: 'Error while updating Bank data',
          };

        return res.status(200).send({
          success: true,
          message: 'Bank details updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error?.message || 'Something went Wrong!');
      }
    },
  );
};

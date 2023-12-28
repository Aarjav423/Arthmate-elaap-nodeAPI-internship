const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const DisbursementChannelMasterSchema = require('../models/disbursement-channel-master-schema');
const DisbursementConfig = require('../models/disbursement-channel-config-schema');
const {
  failResponse,
  successResponse,
  errorResponse,
} = require('../utils/responses');
const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/disbursement-channel-master',
    [
      check('title').notEmpty().withMessage('title is required'),
      check('endpoint').notEmpty().withMessage('endpoint is required'),
      check('secret_key').notEmpty().withMessage('secret_key is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const findByTitle = await DisbursementChannelMasterSchema.findByTitle(
          req.body.title,
        );
        if (findByTitle.length)
          return failResponse(
            req,
            res,
            {},
            'Disbursement Channel Already exist.',
          );
        const result = await DisbursementChannelMasterSchema.addNew(req.body);
        return successResponse(req, res, result);
      } catch (error) {
        return errorResponse(req, res, error);
      }
    },
  );

  app.get('/api/disbursement-channel-master', async (req, res) => {
    try {
      const result = await DisbursementChannelMasterSchema.listAll();
      if (!result.length)
        return failResponse(req, res, {}, 'No records found.');
      return successResponse(req, res, result);
    } catch (error) {
      return errorResponse(req, res, error);
    }
  });

  app.put('/api/disbursement-channel-master/:id', async (req, res) => {
    try {
      const result = await DisbursementChannelMasterSchema.updateById(
        req.body,
        req.params.id,
      );
      return successResponse(req, res, { message: 'Updated successfully!' });
    } catch (error) {
      return errorResponse(req, res, error);
    }
  });

  app.delete('/api/disbursement-channel-master/:id', async (req, res) => {
    try {
      const result = await DisbursementChannelMasterSchema.deleteById(
        req.params.id,
      );
      return successResponse(req, res, { message: 'Deleted successfully!' });
    } catch (error) {
      return errorResponse(req, res, error);
    }
  });

  app.post(
    '/api/topup-disbursement-channel',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('product_id').notEmpty().withMessage('product_id is required'),
      check('disbursement_channel')
        .notEmpty()
        .withMessage('disbursement_channel is required'),
      check('utrn_number').notEmpty().withMessage('utrn_number is required'),
      check('amount').notEmpty().isNumeric().withMessage('Enter valid amount'),
      check('txn_entry').notEmpty().withMessage('txn_entry is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const configuredDisbursmentChannel =
          await DisbursementConfig.findByCompanyAndProductId(
            req.body.company_id,
            req.body.product_id,
          );
        if (!configuredDisbursmentChannel)
          throw {
            success: false,
            message: 'No channel configured for this product',
          };
        if (
          configuredDisbursmentChannel &&
          configuredDisbursmentChannel.disburse_channel !==
            req.body.disbursement_channel
        )
          throw {
            success: false,
            message:
              'Channel you have selected not configured against this product.',
          };

        if (
          configuredDisbursmentChannel &&
          !Number(configuredDisbursmentChannel.status)
        )
          throw {
            success: false,
            message: 'Channel you have selected is configured but not active.',
          };
        const findByDisbursementchannel =
          await DisbursementChannelMasterSchema.findByTitle(
            req.body.disbursement_channel,
          );
        if (!findByDisbursementchannel.length)
          return failResponse(req, res, {}, 'Disbursement Channel not found.');

        const result = await DisbursementLedgerSchema.addNew(req.body);
        // record available balance in disbursement channel config schema
        let availableBalance =
          Number(
            configuredDisbursmentChannel.available_balance
              ? configuredDisbursmentChannel.available_balance
              : 0,
          ) + Number(req.body.amount);
        availableBalance =
          Math.round((availableBalance * 1 + Number.EPSILON) * 100) / 100;
        const availableBalanceUpdate =
          await DisbursementConfig.updateAvailableBalance(
            req.body.company_id,
            req.body.product_id,
            configuredDisbursmentChannel.disburse_channel,
            availableBalance,
          );
        if (!availableBalanceUpdate)
          throw {
            success: false,
            message: 'Error while recording available balance.',
          };
        return successResponse(req, res, result);
      } catch (error) {
        console.log(error);
        return errorResponse(req, res, error);
      }
    },
  );
};

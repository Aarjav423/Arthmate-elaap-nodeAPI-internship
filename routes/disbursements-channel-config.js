bodyParser = require('body-parser');
const DisbursementConfig = require('../models/disbursement-channel-config-schema');
const ColenderSchema = require('../models/co-lender-profile-schema');
const Product = require('../models/product-schema.js');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const s3helper = require('../util/s3helper.js');
//const cw = require("../aws/cloudwatch.js");
let reqUtils = require('../util/req.js');
const { check, validationResult } = require('express-validator');
const CONSTANT = {
  api_name: 'disbursement-channel-config',
};
const helper = require('../util/helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/disbursement-channel-config/:_cid/:_pid', async (req, res) => {
    try {
      const configuredDisbursmentChannel =
        await DisbursementConfig.findByCompanyAndProductId(
          req.params._cid,
          req.params._pid,
        );
      if (!configuredDisbursmentChannel)
        throw {
          success: false,
          message:
            'No configured channel found for disbursement for this product',
        };
      return res.status(200).send(configuredDisbursmentChannel);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/disbursement_config_list',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const reqData = req.body;
        let disbursementConfigList = '';
        if (!reqData.company_id) {
          disbursementConfigList = await DisbursementConfig.getAll();
        } else {
          disbursementConfigList = await DisbursementConfig.findByCompanyId(
            reqData.company_id,
          );
        }
        if (!disbursementConfigList.length)
          throw {
            success: false,
            message: 'No records found for disbursement channel configuration',
          };
        disbursementConfigList = JSON.parse(
          JSON.stringify(disbursementConfigList),
        );
        let colenderIds = [];
        disbursementConfigList.forEach((item) => {
          if (item.co_lender_id) colenderIds.push(item.co_lender_id);
        });
        const uniqueCoLenderIds = [...new Set(colenderIds)];
        //Fetch records for colenderids
        const coLenderData =
          await ColenderSchema.findColendersByIds(uniqueCoLenderIds);
        if (coLenderData.length) {
          coLenderData.forEach((colender) => {
            disbursementConfigList?.forEach((channel) => {
              if (
                channel?.co_lender_id &&
                colender?.co_lender_id.toString() ===
                  channel?.co_lender_id.toString()
              ) {
                channel.co_lender_name = colender?.co_lender_name;
              }
            });
          });
        }
        return res.status(200).send(disbursementConfigList);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/config_disbursement-channel',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const reqData = req.body;
        //validate if disburse_channel is passed in payload
        if (!reqData.disburse_channel)
          throw {
            success: false,
            message: 'disburse_channel is required',
          };
        //validate if debit_account is passed in payload
        if (!reqData.debit_account)
          throw {
            success: false,
            message: 'debit_account is required',
          };
        //validate if debit_account_ifsc is passed in payload
        if (!reqData.debit_account_ifsc)
          throw {
            success: false,
            message: 'debit_account_ifsc is required',
          };

        //create data to record in disbursement_channel_config
        const disburseChannelConfig = {
          company_name: req.company.name,
          company_code: req.company.code,
          company_id: req.company._id,
          product_id: req.product._id,
          product_name: req.product.name,
          status: 1,
          disburse_channel: reqData.disburse_channel,
          wallet_config_check: reqData.wallet_config_check
            ? reqData.wallet_config_check
            : 0,
          debit_account: reqData.debit_account,
          debit_account_ifsc: reqData.debit_account_ifsc,
        };
        //check if disbursement channel already configured against provided company and product
        const disbursementAlreadyExist =
          await DisbursementConfig.findByCompanyAndProductId(
            req.company._id,
            req.product._id,
          );
        if (disbursementAlreadyExist)
          throw {
            success: false,
            message:
              'Disbursement channel configuration already exist for the product of company.',
          };
        //record disbursement channel configuration in schema
        const recordDisbursementChannel = await DisbursementConfig.addNew(
          disburseChannelConfig,
        );
        if (!recordDisbursementChannel)
          throw {
            success: false,
            message: 'Error while adding record to database',
          };
        //maintain logs of disbursement channel configuration
        let xmlUploadToS3 = await s3helper.uploadXmlDataToS3Bucket(
          reqData.company_id,
          'request',
          reqData,
          'modified-disburse-config',
        );
        if (!xmlUploadToS3)
          throw {
            success: false,
            message: 'Something went wrong while uploding data to s3',
          };
        let modifiedLogsData = {
          company_name: req.company.name,
          product_name: req.product.name,
          updated_by: req.user._id,
          raw_data: xmlUploadToS3.Location,
          type: 'inserted',
          company_id: req.company._id,
          api_name: CONSTANT.api_name,
        };
        let modifiedLogs = await helper.addModifiedLogs(modifiedLogsData);
        if (!modifiedLogs)
          throw {
            success: false,
            message:
              'Error while adding disbursement channel config logs to database',
          };
        return res.send({
          success: true,
          message: 'Dibursement channel configured successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  //Colender disbursement channel config api.
  app.post(
    '/api/config-colender-disbursement-channel',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const reqData = req.body;
        //validate if disburse_channel is passed in payload
        if (!reqData.disburse_channel)
          throw {
            success: false,
            message: 'disburse_channel is required',
          };
        //validate if debit_account is passed in payload
        if (!reqData.debit_account)
          throw {
            success: false,
            message: 'debit_account is required',
          };
        //validate if debit_account_ifsc is passed in payload
        if (!reqData.debit_account_ifsc)
          throw {
            success: false,
            message: 'debit_account_ifsc is required',
          };
        //Check if colender exist by id.
        const colenderData = await ColenderSchema.findByColenderId(
          reqData.co_lender_id,
        );
        if (!colenderData)
          throw {
            success: false,
            message: 'No records found against provided colender_id.',
          };
        //create data to record in disbursement_channel_config
        const disburseChannelConfig = {
          co_lender_id: Number(reqData.co_lender_id),
          status: 1,
          disburse_channel: reqData.disburse_channel,
          wallet_config_check: reqData.wallet_config_check
            ? reqData.wallet_config_check
            : 0,
          debit_account: reqData.debit_account,
          debit_account_ifsc: reqData.debit_account_ifsc,
        };
        //check if disbursement channel already configured against provided colender_id
        const disbursementAlreadyExist =
          await DisbursementConfig.findByColenderId(reqData.co_lender_id);
        if (disbursementAlreadyExist)
          throw {
            success: false,
            message:
              'Disbursement channel configuration already exist for the colender.',
          };
        //record disbursement channel configuration in schema
        const recordDisbursementChannel = await DisbursementConfig.addNew(
          disburseChannelConfig,
        );
        if (!recordDisbursementChannel)
          throw {
            success: false,
            message: 'Error while adding record to database',
          };
        //maintain logs of disbursement channel configuration
        let xmlUploadToS3 = await s3helper.uploadXmlDataToS3Bucket(
          reqData.co_lender_id,
          'request',
          reqData,
          'modified-disburse-config',
        );
        if (!xmlUploadToS3)
          throw {
            success: false,
            message: 'Something went wrong while uploding data to s3',
          };
        let modifiedLogsData = {
          co_lender_id: reqData.co_lender_id,
          updated_by: req.user._id,
          raw_data: xmlUploadToS3.Location,
          type: 'inserted',
          api_name: CONSTANT.api_name,
        };
        let modifiedLogs = await helper.addModifiedLogs(modifiedLogsData);
        if (!modifiedLogs)
          throw {
            success: false,
            message:
              'Error while adding disbursement channel config logs to database',
          };
        return res.send({
          success: true,
          message: 'Dibursement channel configured successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.put(
    '/api/disbursement-config/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const reqData = req.body;
        //Check whether configuration exist
        const disbursementChannelConfig =
          await DisbursementConfig.getDisburseChannel({
            _id: req.params.id,
          });
        if (!disbursementChannelConfig)
          throw {
            success: false,
            message: 'No record found for disbursement channel configuration',
          };
        const disburseChannelConfig = {
          company_name: req.company.name,
          company_code: req.company.code,
          company_id: req.company._id,
          product_id: req.product._id,
          product_name: req.product.name,
          status: 1,
          disburse_channel: reqData.disburse_channel,
          wallet_config_check: reqData.wallet_config_check
            ? reqData.wallet_config_check
            : '',
          debit_account: reqData.debit_account,
        };
        //update disbursement channel configuration by id
        const updateChannelStatus =
          await DisbursementConfig.updateChannelConfigById(
            disburseChannelConfig,
            req.params.id,
          );
        if (!updateChannelStatus)
          throw {
            success: false,
            message: 'Error while updating disbursement channel configuration',
          };
        xmlReqData = {
          company_name: req.company.name,
          record_id: req.params.id,
          user_id: req.user._id,
          channel_status: req.body.disburse_channel,
          company_id: req.company._id,
        };
        uploadXMLResponse = s3helper.uploadXmlDataToS3Bucket(
          req.company._id,
          'request',
          xmlReqData,
          'modified-disburse-config',
        );
        if (!uploadXMLResponse)
          throw {
            success: false,
            message: 'Something went wrong while uploding data to s3',
          };
        let modifiedLogsData = {
          company_name: req.company.name,
          updated_by: req.user._id,
          raw_data: uploadXMLResponse.Location,
          type: 'updated-channel',
          company_id: req.company._id,
        };
        addLogsResp = await helper.addModifiedLogs(modifiedLogsData);
        if (!addLogsResp)
          throw {
            success: false,
            message: 'Error while adding logs to database',
          };
        return res.status(200).send({
          success: true,
          message: 'Disbursement channel configuration updated Successfully!',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //change the Disbursement channel configuration status (Active or Inactive)
  app.put(
    '/api/disbursement-config/status/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const UpdateStatus =
          await DisbursementConfig.updateChannelConfigStatusById(
            req.body.status,
            req.params.id,
          );
        if (!UpdateStatus)
          throw {
            status: false,
            message:
              'Error while updating disbursement channel configuration status.',
          };
        const msg = req.body.status == 1 ? 'activated' : 'deactivated';
        res.send({
          status: true,
          message: `Disbursement channel configuration ${msg}.`,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put('/api/disbursement-config-colender/status/:id', async (req, res) => {
    try {
      const UpdateStatus =
        await DisbursementConfig.updateChannelConfigStatusById(
          req.body.status,
          req.params.id,
        );
      if (!UpdateStatus)
        throw {
          status: false,
          message:
            'Error while updating disbursement channel configuration status.',
        };
      const msg = req.body.status == 1 ? 'activated' : 'deactivated';
      res.send({
        status: true,
        message: `Disbursement channel configuration ${msg}.`,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.delete(
    '/api/disbursement-config/:id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res) => {
      const reqData = req.body;
      try {
        //Check whether configuration exist
        const disbursementChannelConfig =
          await DisbursementConfig.getDisburseChannel({
            _id: req.params.id,
          });
        if (!disbursementChannelConfig)
          throw {
            success: false,
            message: 'No record found for disbursement channel configuration',
          };
        //Delete configuration by id
        let deleteDisbursementById = await DisbursementConfig.deleteById(
          req.params.id,
        );
        if (!deleteDisbursementById)
          throw {
            success: false,
            message:
              'Something went wrong while deleting disbursement channel configuration',
          };
        const xmlReqData = {
          company_name: req.company.name,
          record_id: req.params.id,
          user_id: req.user._id,
          company_id: req.company._id,
        };
        const uploadResponse = s3helper.uploadXmlDataToS3Bucket(
          req.company._id,
          'request',
          xmlReqData,
          'modified-disburse-config',
        );
        if (!uploadResponse)
          return res.status(400).json({
            message: 'Something went wrong while uploding data to s3',
          });
        let modifiedLogsData = {
          company_name: req.company.name,
          updated_by: req.user._id,
          raw_data: uploadResponse.Location,
          type: 'deleted',
          company_id: req.company._id,
          api_name: CONSTANT.api_name,
        };
        const addLogs = helper.addModifiedLogs(modifiedLogsData);
        if (!addLogs)
          throw {
            success: false,
            message: 'Error while adding logs to database',
          };
        return res.status(200).send({
          success: true,
          message: 'Disbursement channel deleted successfully !',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

bodyParser = require('body-parser');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const { check } = require('express-validator');
const moment = require('moment');
const LoanActivities = require('../models/loan-activities-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/send_enhanced_review',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
      check('comment').notEmpty().withMessage('comment name is required'),
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const leadDetails = await LoanRequestSchema.findByLId(
          reqData.loan_app_id,
        );
        if (!leadDetails)
          throw {
            success: false,
            message:
              'No record found in lead table aginst provoded loan_app_id',
          };
        const loanAlreadyExist = await BorrowerinfoCommon.findByLId(
          reqData.loan_app_id,
        );
        if (loanAlreadyExist !== null) {
          throw {
            message:
              "As loan already exist lead can't send for enhanced review.",
            data: loanAlreadyExist,
          };
        }
        let data = {};
        data.loan_app_id = reqData.loan_app_id;
        data.company_id = reqData.company_id;
        data.product_id = reqData.product_id;
        data.product_name = reqData.product_name;
        data.company_name = reqData.partner_name;
        data.partner_loan_app_id = reqData.partner_loan_app_id;
        data.lead_status = 'enhanced_review_required';
        data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
        const updateStatusResp = await LoanRequestSchema.updateLeadStatus(
          data.loan_app_id,
          data,
        );
        if (!updateStatusResp)
          throw {
            success: false,
            message: 'Failed to update lead status',
          };

        data.comment = reqData.comment;
        data.user_id = reqData.user_id;
        data.api_type = 'send_enhanced_review';

        //upload request data to s3
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${data.api_type}/${data.company_id}/${
          data.loan_app_id
        }/${filename}/${Date.now()}.txt`;
        const uploadRequest = await s3helper.uploadFileToS3(data, reqKey);
        if (!uploadRequest) {
          throw {
            success: false,
            message: 'Error while updating request data to s3',
          };
        }
        if (uploadRequest) {
          data.request_type = 'request';
          data.url = uploadRequest.Location;
        }
        // //insert request data s3 upload response to database
        const addRequest = await LoanActivities.addNew(data);
        if (!addRequest) {
          throw {
            success: false,
            message: 'Error while adding request data to database',
          };
        }
        return res.status(200).send({
          status: true,
          message: 'Successfully requested for enhanced review.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );
};

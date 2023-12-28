bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper');
const moment = require('moment');
const services = require('../util/service');
//var bureauService = require("../models/service-req-res-log-schema.js");
const { check, validationResult } = require('express-validator');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  const bureau_url = process.env.BUREAU_URL;
  const access_key = process.env.ADVANCE_AI_ACCESS_KEY;

  app.post(
    '/api/credit_report',
    [
      check('panNumber')
        .notEmpty()
        .withMessage('panNumber is required')
        .matches(/^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/)
        .withMessage('Please enter panNumber in valid format'),
      check('phoneNumber')
        .notEmpty()
        .withMessage('phoneNumber is required')
        .isLength({
          min: 10,
          max: 10,
        })
        .withMessage('Please enter valid 10 digit phoneNumber'),
      check('firstName').notEmpty().withMessage('firstName is required'),
      check('birthday')
        .notEmpty()
        .withMessage('birthday is required')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Please enter valid birthday in YYYY-MM-DD format'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_BUREAU_CREDIT),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const data = req.body;

        if (data.phoneNumber) {
          data.phoneNumber = '+91' + data.phoneNumber;
        }
        const dates = moment().format('YYYY-MM-DD');
        const reqData = {
          company_id: req.company._id,
          company_code: req.company.code,
          company_name: req.company.name,
          vendor_name: 'ADVANCE_AI',
          api_name: 'credit_report',
          service_id: process.env.SERVICE_BUREAU_CREDIT,
          response_type: 'success',
          request_type: 'request',
          timestamp: dates,
          raw_data: '',
          kyc_id: '',
          pan_card: data.panNumber,
          document_uploaded_s3: '1',
          api_response_type: 'JSON',
          api_response_status: 'SUCCESS',
        };
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${reqData.api_name}/${reqData.vendor_name}/${reqData.company_id}/${filename}/${reqData.timestamp}.txt`;
        //upload request data to S3
        const uploadS3Request = await s3helper.uploadFileToS3(req.body, reqKey);
        if (!uploadS3Request) {
          (reqData.document_uploaded_s3 = 0), (reqData.response_type = 'error');
          throw {
            message: 'Error while uploading request data to S3',
          };
        }
        reqData.document_uploaded_s3 = 1;
        reqData.response_type = 'success';
        reqData.raw_data = uploadS3Request.Location;
        //insert request data s3 upload response to database
        const addReq = await bureauService.addNew(reqData);
        if (!addReq)
          return reqUtils.json(req, res, next, 400, {
            message: 'Error while adding request data',
            success: false,
          });
        const config = {
          method: 'post',
          url: bureau_url + '/credit-report',
          headers: {
            'X-ADVAI-KEY': access_key,
            'content-type': 'application/json',
          },
          data: data,
        };
        const bureauResp = await axios(config);
        filename = Math.floor(10000 + Math.random() * 99999) + '_res';
        const resKey = `${reqData.api_name}/${reqData.vendor_name}/${reqData.company_id}/${filename}/${reqData.timestamp}.txt`;
        //upload response data to S3
        const uploadS3Response = await s3helper.uploadFileToS3(
          bureauResp.data,
          resKey,
        );
        if (!uploadS3Response) {
          (reqData.document_uploaded_s3 = 0), (reqData.response_type = 'error');
          throw {
            message: 'Error while uploading response data to S3',
          };
        }
        reqData.raw_data = uploadS3Response.Location;
        reqData.request_type = 'response';
        reqData.api_response_status = 'success';
        reqData.api_response_status =
          bureauResp.data.pricingStrategy == 'PAY' ? 'SUCCESS' : 'FAIL';
        //insert response data s3 upload response to database
        const addResp = await bureauService.addNew(reqData);
        if (!addResp)
          return reqUtils.json(req, res, next, 400, {
            message: 'Error while adding response data',
            success: false,
          });
        return res.status(200).json({
          data: bureauResp.data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

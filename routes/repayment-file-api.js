const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper');
const repaymentFileDumpSchema = require('../models/repayment-file-dump-schema');
const moment = require('moment');

module.exports = (app) => {
  app.post(
    '/api/repayment-file',
    [
      check('file_name').notEmpty().withMessage('file_name is required'),
      check('file_type')
        .notEmpty()
        .withMessage('file_type is required')
        .matches(/Origin Repayment File/)
        .withMessage("file_type should be 'Origin Repayment File'"),
      check('base64').notEmpty().withMessage('base64 is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const { body, user } = req;
        const isNotCsv = body.file_name.split('.')[1] !== 'csv';
        if (isNotCsv)
          throw {
            success: false,
            message: `Only *.csv file are allowed for file type ${body.file_type}`,
          };
        const response = await uploadFileToS3(body.base64, body.file_type);
        if (!response)
          throw {
            success: false,
            message: 'Failed to upload file into S3',
          };
        let repaymentFileDump = buildRepaymentFileDump(
          body,
          user,
          response.Location,
        );
        repaymentFileDump =
          await repaymentFileDumpSchema.save(repaymentFileDump);
        if (!repaymentFileDump)
          throw {
            success: false,
            message: 'Failed to save repayment file details',
          };
        return res.status(200).send({
          success: true,
          message: 'Repayment file uploaded successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/repayment-file/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        let { page, limit } = req.params;
        let response = {};
        page = parseInt(page);
        limit = parseInt(limit);
        const results = await repaymentFileDumpSchema.findByCriteria(req.query);
        response.count = results.length;
        response.rows = Array.from(results).slice(
          page * limit,
          (page + 1) * limit,
        );
        return res.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: 'Failed to fetch repayment file data',
        });
      }
    },
  );

  app.post(
    '/api/repayment-file/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const result = req.body;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const matches = result.s3_url.match(regex);
        const bucket = matches[1];
        if (!matches) {
          throw {
            status: false,
            Messgae: 'Bucket name not found',
          };
        }
        const regexUrl = /com\/([^\.]+)\//;
        const output = result.s3_url.match(regexUrl);
        const urlIndex = output[1];
        const key = result.s3_url.substring(result.s3_url.indexOf(urlIndex));
        const s3Object = await s3helper.fetchDataFromColenderS3(key, bucket);
        res.status(200).send(s3Object);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const uploadFileToS3 = async (base64, file_type) => {
  base64 = base64.replace('data:text/csv;base64,', '');
  const buffer = new Buffer.from(base64, 'base64');
  let key = `RepaymentFile/${file_type.replace(/\s+/g, '-')}/${moment().format(
    'DD-MM-YYYY-HH-mm-ss',
  )}.csv`;
  return await s3helper.putFileIntoS3(key, buffer, 'text/csv');
};

const buildRepaymentFileDump = (body, user, s3_url) => {
  let repaymentFileDump = {
    file_type: body.file_type,
    file_code: body.file_code,
    file_name: body.file_name,
    validation_stage: 1,
    validation_status: 'Approved',
    s3_url: s3_url,
    created_by: user.email,
    updated_by: user.email,
  };
  return repaymentFileDump;
};

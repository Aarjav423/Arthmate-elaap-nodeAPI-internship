const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const { validationResult, check } = require('express-validator');
const BulkUploadQueueSchema = require('../../../models/bulk-upload-queue-schema.js');
const s3helper = require('../utils/aws-s3-helper.js');
const moment = require('moment');
const bulkUploadHelper = require('../../../util/bulk-upload-helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/get-bulk-upload-data',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { page, limit, fromDate, toDate, fileType } = req.body;
        const data = await BulkUploadQueueSchema.findByFilter({ fromDate, toDate, fileType, page: Number(page), limit: Number(limit) });

        res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  );

  app.post(
    '/api/upload-bulk-file',
    [
      check('file_name').notEmpty().withMessage('File Name is required'),
      check('file_type').notEmpty().withMessage('File Type is required'),
      check('base64').notEmpty().withMessage('File is required'),
    ],
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { body, user } = req;
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }

        let data = {
          file_type: body.file_type,
          file_extension_type: body.file_extension_type,
          file_name: body.file_name,
          base64: body.base64,
          s3_folder_path: 'Nach',
          validation_stage: 1,
          validation_status: 'Approved',
          created_by: user.username,
          updated_by: user.username,
        }

        await bulkUploadHelper.uploadBulkFile(data);

        return res.status(200).send({
          success: true,
          message: 'File uploaded successfully'
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/download-bulk-upload-file/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const fileData = await BulkUploadQueueSchema.findById(req.params.id);
        if (!fileData)
          throw {
            success: false,
            message: 'No record found for respective file.',
          };

        const signedUrl = await s3helper.getSignedUrlForNach(fileData[0].s3_url, fileData[0].file_name);
        return res.status(200).send(signedUrl);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  )
}
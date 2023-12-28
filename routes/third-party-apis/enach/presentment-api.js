const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const { validationResult, check } = require('express-validator');
const BulkUploadQueueSchema = require('../../../models/bulk-upload-queue-schema.js');
const s3helper = require('../utils/aws-s3-helper.js');
const bulkUploadHelper = require('../../../util/bulk-upload-helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.post(
    '/api/batch-transaction-data',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { page, limit, company_id, fromDate, toDate, fileType } = req.body;
        const transactionData = await BulkUploadQueueSchema.findByFilter({ company_id, fromDate, toDate, fileType, page: Number(page), limit: Number(limit) });

        if(transactionData.count === 0 || transactionData.data.length === 0) {
          throw {
            message: "No data found"
          }
        }
        res.status(200).send(transactionData);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  );

  app.post(
    '/api/upload-nach-presentment-file',
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
          company_id: req.authData.company_id,
          file_type: body.file_type,
          file_extension_type: body.file_extension_type,
          file_code: body.file_code,
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
          message: 'Presentment file uploaded successfully'
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/download-nach-presentment-file/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const presentmentData = await BulkUploadQueueSchema.findById(req.params.id);
        if (!presentmentData)
          throw {
            success: false,
            message: 'No record found for presentment file.',
          };

        const signedUrl = await s3helper.getSignedUrlForNach(presentmentData[0].s3_url, presentmentData[0].file_name);
        return res.status(200).send(signedUrl);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  )
}
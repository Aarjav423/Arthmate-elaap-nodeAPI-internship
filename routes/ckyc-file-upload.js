'use strict';
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const s3helper = require('../util/s3helper.js');
const fs = require('fs').promises;
var XLSX = require('xlsx');
const CkycFileDumpSchema = require('../models/ckyc-file-dump-schema');
const reportUploadHelper = require('../util/report');

module.exports = (app) => {
  app.get('/api/ckyc-file-details', [jwt.verifyToken], async (req, res) => {
    try {
      const ckycFileDetails = await CkycFileDumpSchema.getPaginatedData();
      if (!ckycFileDetails) {
        throw {
          success: false,
          message: 'Internal server error',
        };
      }
      return res.status(200).send(ckycFileDetails);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/ckyc-file-dump',
    [
      check('file_name').notEmpty().withMessage('file_name is required'),
      check('file_type')
        .notEmpty()
        .withMessage('file_type is required')
        .matches(/CKYC_UPLOAD_FILE/)
        .withMessage('file_type should be CKYC_UPLOAD_FILE'),
      check('file').notEmpty().withMessage('file is required'),
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
        const data = req.body;
        const user = req.user;
        let filename = '';
        var s3Url = '';
        let randomNumber = Math.floor(10000 + Math.random() * 99999);
        let currentDateInMs = new Date().getTime();
        if (data.file_type === 'CKYC_UPLOAD_FILE') {
          const extension = data.file_name.split('.');
          if (extension[1] !== 'txt') {
            throw {
              success: false,
              message: 'Please upload .txt file.',
            };
          }
          data.file = data.file.replace('data:text/plain;base64,', '');

          filename = `${data.file_type}_${Date.now()}.txt`;
          await fs.writeFile(filename, data.file, { encoding: 'base64' });
          s3Url = `ckycBulkUploadFiles/${data.file_type}/${data.user_id}/${randomNumber}/${currentDateInMs}.txt`;
        }

        s3Url = await reportUploadHelper.uploadXlsxToS3(filename, s3Url);
        const UnlinkXls = await fs.unlink(
          path.join(__dirname, `../${filename}`),
        );
        if (!s3Url) {
          throw {
            success: false,
            message: 'Error while uploading file to S3',
          };
        }

        const ckycFileDetailsDump = {
          file_type: data.file_type,
          file_name: data.file_name,
          validation_status: 0,
          rejection_remarks: '',
          s3_url: s3Url.Location,
          is_approved: true,
          created_by: user.email,
          updated_by: user.email,
        };
        const savedCkycFileDetailsDump =
          await CkycFileDumpSchema.addNew(ckycFileDetailsDump);
        if (!savedCkycFileDetailsDump) {
          throw {
            success: false,
            message: 'Internal server error',
          };
        }
        return res.status(200).send(savedCkycFileDetailsDump);
      } catch (error) {
        console.log('error >>', error);
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/download-processed-ckyc-files/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const fileDetails = await CkycFileDumpSchema.findById(req.params.id);

        if (!fileDetails) {
          throw {
            success: false,
            message: 'File contents not found',
          };
        }
        const s3url = fileDetails.s3_url;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const result = s3url.match(regex);
        const colenderBucketName = result[1];
        if (!result) {
          throw {
            status: false,
            Messgae: 'Bucket name not found',
          };
        }
        const regexUrl = /com\/([^\.]+)\//;
        const output = s3url.match(regexUrl);
        const urlIndex = output[1];
        const bucketUrl = s3url.substring(s3url.indexOf(urlIndex));
        if (fileDetails.file_type === 'CKYC_UPLOAD_FILE') {
          let reportFromS3Resp = await s3helper.readFileFromS3(bucketUrl);
          var buffer = await stream2buffer(reportFromS3Resp);
          return res.status(200).send(buffer);
        }
      } catch (er) {
        return res.status(400).send(er);
      }
    },
  );

  function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
      const _buf = [];
      stream.on('data', (chunk) => _buf.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(_buf)));
      stream.on('error', (err) => reject(err));
    });
  }
};

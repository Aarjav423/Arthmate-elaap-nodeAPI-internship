'use strict';
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const s3helper = require('../util/s3helper.js');
const fs = require('fs').promises;
var XLSX = require('xlsx');
const csv = require('csvtojson');
const UtrFileDetailsDumpSchema = require('../models/utr-file-details-dump-schema');
const reportUploadHelper = require('../util/report');
const fileType = {
  ESCROW_UTR: 0,
  BORROWER_UTR: 1,
  CBI_APPROVAL_FILE: 2,
  REPAYMENT_SCHEDULE: 3,
  LOAN_MAPPING_FILE: 4,
};
module.exports = (app) => {
  app.get(
    '/api/bank-file-details',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const bankFileDetails =
          await UtrFileDetailsDumpSchema.getPaginatedData();
        if (!bankFileDetails) {
          throw {
            success: false,
            message: 'Internal server error',
          };
        }
        return res.status(200).send(bankFileDetails);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/file-upload-approval-search',
    [
      check('co_lender_shortcode')
        .notEmpty()
        .withMessage('Colender name is required'),
    ],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const co_lender_shortcode = req.query.co_lender_shortcode;
        const file_type = req.query.file_type;
        const validation_status = req.query.validation_status;
        const from_created_at = req.query.from_created_at;
        const to_created_at = req.query.to_created_at;

        const data = {};
        co_lender_shortcode && (data.co_lender_shortcode = co_lender_shortcode);
        file_type && (data.file_type = file_type);
        validation_status && (data.validation_status = validation_status);

        const created_at = {};
        from_created_at && (created_at.$gte = from_created_at);
        to_created_at && (created_at.$lte = to_created_at);
        !(Object.keys(created_at).length === 0) &&
          (data.created_at = created_at);

        const uploadAllFiles = await UtrFileDetailsDumpSchema.findAll(data);
        const uploadFiles = await UtrFileDetailsDumpSchema.findByColenderData(
          data,
        ).sort({ created_at: -1 });
        let uploadedFiles = [];
        for await (let ele of uploadFiles) {
          uploadedFiles.push(ele);
        }
        res.json({
          uploadAllFiles,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/file-upload-approval-submit',
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

        let ids = [];
        Array.from(req.body).map((ele) => ids.push(ele._id));
        let update = {
          validation_status: req.body[0].validation_status,
          rejection_remarks: req.body[0].rejection_remarks,
          updated_by: req.body[0].updated_by,
        };
        for (let ele of ids) {
          const file_data = await UtrFileDetailsDumpSchema.updateByLID(
            ele,
            update,
          );
        }
        return res.status(200).send({
          status: 'SUCCESS',
          message: 'Updated Successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/bank-file-details-dump',
    [
      check('file_name').notEmpty().withMessage('file_name is required'),
      check('co_lender_shortcode')
        .notEmpty()
        .withMessage('co_lender_shortcode is required'),
      check('file_type')
        .notEmpty()
        .withMessage('file_type is required')
        .matches(
          /ESCROW_UTR|BORROWER_UTR|CBI_APPROVAL_FILE|REPAYMENT_SCHEDULE|LOAN_MAPPING_FILE/,
        )
        .withMessage(
          "file_type should be either 'ESCROW_UTR' or 'BORROWER_UTR' or 'CBI_APPROVAL_FILE' OR 'REPAYMENT_SCHEDULE' OR 'LOAN_MAPPING_FILE'",
        ),
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
        if (data.file_type === 'REPAYMENT_SCHEDULE') {
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
          s3Url = `BulkUploadFiles/${data.file_type}/${data.co_lender_shortcode}/${randomNumber}/${currentDateInMs}.txt`;
        } else {
          const extension = data.file_name.split('.');
          if (extension[1] !== 'xlsx') {
            throw {
              success: false,
              message: 'Please upload .xlsx file.',
            };
          }
          data.file = data.file.replace(
            'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,',
            '',
          );
          filename = `${data.file_type}_${Date.now()}.xlsx`;
          await fs.writeFile(filename, data.file, { encoding: 'base64' });
          s3Url = `BulkUploadFiles/${data.file_type}/${data.co_lender_shortcode}/${randomNumber}/${currentDateInMs}.xlsx`;
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
        //Note After Approval screen values shall change
        if (fileType[data.file_type] == 0 || fileType[data.file_type] == 1) {
          var utrFileDetailsDump = {
            file_type: fileType[data.file_type],
            file_name: data.file_name,
            co_lender_shortcode: data.co_lender_shortcode,
            co_lender_name: data.co_lender_name,
            validation_status: 3,
            rejection_remarks: '',
            s3_url: s3Url.Location,
            utr_details: [],
            cbi_loan_details: [],
            is_approved: true,
            created_by: user.email,
            updated_by: user.email,
          };
        } else {
          var utrFileDetailsDump = {
            file_type: fileType[data.file_type],
            file_name: data.file_name,
            co_lender_shortcode: data.co_lender_shortcode,
            co_lender_name: data.co_lender_name,
            validation_status: 0,
            rejection_remarks: '',
            s3_url: s3Url.Location,
            utr_details: [],
            cbi_loan_details: [],
            is_approved: true,
            created_by: user.email,
            updated_by: user.email,
          };
        }
        const savedUtrFileDetailsDump =
          await UtrFileDetailsDumpSchema.create(utrFileDetailsDump);
        if (!savedUtrFileDetailsDump) {
          throw {
            success: false,
            message: 'Internal server error',
          };
        }
        return res.status(200).send(savedUtrFileDetailsDump);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  app.get(
    '/api/download-processed-bank-files/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const fileDetails = await UtrFileDetailsDumpSchema.findById(
          req.params.id,
        );
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
        if (fileDetails.file_type === 3) {
          let reportFromS3Resp = await s3helper.readColenderFileFromS3(
            bucketUrl,
            colenderBucketName,
          );
          const json = await csv().fromStream(reportFromS3Resp);
          return res.status(200).send(json);
        } else {
          res.attachment(s3url);
          let reportFromS3Resp = await s3helper.fetchDataFromColenderS3(
            bucketUrl,
            colenderBucketName,
          );
          let filename = `BulkUploadFiles${Date.now()}.xlsx`;
          const downloadedFileResp = await fs.writeFile(
            filename,
            reportFromS3Resp,
          );
          var workbook = XLSX.readFile(`./${filename}`, {
            dateNF: 'yyyy-mm-dd',
          });
          var ws = workbook.Sheets[workbook?.Props?.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { raw: false });
          const UnlinkXls = await fs.unlink(
            path.join(__dirname, `../${filename}`),
          );
          return res.status(200).send(data);
        }
      } catch (er) {
        return res.status(400).send(er);
      }
    },
  );
};

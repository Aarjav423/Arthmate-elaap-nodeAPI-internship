const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const s3helper = require('../util/s3helper.js');
const helper = require('../util/helper.js');
const validate = require('../util/validate-req-body.js');
const jwt = require('../util/jwt');
const fs = require('fs').promises;
const moment = require('moment');
const BatchReportStorageSchema = require('../models/batch-report-storage-schema');
const ReportStorageSchema = require('../models/report-storage-schema');

module.exports = (app, connection) => {
  //Api to fetch generated ckyc report records
  app.get(
    '/api/ckyc_report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const ckycReportsResp = await ReportStorageSchema.getPaginatedData(
          req.params.page,
          req.params.limit,
          'ckyc_upload_and_update',
          company_id,
        );
        if (!ckycReportsResp.rows.length)
          throw {
            success: false,
            message: ' No records found for ckyc reports',
          };
        return res.status(200).send(ckycReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated ckyc report
  app.get(
    '/api/download_ckyc_report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const ckycScheduleReportResp = await ReportStorageSchema.findById(
          req.params.id,
        );
        if (!ckycScheduleReportResp)
          throw {
            success: false,
            message: 'No record found for ckyc report.',
          };
        let url = ckycScheduleReportResp.s3_url;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const result = url.match(regex);
        const bucketName = result[1];
        if (!result) {
          throw {
            status: false,
            message: 'Bucket name not found',
          };
        }
        const regexUrl = /com\/([^\.]+)\//;
        const output = url.match(regexUrl);
        const urlIndex = output[1];
        let excelFile = await s3helper.fetchDataFromColenderS3(
          url.substring(url.indexOf(urlIndex)),
          bucketName,
        );
        return res.status(200).send(excelFile);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Api to generate ckyc report
  app.post(
    '/api/ckyc_report',
    [jwt.verifyToken, jwt.verifyUser],
    [
      check('date')
        .notEmpty()
        .withMessage('date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid from_date in YYYY-MM-DD format'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });

        let date = moment(data.date, 'YYYY-MM-DD');
        const dateString = moment(date).format('DD-MM-YYYY');
        const recordReportResp =
          await BatchReportStorageSchema.findIfExistByDate(
            dateString,
            dateString,
            'ckyc_upload_and_update',
          );

        let recordReportStorageResp = [];
        for (var i = 0; i < recordReportResp.length; i++) {
          let reportData = {
            file_name: recordReportResp[i].file_name,
            requested_by_name: req.user.username,
            requested_by_id: req.user._id,
            s3_url: recordReportResp[i].s3_url,
            company_name: req.company?.name ? req.company.name : '',
            company_code: req.company?.code ? req.company.code : '',
            product_name: data.product_id ? productResp.name : '',
            product_id: data.product_id ? data.product_id : '',
            company_id: data.company_id ? data.company_id : '',
            report_name: 'ckyc_upload_and_update',
            from_date: data.date,
            to_date: data.date,
          };
          recordReportStorageResp[i] =
            await ReportStorageSchema.addNew(reportData);
        }

        if (recordReportStorageResp.length === 0)
          throw {
            success: false,
            message: 'No record found for selected date',
          };
        return res.status(200).send({
          message: 'ckyc report generated successfully.',
          data: recordReportStorageResp,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //api to upload ckyc txt file

  function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
      const _buf = [];

      stream.on('data', (chunk) => _buf.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(_buf)));
      stream.on('error', (err) => reject(err));
    });
  }
};

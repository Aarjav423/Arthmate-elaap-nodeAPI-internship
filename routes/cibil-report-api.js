const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper');
const ReportStorageSchema = require('../models/report-storage-schema');
const fs = require('fs').promises;
var XLSX = require('xlsx');
const MonthlyReportSchema = require("../models/monthly-collection-data-export-schema")

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  // Get list of generated reports against report type cibil
  app.post(
    '/api/cibil-transaction-report/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        let filter = {report_type : "cibil"}
        if (req.body.month && req.body.year) {
          filter.month = parseInt(req.body.month)
          filter.year = req.body.year
        }
        const cibilReportsResp = await MonthlyReportSchema.findByReportType(
            filter,
            req.params.page,
            req.params.limit
        )
        if (!cibilReportsResp.rows.length)
          throw {
            success: false,
            message: ' No record found for the filter',
          };
        return res.status(200).send(cibilReportsResp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  // Download specific generated report by id
  app.get(
    '/api/download-cibil-transaction-report/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const cibilReportResp = await MonthlyReportSchema.findById(
          req.params.id,
        );
        if (!cibilReportResp)
          throw {
            success: false,
            message: 'No record found for cibil report.',
          };
        const regex = /https:\/\/([^\.]+)\.s3/;
        const matches = cibilReportResp.report_s3_url.match(regex);
        const bucket = matches[1];
        if (!matches) {
          throw {
            status: false,
            Messgae: 'Bucket name not found',
          };
        }
        const regexUrl = /com\/([^\.]+)\//;
        const output = cibilReportResp.report_s3_url.match(regexUrl);
        const urlIndex = output[1];
        const key = cibilReportResp.report_s3_url.substring(cibilReportResp.report_s3_url.indexOf(urlIndex));
        const s3Object = await s3helper.fetchDataFromColenderS3(key, bucket);
        res.status(200).send(s3Object);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

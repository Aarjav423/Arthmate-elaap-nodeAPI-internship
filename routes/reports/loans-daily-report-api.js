const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const jwt = require('../../util/jwt');
const s3helper = require('../../util/s3helper');
const loanSchema = require('../../models/reports-schema/loan-report-schema');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch loan reports.
  app.get(
    '/api/loan-report/:day/:month/:year/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { day, month, year, page, limit } = req.params;
        const reportList = await loanSchema.findByFilter({
          day,
          month,
          year,
          page,
          limit,
        });
        if (!reportList.rows.length)
          throw {
            success: false,
            message: 'No records found for loans report.',
          };
        const reportListData = JSON.parse(JSON.stringify(reportList));
        reportListData.rows.forEach((item) => {
          item.report_name = 'loans_report';
        });
        return res.json(reportListData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to download loans report
  app.get(
    '/api/loan-reports/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const loanReportResp = await loanSchema.findById(req.params.id);
        if (!loanReportResp)
          throw {
            success: false,
            message: 'No record found for loan report.',
          };
        //Fetch data from S3 by url
        let url = loanReportResp.report_s3_url;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const result = url.match(regex);
        const bucketName = result[1];
        if (!result) {
          throw {
            status: false,
            Messgae: 'Bucket name not found',
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
};

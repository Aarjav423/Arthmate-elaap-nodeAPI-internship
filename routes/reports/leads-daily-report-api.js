const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const jwt = require('../../util/jwt');
const s3helper = require('../../util/s3helper');
const leadSchema = require('../../models/reports-schema/lead-report-schema');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch lead reports.
  app.get(
    '/api/lead-report/:day/:month/:year/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { day, month, year, page, limit } = req.params;
        const reportList = await leadSchema.findByFilter({
          day,
          month,
          year,
          page,
          limit,
        });
        if (!reportList.rows.length)
          throw {
            success: false,
            message: 'No records found for lead report.',
          };
        const reportListData = JSON.parse(JSON.stringify(reportList));
        reportListData.rows.forEach((item) => {
          item.report_name = 'lead_report';
        });
        return res.json(reportListData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to download lead report
  app.get(
    '/api/lead-reports/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const leadReportResp = await leadSchema.findById(req.params.id);
        if (!leadReportResp)
          throw {
            success: false,
            message: 'No record found for lead report.',
          };
        //Fetch data from S3 by url
        let url = leadReportResp.report_s3_url;
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

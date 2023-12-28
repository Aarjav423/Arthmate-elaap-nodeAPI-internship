const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper');
const serviceUsageSchema = require('../models/service-usage-schema');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch service usage reports.
  app.get(
    '/api/service-usage-report/:month/:year/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { month, year, page, limit } = req.params;
        const reportList = await serviceUsageSchema.findByFilter({
          month,
          year,
          page,
          limit,
        });
        if (!reportList.rows.length)
          throw {
            success: false,
            message: 'No records found for service usage report.',
          };
        const reportListData = JSON.parse(JSON.stringify(reportList));
        reportListData.rows.forEach((item) => {
          item.report_name = 'service_usage_report';
        });
        return res.json(reportListData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to download service usage report
  app.get(
    '/api/download-service-usage-report/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const serviceUsageReportResp = await serviceUsageSchema.findById(
          req.params.id,
        );
        if (!serviceUsageReportResp)
          throw {
            success: false,
            message: 'No record found for service usage report.',
          };
        //Fetch data from S3 by url
        let url = serviceUsageReportResp.report_s3_url;
        const regex = /https:\/\/([^\.]+)\.s3/;
        const result = url.match(regex);
        const colenderBucketName = result[1];
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
          colenderBucketName,
        );
        return res.status(200).send(excelFile);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

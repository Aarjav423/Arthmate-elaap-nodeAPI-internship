const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs').promises;
const fsSync = require('fs');
var XLSX = require('xlsx');
var json2xls = require('json2xls');
const jwt = require('../util/jwt');
const s3helper = require('../util/s3helper');
const MonthlyCollectionDataExportSchema = require('../models/monthly-collection-data-export-schema');
const DailyCollectionDataExportSchema = require('../models/daily-collection-data-export-schema');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch generated monthly collection reports.
  app.get(
    '/api/monthly-collection-report/:month/:year/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { month, year, page, limit } = req.params;
        const reportList = await MonthlyCollectionDataExportSchema.findByFilter(
          { month, year, page, limit },
        );
        if (!reportList.rows.length)
          throw {
            success: false,
            message: 'No records found for collection monthly report.',
          };
        const reportListData = JSON.parse(JSON.stringify(reportList));
        reportListData.rows.forEach((item) => {
          item.report_name = 'monthly_collection_report';
        });

        return res.json(reportListData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated monthly collection report
  app.get(
    '/api/download-monthly-collection-report/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const monthlyCollectionDataReportResp =
          await MonthlyCollectionDataExportSchema.findById(req.params.id);
        if (!monthlyCollectionDataReportResp)
          throw {
            success: false,
            message: 'No record found for monthly collection report.',
          };
        //Fetch data from S3 by url
        let url = monthlyCollectionDataReportResp.report_s3_url;
        const reportFromS3Resp = await s3helper.fetchDataFromS3ByURL(url);
        if (reportFromS3Resp.success === 'false') throw reportFromS3Resp;
        res.attachment(url);
        let filename = `monthlyCollectionDataExportReportResp$${Date.now()}.xlsx`;
        const downloadedFileResp = await fs.writeFile(
          filename,
          reportFromS3Resp,
        );
        var workbook = XLSX.readFile(`./${filename}`, {
          dateNF: 'yyyy-mm-dd',
        });
        var ws = workbook.Sheets[workbook?.Props?.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const UnlinkXls = await fs.unlink(
          path.join(__dirname, `../${filename}`),
        );
        return res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  ////API to fetch generated daily collection reports.
  app.get(
    '/api/daily-collection-report/:day/:month/:year/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { month, year, day, page, limit } = req.params;
        const dailyReport = await DailyCollectionDataExportSchema.findByFilter({
          month,
          year,
          day,
          page,
          limit,
        });
        if (!dailyReport.rows.length)
          throw {
            success: false,
            message: 'No records found for daily collection report',
          };
        const dailyReportData = JSON.parse(JSON.stringify(dailyReport));
        dailyReportData.rows.forEach((item) => {
          item.report_name = 'daily_collection_report';
        });

        return res.json(dailyReportData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Api to download generated daily collection report
  app.get(
    '/api/download-daily-collection-report/:id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const dailyCollectionDataReportResp =
          await DailyCollectionDataExportSchema.findById(req.params.id);
        if (!dailyCollectionDataReportResp)
          throw {
            success: false,
            message: 'No record found for daily collection report.',
          };
        //Fetch data from S3 by url
        let url = dailyCollectionDataReportResp.report_s3_url;
        const reportFromS3Resp = await s3helper.fetchDataFromS3ByURL(url);
        if (reportFromS3Resp.success === 'false') throw reportFromS3Resp;
        res.attachment(url);
        let filename = `dailyCollectionDataExportReportResp$${Date.now()}.xlsx`;
        const downloadedFileResp = await fs.writeFile(
          filename,
          reportFromS3Resp,
        );
        var workbook = XLSX.readFile(`./${filename}`, {
          dateNF: 'yyyy-mm-dd',
        });
        var ws = workbook.Sheets[workbook?.Props?.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const UnlinkXls = await fs.unlink(
          path.join(__dirname, `../${filename}`),
        );
        return res.status(200).send(data);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

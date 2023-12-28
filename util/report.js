'use strict';
const ReportStorageSchema = require('../models/report-storage-schema');
const s3helper = require('../util/s3helper');
var json2xls = require('json2xls');
var fs = require('fs');
const AWS = require('aws-sdk');
const s3bucket = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const convertJsonToExcel = async (fileName, xls) => {
  const filePath = await fs.writeFileSync(fileName, xls, 'binary');
  return fileName;
};

// Function to store generated report
const recordGenereatedReport = async (dataParams) => {
  const recordReportResp = await ReportStorageSchema.addNew(dataParams);
  return recordReportResp;
};

const uploadXlsxToS3 = async (fileName, key) => {
  const fileContent = await fs.readFileSync(
    path.join(__dirname, `../${fileName}`),
  );
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: key,
    Body: fileContent,
  };
  const storeXlsData = await s3bucket.upload(params).promise();
  return storeXlsData;
};

module.exports = {
  convertJsonToExcel,
  recordGenereatedReport,
  uploadXlsxToS3,
};

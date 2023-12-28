var uuid = require('uuid');
//var winston = require('winston');
var requires = {};
const moment = require('moment');
const s3helper = require('../util/s3helper.js');
var options = {
  console: {
    level: 'info',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

var getRequire = function (mappedSchema) {
  if (!requires[mappedSchema]) {
    requires[mappedSchema] = require(mappedSchema);
  }
  return requires[mappedSchema];
};

var logger = function (label) {
  return function (req, res, next) {
    var now = new Date().getTime();
    if (req.dev) {
      if (req.dev.startedTime) {
        req.dev.endedTime = req.dev.endedTime
          ? req.dev.endedTime
          : now - req.dev.startedTime;
        loggerWinston.info({
          request: label,
          method: req.method,
          url: req.url,
          timeTook: req.dev.endedTime,
          result: req.dev.result,
          devid: req.dev.id,
        });
      }
    } else {
      req.dev = {
        startedTime: now,
        result: '?',
        id: uuid.v4(),
      };
      loggerWinston.info({
        request: label,
        method: req.method,
        url: req.url,
        timeTook: now,
        devid: req.dev.id,
      });
    }
    next();
  };
};

var setData = function (req, value, key) {
  if (!req.dev) {
    req.dev = {};
  }
  if (!key) {
    key = 'result';
  }
  req.dev[key] = value;
};

var json = function (req, res, next, statusCode, params) {
  // if (statusCode != 200) {
  //     loggerWinston.error({ method: req.method, url: req.url, body: `${JSON.stringify(req.body)}`, status: statusCode, params: JSON.stringify(params) });
  // }
  if (!Array.isArray(params)) {
    if (req.dev) {
      var now = new Date().getTime();
      var took = now - req.dev.startedTime;
      params.meta = {
        reqId: req.dev.id,
        took: took,
      };
    }
  }
  res.status(statusCode).json(params);
  next();
  return;
};

var cleanBody = function (body) {
  var bodies = Array.isArray(body) ? body : [body];
  for (var i in bodies) {
    var row = bodies[i];
    for (var col in row) {
      if (typeof row[col] == 'string') {
        row[col] = row[col].replace(/(\r\n|\n|\r)/gm, ' ');
      }
    }
  }
  return Array.isArray(body) ? bodies : bodies[0];
};

var logRoute = function (req, res, next) {
  loggerWinston.info({
    method: req.method,
    url: req.url,
    body: req.body,
    log: 'logRoute',
  });
  next();
};

const dequeueS3Files = (req, data) => {
  const req_type = !data.request_type ? 'Null' : data.request_type;
  var resultFilename =
    data.api_response_status.toLowerCase() == 'success' ? 'success' : 'fail';
  const billingLogpath = `pan-service-api-billinglog/${moment().format(
    'YYYY-MM-DD',
  )}/${
    'PHO0001' || req.company.code
  }/${req_type}/${resultFilename}/${uuid.v4()}.json`;
  const resUploadFileToS3 = s3helper.uploadFileToS3(data, billingLogpath);
  if (!resUploadFileToS3)
    loggerWinston.error({
      message: `Error while uploading Biling data to s3 - ${responseStoragePath}`,
      success: false,
    });
  // loggerWinston.info({ "message": `Biling file uploaded successfully :- ${uploadResponse.Location}` })
};

module.exports = {
  logger: logger,
  setData: setData,
  json: json,
  require: getRequire,
  cleanBody: cleanBody,
  logRoute: logRoute,
  dequeueS3Files: dequeueS3Files,
};

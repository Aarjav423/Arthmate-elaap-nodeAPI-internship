const bodyParser = require('body-parser');
const axios = require('axios');
const DigitapVerifications = require('./../models/digitap-verification-schema');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const helper = require('../util/s3helper.js');

const TAG = 'digitap-verification-api';

var fileData = {};

const bucket = 'digitap-sms-staging-dev';
/**
 * /get-user-score response is given below:
{
    "code": 200,
    "model": {
        "GENERAL VARIABLES": {
            "CID": "1234",
            "CODE": "200",
            "DEVICE ID": "39390b608d9267d2",
            "DQS": "50",
            "SCORE": "537"
        },
     “url”:”https://digitap.ai/user-sync-report”
},
    "msg": "Success"
}
*/
async function getUserScoreReport(userId, syncId) {
  // 2. get user score info using sync id
  // 3. save the info into database
  // 4. get user report json using url from info
  // 5. save the json into database

  try {
    // get user score info using sync id
    const base64Auth = `${Buffer.from(
      `${process.env.DIGITAP_CLIENT_ID}:${process.env.DIGITAP_CLIENT_SECRET}`,
    ).toString('base64')}`;
    console.log(`${TAG}.auth: `, base64Auth);

    const reportInfo = await axios.request({
      url: `${process.env.DIGITAP_BASE_URL}/get-user-score`,
      method: 'POST',
      headers: {
        ent_authorization: base64Auth,
        'Content-Type': 'application/json',
      },
      data: {
        syncId: syncId,
        sendAppInfo: true,
        sendContactInfo: true,
        sendCallLogsInfo: true,
      },
    });

    console.log(
      `${TAG}.getUserScoreReport.reportInfo: `,
      // reportInfo
      // reportInfo.status,
      // reportInfo.data
    );

    // save reportInfo into database
    await DigitapVerifications.updateScoreInfo(syncId, reportInfo.data);

    if (reportInfo) {
      // get user report json using url from info
      console.log('Inside report Info', reportInfo.data.model.url);
      const reportJson = await axios.request({
        url: reportInfo.data.model.url,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fileData.scoreInfo = reportJson.data;
    }

    if (reportInfo.data.model.contacts_info) {
      const contactJson = await axios.request({
        url: reportInfo.data.model.contacts_info,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fileData.contactInfo = contactJson.data;
    }

    if (reportInfo.data.model.app_info) {
      const appJson = await axios.request({
        url: reportInfo.data.model.app_info,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fileData.appInfo = appJson.data;
    }

    if (reportInfo.data.model.call_logs_info) {
      const callLogJson = await axios.request({
        url: reportInfo.data.model.call_logs_info,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fileData.callLogInfo = callLogJson.data;
    }
    if (fileData) {
      // save phoneJson into S3 bucket
      const resKey = `${'Digitap'}/${'UserReports'}/${userId}/${syncId}/${Date.now()}.txt`;
      const fileDataResponse = await helper.uploadFileToS3WithBucket(
        fileData,
        resKey,
        bucket,
      );
      // save phoneJson into database
      delete fileDataResponse.Key; //for removing duplicate key generating in the response
      delete fileDataResponse.VersionId; //for removing versionId generating in the response
      await DigitapVerifications.updateScoreJson(syncId, fileDataResponse);
    }
  } catch (error) {
    console.log(
      `${TAG}.getUserScoreReport.error: `,
      error,
      //   ? error.response
      //     ? error.response.status
      //       ? error.response.status
      //       : error.response
      //     : error
      //   : "something went wrong",
      // error
      //   ? error.response
      //     ? error.response.data
      //       ? error.response.data
      //       : error.response
      //     : error
      //   : "something went wrong"
    );
  }
}

module.exports = (app) => {
  app.use(bodyParser.json());

  // webhook for digitap verification result and then using the sync id from the
  // request to get user score details

  /**
   * webhook request body is given below:
   {
    “syncId”:”ec6397d0 - cb4b - 457d - a397 - d0cb4bc57d3c”,
    “status”:”SYNC_COMPLETED”,
    “userId”:”1234”,
    “hashValue”: null
  }
   */
  app.post(
    '/api/digitap-hook',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_DIGITAP_HOOK_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      console.log(`${TAG}.post.hook: `, req.body);
      // 1. save received sync-data into database
      // 2. get user score info using sync id
      // 3. save the info into database
      // 4. get user report json using url from info
      // 5. save the json into database

      try {
        const { userId, syncId } = req.body;

        if (userId && syncId && req.body) {
          try {
            // todo: find out if data could be existing before hand
            // save received sync-data into database

            const result = await DigitapVerifications.addData({
              syncData: req.body,
              userId: userId,
              syncId: syncId,
            });
            console.log(`${TAG}.insert: `, result);

            // the following function needs not to be awaited until the api returns result
            getUserScoreReport(userId, syncId);

            return res.status(200).send({
              data: syncId,
              message: 'Webhook info received successfully!',
            });
          } catch (error) {
            console.log(`${TAG}.digitapWebhook: error = `, error);

            return res.status(200).send({
              data: syncId,
              message: 'Webhook info received successfully!',
            });
          }
        } else {
          console.log(`${TAG}.digitapWebhook: `, 'invalid data in body');
          return res.status(400).send({
            data: null,
            message: 'No data found in the request!',
          });
        }
      } catch (error) {
        console.log(`${TAG}.digitapWebhook: `, error);
        return res.status(500).send({
          data: null,
          message: 'Something went wrong!',
        });
      }
    },
  );

  app.post(
    '/api/digitap-location',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_DIGITAP_HOOK_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      console.log(`${TAG}.post.location: `, req.body);
      // 1. save received sync-data into database
      // 2. get user score info using sync id
      // 3. save the info into database

      try {
        const { userId, syncId } = req.body;

        if (userId && syncId && req.body) {
          try {
            // todo: find out if data could be existing before hand
            // save received sync-data into database

            const result = await DigitapVerifications.updateLocationData(
              userId,
              {
                locationData: req.body,
                userId: userId,
                syncId: syncId,
              },
            );
            console.log(`${TAG}.insert: `, result);

            return res.status(200).send({
              data: syncId,
              message: 'Location info received successfully!',
            });
          } catch (error) {
            console.log(`${TAG}.digitapLocation: error = `, error);

            return res.status(200).send({
              data: syncId,
              message: 'Location info received successfully!',
            });
          }
        } else {
          console.log(`${TAG}.digitapLocation: `, 'invalid data in body');
          return res.status(400).send({
            data: null,
            message: 'No data found in the request!',
          });
        }
      } catch (error) {
        console.log(`${TAG}.digitapLocation: `, error);
        return res.status(500).send({
          data: null,
          message: 'Something went wrong!',
        });
      }
    },
  );

  app.get(
    '/api/digitap-reports',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_DIGITAP_REPORTS_ID),
      AccessLog.maintainAccessLog,
      //middlewares.injectLoanRequestFromArrayToParseAndEval,
    ],
    async (req, res) => {
      console.log(`${TAG}.get.reports: `);
      try {
        let offset = 0;
        let limit = 100;

        if (req.query) {
          if (req.query.offset) offset = parseInt(req.query.offset);

          if (req.query.limit) limit = parseInt(req.query.limit);
        }

        return res.status(200).send({
          message: 'All reports fetched successfully',
          data: await DigitapVerifications.getAll(offset, limit),
        });
      } catch (error) {
        console.log(`${TAG}.getAllDigitapReports: `, error);

        return res.status(500).send({
          data: null,
          message: 'Something went wrong!',
        });
      }
    },
  );
};

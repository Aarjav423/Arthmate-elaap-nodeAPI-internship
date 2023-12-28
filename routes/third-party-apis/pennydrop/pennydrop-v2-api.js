const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const services = require('../../../util/service.js');
const AccessLog = require('../../../util/accessLog.js');
const {
  verifyloanAppIdValidation,
} = require('../../../util/loan-app-id-validation.js');
const {
  validateTemplateData,
} = require('../../../routes/third-party-apis/service/template-validation.js');
const {
  serviceLogging,
  handleError,
} = require('../service/service-logging.js');
const axios = require('axios');
const ApiCounterSchema = require('../../../models/api-counter-schema.js');
const moment = require('moment');
const { uploadPennyDropResponseAsLoanDoc } = require('../utils/helper')

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/bank-account-verify',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabledCached(process.env.SERVICE_PENNY_DROP_V2_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      const _apiReqTime = Date.now();
      const apiName = 'BANK-ACC-NUM-KYC';
      const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
      const serviceDetails = {
        vendor_name: 'ICICI',
        api_name: apiName,
        service_id: process.env.SERVICE_PENNY_DROP_V2_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
      };
      req.logData = {
        ...serviceDetails,
      };
      
      try {
        // Fetch the API count and check the limit here
        let limits = await ApiCounterSchema.fetchApiCount(
          req.body.account_number + '-' + req.body.ifsc
        );
        
        if (!limits) {

          limits = {
            request_id: requestId,
            api_name: apiName,
            key: req.body.account_number + '-' + req.body.ifsc,
            daily_hits: 0,
            weekly_hits: 0,
            monthly_hits: 0,
            total_hits: 0,
            count: 1,
            last_reset: Date.now(),
          }

          // Create a new counter if it doesn't exist
           await ApiCounterSchema.createCounter(limits);

        } else {
          // Update the counter
          const currentDay = moment().startOf('day');
          if (!moment(limits.last_reset).isSame(currentDay, 'day')) {
            limits.daily_hits = 0;
          }
          const currentWeek = moment().startOf('isoWeek');
          if (!moment(limits.last_reset).isSame(currentWeek, 'isoWeek')) {
            limits.weekly_hits = 0;
          }
          const currentMonth = moment().startOf('month');
          if (!moment(limits.last_reset).isSame(currentMonth, 'month')) {
            limits.monthly_hits = 0;
          }
          const dailyLimitExceeded =
            limits.daily_hits >= process.env.DAILY_API_HITS;
          const weeklyLimitExceeded =
            limits.weekly_hits >= process.env.WEEKLY_API_HITS;
          const monthlyLimitExceeded =
            limits.monthly_hits >= process.env.MONTHLY_API_HITS;
          if (
            dailyLimitExceeded ||
            weeklyLimitExceeded ||
            monthlyLimitExceeded
          ) {
            return res.status(200).send({
              result: {},
              request_id: requestId,
              'status-code': '104',
            });
          }
        }
        
        // validate the incoming template data with customized template data
        await validateTemplateData(req);

        //ICICI url
        const impsUrl = process.env.IMPS_TRANSACTION_API_URL;
        //Headers
        const config = {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${process.env.IMPS_TRANSACTION_AUTHORIZATION}`,
          },
        };

        const partner_name = req.company?.code;
        //PENNY DROP API
        const pennyDropData = {
          beneficiary_ifsc: req.body.ifsc,
          beneficiary_account_no: req.body.account_number,
          partner_name: partner_name,
          debit_account_name: process.env.PENNY_DROP_V2_SENDER_NAME,
          debit_account_mobile_no: process.env.PENNY_DROP_V2_SENDER_MOBILE_NO,
          txn_id: process.env.PENNY_DROP_V2_TRANSACTION_ID,
          amount: Number(process.env.PENNY_DROP_V2_AMOUNT),
          debit_account_no: process.env.PENNY_DROP_V2_DEBIT_ACCOUNT_NUMBER,
          debit_ifsc: process.env.PENNY_DROP_V2_DEBIT_IFSC,
          debit_trn_remarks: process.env.PENNY_DROP_V2_DEBIT_TRN_REMARKS,
          beneficiary_name: process.env.PENNY_DROP_V2_BENEFICIARY_NAME,
          mode_of_pay: process.env.PENNY_DROP_V2_MODE_OF_PAY,
          webhook_link: process.env.PENNY_DROP_V2_WEBHOOK_LINK,
          access_token: process.env.PENNY_DROP_V2_ACCESS_TOKEN,
          loan_id: requestId,
          consent: req.body?.consent,
          consent_timestamp: req.body.consent_timestamp,
        };

        // Upload request to AWS S3
        await serviceLogging(pennyDropData, req, 'request');

        const impsResponse = (
          await Promise.all([
            axios.post(impsUrl, JSON.stringify(pennyDropData), config),
          ])
        )[0]?.data;
        if (
          impsResponse?.disbursement_status_code === '101' ||
          impsResponse?.disbursement_status_code === '102' ||
          impsResponse?.disbursement_status_code === '103'
        ) {
          await ApiCounterSchema.updateCounter(
            req.body.account_number + '-' + req.body.ifsc,
            limits.daily_hits + 1,
            limits.weekly_hits + 1,
            limits.monthly_hits + 1,
            limits.total_hits + 1,
          );
        }
        let bene_name = (impsResponse?.beneficiary_name || '')
          .trim()
          .replace(/\s+/g, ' ');
        const iciciPennyRes = {
          result: {
            accountNumber: req.body?.account_number,
            ifsc: req.body?.ifsc,
            accountName: bene_name,
            bankResponse: impsResponse?.bank_remarks,
            bankTxnStatus: impsResponse?.disbursement_status === 'true',
          },
          request_id: requestId,
          'status-code': impsResponse?.disbursement_status_code,
        };
        let _apiResTime = Date.now() - _apiReqTime;
        req.logData.api_response_time = _apiResTime;
        req.logData.api_status_code = 200;
        if (impsResponse?.disbursement_status_code === '101') {
          const penny_drop_res = {
            kyc_id: requestId,
            data: iciciPennyRes,
            success: true,
          }
          req.logData.loan_doc_uploaded = await uploadPennyDropResponseAsLoanDoc(
            penny_drop_res,req.body.loan_app_id, req.authData
          );
          //Upload response to AWS S3
          await serviceLogging(iciciPennyRes, req, 'response');
          return res.status(200).send(penny_drop_res);
        } else {
          //Upload response to AWS S3
          await serviceLogging(iciciPennyRes, req, 'response');
          return res.status(200).send({
            kyc_id: requestId,
            data: iciciPennyRes,
            success: false,
          });
        }
      } catch (error) {
        console.log('penny drop version 2 error: ' + error);
        let _apiResTime = Date.now() - _apiReqTime;
        req.logData.api_response_time = _apiResTime;
        error.request_id = requestId;
        await handleError(error, req, res);
      }
    },
  );
};

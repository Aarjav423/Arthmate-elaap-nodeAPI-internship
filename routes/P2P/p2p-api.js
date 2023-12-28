const { default: axios } = require('axios');
const bodyParser = require('body-parser');
const jwt = require('../../util/jwt');
const services = require('../../util/service');
const AccessLog = require('../../util/accessLog');
const disbursementHelper = require('../../utils/compositeDisbursementHelper.js');
const borrowerInfo = require('../../models/borrowerinfo-common-schema.js');
const moment = require('moment');
const SubscribeEventSchema = require('../../models/subscribe_event.js');
const PartnerNotificationSchema = require('../../models/partner-notification-details.js');
const s3helper = require('../../util/s3helper');
var {
  p2p_data_validator,
} = require('../../validator/P2P/p2p_utr_payload_validator');

module.exports = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.post(
    '/api/co-lender-utr',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_CO_LENDER_UTR_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        let inputs = req.body;
        const errors = await p2p_data_validator(inputs);
        if (Object.keys(errors).length > 0 && errors.constructor === Object) {
          throw {
            statusCode: 400,
            data: {
              success: false,
              message: 'Invalid Payload',
              errors: errors,
            },
          };
        }
        const data = req.body;
        const requestBody = {
          partner_utr: data.partner_utr,
          loan_id: data.loan_id,
          origin_utr: '',
          loan_amount: data.loan_amount,
          timestamp: data.timestamp,
        };
        let response = {};
        const borrowerInfoDetails = await borrowerInfo.findOneWithKLID(
          data.loan_id,
        );
        if (borrowerInfoDetails.stage === 4) {
          response = {
            statusCode: 200,
            data: {
              success: true,
              message: 'utr number is already updated',
            },
          };
          return res.status(200).send(response);
        }
        await axios
          .request({
            url: `${process.env.CO_LENDER_ORIGIN_P2P_ENDPOINT}`,
            method: 'PATCH',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: process.env.CO_LENDER_ORIGIN_BASIC_AUTH,
            },
            data: requestBody,
          })
          .then(async (resp) => {
            const loan_id = resp.data.loan_id;
            const webhookReq = {
              payment_mode: 'I',
            };
            const productResp = {
              is_lender_selector_flag: 'Y',
            };
            const txnData = {
              company_id: borrowerInfoDetails?.company_id,
              product_id: borrowerInfoDetails?.product_id,
              company_name: borrowerInfoDetails?.company_name,
              produc_name: borrowerInfoDetails?.product_name,
              loan_id: loan_id,
              borrower_id: borrowerInfoDetails?.borrower_id,
              partner_loan_id: borrowerInfoDetails?.partner_loan_id,
              partner_borrower_id: borrowerInfoDetails?.partner_borrower_id,
              webhook_status: 'COMPLETED',
              utrn_number: data.partner_utr,
              txn_date: moment(data.timestamp).format('YYYY-MM-DD'),
              amount: data.loan_amount,
              txn_id: loan_id,
              txn_entry: 'dr',
              label: 'disbursement',
              disbursement_channel: 'p2p',
              webhook_status_code: '3',
              txn_stage: '1',
              bank_remark: 'COMPLETED',
              disbursement_date_time: data.timestamp,
            };
            await disbursementHelper.recordLoanTransaction(
              webhookReq,
              txnData,
              productResp,
            );
            await borrowerInfo.updateLoanStatus(
              {
                stage: 4,
                status: 'disbursed',
                disbursement_date_time: data.timestamp,
              },
              loan_id,
            );
            response = {
              statusCode: resp.status,
              data: {
                success: resp.data.success,
                message: resp.data.message,
              },
            };

            res.status(response.statusCode).send(response);

            if (response.statusCode === 200) {
              const disbrsementData = {
                event_key: 'disbursement',
                data: {
                  status_code: 'COMPLETED',
                  loan_id: loan_id,
                  partner_loan_id: borrowerInfoDetails.partner_loan_id,
                  net_disbur_amt: data.loan_amount,
                  utr_number: data.partner_utr,
                  utr_date_time: data.timestamp,
                  txn_id: loan_id,
                },
              };

              //upload request data to s3 and store it in webhook_notify_calls table
              const fname =
                Math.floor(10000 + Math.random() * 99999) + '_callback_req';
              const requestKey = `CALLBACK-REQUEST-BODY/${
                borrowerInfoDetails.company_id
              }/${borrowerInfoDetails.product_id}/${fname}/${Date.now()}.txt`;
              const uploadWebhookRequestToS3 = await s3helper.uploadFileToS3(
                disbrsementData,
                requestKey,
              );

              // partner notification details db logging
              return await PartnerNotificationSchema.recordAScoreRequestData({
                loan_id: loan_id,
                company_id: borrowerInfoDetails?.company_id,
                product_id: borrowerInfoDetails?.product_id,
                request_s3_url: uploadWebhookRequestToS3?.Location,
                stage: 0,
                remarks: 'partner notification details created',
                key: 'disbursement',
              });
            }
          });
      } catch (err) {
        return res.status(400).send(err);
      }
    },
  );
};

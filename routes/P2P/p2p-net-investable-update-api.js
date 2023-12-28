const { check, validationResult } = require('express-validator');
const services = require('../../util/service');
const AccessLog = require('../../util/accessLog');
const jwt = require('../../util/jwt');
const s3helper = require('../../util/s3helper.js');
const ServiceReqResLog = require('../../models/service-req-res-log-schema');
const ColenderProfile = require('../../models/co-lender-profile-schema.js');

let localLogData = {
  request_id: '',
  company_id: '',
  company_code: '',
  sub_company_code: '',
  vendor_name: 'CO-LENDING-ORIGIN',
  service_id: process.env.SERVICE_CO_LENDER_DISBURSAL_STATUS_ID,
  api_name: '',
  raw_data: '',
  request_type: '',
  response_type: '',
  timestamp: 0,
  pan_card: null,
  document_uploaded_s3: '',
  api_response_type: 'JSON',
  api_response_status: 'JSON',
  kyc_id: '',
};

let dateInRequestId = Date.now();

module.exports = (app) => {
  app.patch(
    '/api/update-net-invest',
    [
      check('net_investable_amount')
        .notEmpty()
        .withMessage('net investable api is required'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      services.isServiceEnabled(
        process.env.SERVICE_P2P_NET_INVESTABLE_AMOUNT_UPDATE,
      ),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const data = req.body;
        const serviceLogs = await createServiceLogs(
          'P2P-NET-INVESTABLE',
          true,
          req,
        );
        let p2pCoLenderId = parseInt(process.env.P2P_CO_LENDER_ID);
        let updatedDatd = await ColenderProfile.updateP2PNetInvestableAmount(
          data.net_investable_amount,
          p2pCoLenderId,
        );
        if (!updatedDatd) {
          throw {
            success: false,
            message: 'Internal server error',
          };
        }

        return res.status(200).send({
          suucess: true,
          message: 'successfully updated net investable amount',
        });
      } catch (err) {
        return res.status(400).send(err);
      }
    },
  );
};

async function createServiceLogs(api, isRequest, data) {
  let today = Date.now();
  let filename =
    Math.floor(10000 + Math.random() * 99999) + (isRequest ? '_req' : '_res');
  let key = `${api}/${localLogData.vendor_name}/${data.body.company?._id}/${filename}/${today}.txt`;
  const uploadToS3 = await s3helper.uploadFileToS3(data.body, key);
  const s3Url = uploadToS3.Location;
  localLogData.request_type = isRequest ? 'request' : 'response';
  localLogData.api_name = api;
  localLogData.company_code = data.body.company?._code;
  localLogData.company_id = data.body.company?._id;
  if (s3Url) {
    localLogData.api_response_status = 'SUCCESS';
    localLogData.api_response_type = 'success';
    localLogData.document_uploaded_s3 = 1;
    (localLogData.raw_data = s3Url), (localLogData.response_type = 'success');
  } else {
    localLogData.document_uploaded_s3 = 0;
    localLogData.response_type = 'error';
  }
  localLogData.timestamp = today;
  localLogData.request_id = `${localLogData.company_code}-P2P-INVESTABLE-${dateInRequestId}`;
  const newServiceLog = await ServiceReqResLog.addNew(localLogData);
  if (!newServiceLog) {
    throw {
      success: false,
      message: 'Error occurs',
    };
  }
  return newServiceLog;
}

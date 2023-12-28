const bodyParser = require('body-parser');
const jwt = require('../../util/jwt');
const ComplianceSchema = require('../../models/compliance-schema');
const CkycResponse = require('../../models/ckyc-response-schema');
const xml2js = require('xml2js');
let parser = new xml2js.Parser();
let {
  trackwizz_kyc_data_validator,
  trackwizz_kyc_inner_data_validator,
} = require('../../validator/kyc/trackwizz_payload_validator');
/**
 * WEBHOOK FOR TRACKWIZZ
 * @author Tarun Kr Singh
 * @param {*} app
 * @param {*} connection
 * @return {*} 200, In case Request is able to process with any blockage
 * @throws {*} 400, in case of failure
 */

function groupChildren(obj) {
  for (prop in obj) {
    if (typeof obj[prop] === 'object') {
      groupChildren(obj[prop]);
    } else {
      obj['$'] = obj['$'] || {};
      obj['$'][prop] = obj[prop];
      delete obj[prop];
    }
  }

  return obj;
}
module.exports = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.raw({ type: 'application/xml' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  //TPARTY-206 task url
  app.post('/api/kyc/operations', [jwt.verifyToken], async (req, res) => {
    try {
      let xml_data = Buffer.from(req.body).toString();
      //convert xml to json
      let json_data;
      try {
        parser.parseString(xml_data, function (err, result) {
          json_data = result;
        });
      } catch (err) {
        throw {
          success: 'failure',
          Message: 'Invalid Document Format',
        };
      }
      // validate the json_data
      if (!json_data.hasOwnProperty('CustomerNewCKYCStatusRequest')) {
        throw {
          success: 'failure',
          Message: 'Invalid Payload CustomerNewCKYCStatusRequest',
        };
      }
      if (
        !json_data.CustomerNewCKYCStatusRequest.hasOwnProperty(
          'CustomerNewCKYCStatusRequestDetails',
        )
      ) {
        throw {
          success: 'failure',
          Message: 'Invalid Payload CustomerNewCKYCStatusRequestDetails',
        };
      }
      if (
        !json_data.CustomerNewCKYCStatusRequest.CustomerNewCKYCStatusRequestDetails[0].hasOwnProperty(
          'CustomerNewCKYCStatusRequestDetail',
        )
      ) {
        throw {
          success: 'failure',
          Message: 'Invalid Payload CustomerNewCKYCStatusRequestDetail',
        };
      }
      const key_errors = await trackwizz_kyc_data_validator(
        json_data.CustomerNewCKYCStatusRequest,
      );
      if (
        Object.keys(key_errors).length > 0 &&
        key_errors.constructor === Object
      ) {
        throw {
          code: 422,
          success: false,
          message: 'Invalid Payload.',
          errors: key_errors,
        };
      }
      let data =
        json_data.CustomerNewCKYCStatusRequest
          .CustomerNewCKYCStatusRequestDetails[0]
          .CustomerNewCKYCStatusRequestDetail;
      let data_arr = [];
      //check if data is array or not
      if (Array.isArray(data)) {
        data_arr = data;
      } else {
        data_arr.push(data);
      }
      let resp_body = {
        CustomerNewCKYCStatusResponse: {
          RequestId: json_data.CustomerNewCKYCStatusRequest.RequestId[0],
          RequestStatus: 'Accepted',
          CustomerNewCKYCStatusResponseDetails: {
            CustomerNewCKYCStatusResponseDetail: [],
          },
        },
      };
      let raw_payload_data_arr = [];
      for (let inr_obj in json_data.CustomerNewCKYCStatusRequest
        .CustomerNewCKYCStatusRequestDetails[0]
        .CustomerNewCKYCStatusRequestDetail) {
        let inr_data =
          json_data.CustomerNewCKYCStatusRequest
            .CustomerNewCKYCStatusRequestDetails[0]
            .CustomerNewCKYCStatusRequestDetail[inr_obj];
        let temp_obj_data = {};
        if (inr_data.hasOwnProperty('TransactionId')) {
          temp_obj_data['TransactionId'] = inr_data.TransactionId[0];
        }
        if (inr_data.hasOwnProperty('SourceSystemName')) {
          temp_obj_data['SourceSystemName'] = inr_data.SourceSystemName[0];
        }
        if (inr_data.hasOwnProperty('SourceSystemCustomerCode')) {
          temp_obj_data['SourceSystemCustomerCode'] =
            inr_data.SourceSystemCustomerCode[0];
        }
        if (inr_data.hasOwnProperty('StepCode')) {
          temp_obj_data['StepCode'] = inr_data.StepCode[0];
        }
        if (inr_data.hasOwnProperty('StepName')) {
          temp_obj_data['StepName'] = inr_data.StepName[0];
        }
        if (inr_data.hasOwnProperty('StepCategory')) {
          temp_obj_data['StepCategory'] = inr_data.StepCategory[0];
        }
        if (inr_data.hasOwnProperty('CKYCId')) {
          temp_obj_data['CKYCId'] = inr_data.CKYCId[0];
        }
        if (inr_data.hasOwnProperty('CKYCAccountType')) {
          temp_obj_data['CKYCAccountType'] = inr_data.CKYCAccountType[0];
        }
        if (inr_data.hasOwnProperty('CaseUrl')) {
          temp_obj_data['CaseUrl'] = inr_data.CaseUrl[0];
        }
        if (inr_data.hasOwnProperty('CaseId')) {
          temp_obj_data['CaseId'] = inr_data.CaseId[0];
        }
        if (inr_data.hasOwnProperty('CKYCIDGenDate')) {
          temp_obj_data['CKYCIDGenDate'] = inr_data.CKYCIDGenDate[0];
        }
        if (inr_data.hasOwnProperty('CoreWorkflowProgressId')) {
          temp_obj_data['CoreWorkflowProgressId'] =
            inr_data.CoreWorkflowProgressId[0];
        }
        raw_payload_data_arr.push(temp_obj_data);
      }
      let raw_payload = {
        request_id: json_data.CustomerNewCKYCStatusRequest.RequestId[0],
        api_token: json_data.CustomerNewCKYCStatusRequest.ApiToken[0],
        user_name: json_data.CustomerNewCKYCStatusRequest.hasOwnProperty(
          'UserName',
        )
          ? json_data.CustomerNewCKYCStatusRequest.UserName[0]
          : '',
        password: json_data.CustomerNewCKYCStatusRequest.hasOwnProperty(
          'Password',
        )
          ? json_data.CustomerNewCKYCStatusRequest.Password[0]
          : '',
        customer_new_ckyc_status_request_details: raw_payload_data_arr,
      };
      await CkycResponse.addNew(raw_payload);

      for (let obj in data_arr) {
        let obj_data = data_arr[obj];
        let db_req_body = {};
        let condition = {
          cust_id: obj_data.SourceSystemCustomerCode[0],
          mode: '',
          ckyc_number: '',
        };

        let transaction_payload = {
          TransactionId: obj_data.TransactionId[0],
          TransactionStatus: '',
        };

        //checking this instance payload
        const inner_key_errors =
          await trackwizz_kyc_inner_data_validator(obj_data);
        if (
          Object.keys(inner_key_errors).length > 0 &&
          inner_key_errors.constructor === Object
        ) {
          transaction_payload.TransactionStatus = 'error';
          resp_body.CustomerNewCKYCStatusResponse.CustomerNewCKYCStatusResponseDetails.CustomerNewCKYCStatusResponseDetail.push(
            transaction_payload,
          );
          continue;
        }
        //check cust_id
        let customerExist = await ComplianceSchema.findByLoanCustId(
          obj_data.SourceSystemCustomerCode[0],
        );
        if (customerExist == 0) {
          transaction_payload.TransactionStatus = 'Rejected';
          resp_body.CustomerNewCKYCStatusResponse.CustomerNewCKYCStatusResponseDetails.CustomerNewCKYCStatusResponseDetail.push(
            transaction_payload,
          );
          continue;
        }
        //case for upload
        if (obj_data.StepCode[0] == 'S4' && obj_data.hasOwnProperty('CKYCId')) {
          //upload case
          //mark ckyc_search as "Y" and update ckyc_number
          db_req_body = {
            ckyc_number: obj_data.CKYCId[0],
            ckyc_search: 'Y',
            ckyc_uploaded_at: new Date()
              .toISOString()
              .slice(0, 19)
              .replace('T', ' '),
            flag: 'ok',
            created_by: 'Job',
          };
          transaction_payload.TransactionStatus = 'Accepted';
          condition.ckyc_number = obj_data.CKYCId[0];
          condition.mode = 'upload';
        }
        //case for update
        else if (obj_data.StepCode[0] == 'S20') {
          //update case
          db_req_body = {
            ckyc_match: 'Y',
            ckyc_updated_at: new Date()
              .toISOString()
              .slice(0, 19)
              .replace('T', ' '),
            flag: 'ok',
            updated_by: 'Job',
          };
          condition.mode = 'update';
          transaction_payload.TransactionStatus = 'Accepted';
        } else {
          //will update flag as error
          db_req_body = {
            flag: 'error',
            ckyc_updated_at: new Date()
              .toISOString()
              .slice(0, 19)
              .replace('T', ' '),
          };
          transaction_payload.TransactionStatus = 'Rejected';
        }
        //now update DB
        //if multiple customer
        if (customerExist > 1) {
          let updated_db_resp = await ComplianceSchema.updateManyRows(
            db_req_body,
            condition,
          );
        } else if (customerExist == 1) {
          let singlr_cust_update_resp = await ComplianceSchema.updateData(
            db_req_body,
            { cust_id: obj_data.SourceSystemCustomerCode[0] },
          );
        }
        resp_body.CustomerNewCKYCStatusResponse.CustomerNewCKYCStatusResponseDetails.CustomerNewCKYCStatusResponseDetail.push(
          transaction_payload,
        );
      }
      let builder = new xml2js.Builder();
      let xml = builder.buildObject(groupChildren(resp_body));
      res.type('application/xml');
      return res.status(200).send(xml);
    } catch (error) {
      res
        .status(
          error.code && error.code != null && error.code != undefined
            ? error.code
            : 400,
        )
        .json(error);
      return;
    }
  });
};

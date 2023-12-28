const bodyParser = require('body-parser');
const axios = require('axios');
const helper = require('../util/helper.js');
const s3helper = require('../util/s3helper.js');
const bureauReqResLogSchema = require('../models/bureau-req-res-log-schema.js');
const moment = require('moment');
const jwt = require('../util/jwt');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const request = require('request');
module.exports = (app, connection) => {
  app.post(
    '/api/bureau-cibil-v3',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_CIBIL_V3_ID),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const url = req.service.file_s3_path;
        const resJson = await s3helper.fetchJsonFromS3(
          url.substring(url.indexOf('services')),
        );
        if (!resJson)
          throw {
            message: 'Error while finding temlate from s3',
          };
        //validate the incoming template data with customized template data
        const result = await helper.validateDataWithTemplate(resJson, [data]);
        if (!result)
          throw {
            message: 'No records found',
          };
        if (result.unknownColumns.length)
          throw {
            message: result.unknownColumns[0],
          };
        if (result.missingColumns.length)
          throw {
            message: result.missingColumns[0],
          };
        if (result.errorRows.length)
          throw {
            message: Object.values(result.exactErrorColumns[0])[0],
          };
        if (result.validatedRows) {
          const url = process.env.CIBIL_V3_URL;
          const userID = process.env.CIBIL_V3_USERID;
          const password_userID = process.env.CIBIL_V3_PASSWORD_USERID;
          const memberCode = process.env.CIBIL_V3_MEMBERCODE;
          const memberCode_password = process.env.CIBIL_V3_MEMBERCODE_PASSWORD;
          const postData = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                                    <soapenv:Header />
                                    <soapenv:Body>
                                      <tem:ExecuteXMLString>
                                        <tem:request>
                                          <![CDATA[
                                    <DCRequest xmlns="http://transunion.com/dc/extsvc">
                                    <Authentication type="OnDemand">
                                    <UserId>${userID}</UserId>
                                    <Password>${password_userID}</Password>
                                    </Authentication>
                                    <RequestInfo>
                                    <ExecutionMode>NewWithContext</ExecutionMode>
                                    <SolutionSetId>107</SolutionSetId>
                                    <ExecuteLatestVersion>true</ExecuteLatestVersion>
                                    </RequestInfo>
                                    <Fields>
                                      <Field key="Applicants">
                                     &lt;Applicants&gt;
                                    &lt;Applicant&gt;
                                    &lt;ApplicantType&gt;Main&lt;/ApplicantType&gt;
                                    &lt;ApplicantFirstName&gt;${data.BorrowerFName}&lt;/ApplicantFirstName&gt;
                                    &lt;ApplicantMiddleName&gt;${data.BorrowerMName}&lt;/ApplicantMiddleName&gt;
                                    &lt;ApplicantLastName&gt;${data.BorrowerLName}&lt;/ApplicantLastName&gt;
                                    &lt;DateOfBirth&gt;${data.BorrowerDOB}&lt;/DateOfBirth&gt;
                                    &lt;Gender&gt;${data.BorrowerGender}&lt;/Gender&gt;
                                    &lt;EmailAddress&gt;${data.BorrowerEmail}&lt;/EmailAddress&gt;
                                    &lt;Identifiers&gt;
                                        &lt;Identifier&gt;
                                            &lt;IdNumber&gt;${data.Idnumber}&lt;/IdNumber&gt;
                                            &lt;IdType&gt;${data.Idtype}&lt;/IdType&gt;
                                        &lt;/Identifier&gt;
                                    &lt;/Identifiers&gt;
                                    &lt;Telephones&gt;
                                        &lt;Telephone&gt;
                                            &lt;TelephoneExtension&gt;&lt;/TelephoneExtension&gt;
                                            &lt;TelephoneNumber&gt;${data.BorrowerPhone}&lt;/TelephoneNumber&gt;
                                            &lt;TelephoneType&gt;${data.BorrowerPhoneType}&lt;/TelephoneType&gt;
                                        &lt;/Telephone&gt;
                                    &lt;/Telephones&gt;
                                    &lt;Addresses&gt;
                                        &lt;Address&gt;
                                            &lt;AddressLine1&gt;${data.Borrower_Addr1}&lt;/AddressLine1&gt;
                                            &lt;AddressLine2&gt;${data.Borrower_Addr2}&lt;/AddressLine2&gt;
                                            &lt;AddressLine3&gt;${data.Borrower_Addr3}&lt;/AddressLine3&gt;
                                            &lt;AddressLine4&gt;${data.Borrower_Addr4}&lt;/AddressLine4&gt;
                                            &lt;AddressLine5&gt;${data.Borrower_Addr5}&lt;/AddressLine5&gt;
                                            &lt;AddressType&gt;${data.Borrower_AddrType}&lt;/AddressType&gt;
                                            &lt;City&gt;${data.Borrower_City}&lt;/City&gt;
                                            &lt;PinCode&gt;${data.Borrower_Pincode}&lt;/PinCode&gt;
                                            &lt;ResidenceType&gt;${data.Borrower_ResiType}&lt;/ResidenceType&gt;
                                            &lt;StateCode&gt;${data.Borrower_StateCode}&lt;/StateCode&gt;
                                        &lt;/Address&gt;
                                    &lt;/Addresses&gt;
                                    &lt;/Applicant&gt;
                                    &lt;/Applicants&gt;</Field>
                                    <Field key="ApplicationData">&lt;ApplicationData&gt;
                                    &lt;Purpose&gt;${data.Borrower_LoanPurpose}&lt;/Purpose&gt;
                                    &lt;Amount&gt;${data.Borrower_RequestAmount}&lt;/Amount&gt;
                                    &lt;ScoreType&gt;08&lt;/ScoreType&gt;
                                    &lt;MemberCode&gt;${memberCode}&lt;/MemberCode&gt;
                                    &lt;Password&gt;${memberCode_password}&lt;/Password&gt;
                                    &lt;NTCProductType&gt;&lt;/NTCProductType&gt;
                                    &lt;ConsumerConsentForUIDAIAuthentication&gt;${data.ConsumerConsentForUIDAIAuthentication}&lt;/ConsumerConsentForUIDAIAuthentication&gt;
                                    &lt;GSTStateCode&gt;${data.GSTStateCode}&lt;/GSTStateCode&gt;
                                    &lt;CibilBureauFlag&gt;false&lt;/CibilBureauFlag&gt;
                                    &lt;DSTuNtcFlag&gt;true&lt;/DSTuNtcFlag&gt;
                                    &lt;IDVerificationFlag&gt;false&lt;/IDVerificationFlag&gt;
                                    &lt;MFIBureauFlag&gt;true&lt;/MFIBureauFlag&gt;
                                    &lt;FormattedReport&gt;True&lt;/FormattedReport&gt;
                                    &lt;/ApplicationData&gt;</Field>
                                    </Fields>
                                    </DCRequest>]]>
                                    </tem:request>
                                    </tem:ExecuteXMLString>
                                    </soapenv:Body>
                                    </soapenv:Envelope>`;

          const config = {
            headers: {
              'Cache-Control': 'no-cache',
              'Content-Type': 'text/xml',
              soapAction: process.env.CIBIL_V3_SOAP_ACTION_URL,
            },
          };
          const retype = 'request';
          const company_id = req.company._id;
          const company_code = req.company.code;
          const dates = moment().format('YYYY-MM-DD');
          const item = postData;
          const objData = {
            company_id: company_id,
            company_code: company_code,
            api_name: 'CIBIL-V3',
            service_id: process.env.SERVICE_CIBIL_V3_ID,
            response_type: 'success',
            request_type: 'request',
            timestamp: dates,
            pan_card: data.Idnumber,
            document_uploaded_s3: '1',
            api_response_type: 'XML',
            api_response_status: 'SUCCESS',
          };
          // uplod xml data to  S3 Bucket
          const uploadResponse = await helper.uploadXmlDataToS3Bucket(
            company_id,
            retype,
            item,
            'cibilv3',
          );
          if (!uploadResponse)
            throw {
              message: 'Something went wrong while uploding data to s3',
            };
          objData.raw_data = uploadResponse.Location;
          const bureauResponse = await bureauReqResLogSchema.addNew(objData);
          if (!bureauResponse)
            throw {
              message: 'Error while adding request data to database',
            };
          const paramValue = {
            pan_card: data.Idnumber,
            service_id: process.env.SERVICE_CIBIL_V3_ID,
          };
          const resp = await bureauReqResLogSchema.findBureau(paramValue);
          if (resp[0].length != 0) {
            const URL = resp[0][0].raw_data;
            request.get(URL, (error, response, body) => {
              if (error)
                return res.status(400).json({
                  message: 'Error while fetching the url',
                });
              const api_response_status = 'SUCCESS';
              const retype = 'response';
              // uploadOnS3 bucket - AWS
              const bureaurLogSchemaResponse = helper.uploadXmlDataToS3Bucket(
                company_id,
                retype,
                JSON.parse(body),
                'cibilv3',
              );
              if (!bureaurLogSchemaResponse) {
                throw {
                  message: 'Error while adding response data to S3',
                };
              } else {
                objData.request_type = 'response';
                objData.raw_data = bureaurLogSchemaResponse.Location;
                objData.api_response_status = api_response_status;
                objData.is_cache = '1';
                const bureauDataUploadResponse =
                  bureauReqResLogSchema.addNew(objData);
                if (!bureauDataUploadResponse)
                  throw {
                    message: 'Error while adding response data to database',
                  };
                res.send({
                  STATUS: api_response_status,
                  response: JSON.parse(body),
                  cache: 'success',
                });
              }
            });
          } else {
            /*Call 3rd party API*/
            axios
              .post(url, item, config)
              .then(async (response) => {
                const matchString = response.data.match(
                  /IsSucess&amp;gt;True&amp;lt;/g,
                );
                const api_response_status = matchString ? 'SUCCESS' : 'FAIL';
                const retype = 'response';
                // uploadOnS3 bucket - AWS
                const bureaurLogSchemaResponse =
                  await helper.uploadXmlDataToS3Bucket(
                    company_id,
                    retype,
                    response.data,
                    'cibilv3',
                  );
                if (!bureaurLogSchemaResponse)
                  throw {
                    message: 'Error while adding response data to S3',
                  };
                objData.request_type = 'response';
                objData.raw_data = bureaurLogSchemaResponse.Location;
                objData.api_response_status = api_response_status;
                const bureauDataUploadResponse =
                  await bureauReqResLogSchema.addNew(objData);
                if (!bureauDataUploadResponse)
                  throw {
                    message: 'Error while adding response data to database',
                  };
                res.send({
                  STATUS: api_response_status,
                  response: response.data,
                });
              })
              .catch(async (error) => {
                const retype = 'response';
                const uploadXmlDataResponse =
                  await helper.uploadXmlDataToS3Bucket(
                    company_id,
                    retype,
                    error,
                    'cibilv3',
                  );
                if (!uploadXmlDataResponse)
                  throw {
                    message: 'Error while adding error data to s3',
                  };
                objData.request_type = 'response';
                objData.api_response_type = 'JSON';
                objData.api_response_status;
                objData.raw_data = uploadXmlDataResponse.Location;
                const bureauReqResLogSchemaResponse =
                  await bureauReqResLogSchema.addNew(objData);
                if (!bureauReqResLogSchemaResponse)
                  throw {
                    message: 'Error while adding error data to database',
                  };
                res.send({
                  message: 'Error while XML data parsing!',
                  STATUS: api_response_status,
                  ERROR: error,
                });
              });
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

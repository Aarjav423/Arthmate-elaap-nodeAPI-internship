const bodyParser = require('body-parser');
const helper = require('../util/s3helper.js');
const bureaurReqResLogSchema = require('../models/service-req-res-log-schema');
const moment = require('moment');
const jwt = require('../util/jwt');
const request = require('request');
const services = require('../util/service');
const AccessLog = require('../util/accessLog');
const validate = require('../util/validate-req-body.js');
const bureau_data = require('../models/bureau-data-schema');
const { callCachedResponseIfExist } = require('../util/cache-service');
const { verifyloanAppIdValidation } = require('../util/loan-app-id-validation');

// EXPERIAN- ONLINE AR API -- POST
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post(
    '/api/experian-online-ar',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_EXPERIAN_AR_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const requestID = `${req.company.code}-EXPERIAN-AR-${Date.now()}`;
      try {
        const data = req.body;
        const url = req.service.file_s3_path;

        //Conditional constraints code level validation

        let isValidRequest = true;
        let missingKeys = [];
        if (!req.body.income_tax_pan) {
          isValidRequest = false;
          missingKeys.push(
            'Please provide pan or (Passport,VoterId and Phone Number)',
          );
        }
        if (req.body.flag == 'Y') {
          if (
            !req.body.add_city ||
            !req.body.add_state ||
            !req.body.add_pin_code ||
            !req.body.add_flat_no_plot_no_house_no
          ) {
            isValidRequest = false;
            missingKeys.push(
              'Please provide additional city,state,pincode,flat details)',
            );
          }
        }

        //Phone Number should be of minimum 5 digits.
        const phone = /^.{5,}$/;
        const valMobile = phone.test(req.body.phone_number);
        if (!valMobile) {
          {
            isValidRequest = false;
            missingKeys.push(
              'Please provide valid Phone Number, minimun 5 digits',
            );
          }
        }

        if (!isValidRequest) {
          return res
            .status(400)
            .send({ data: missingKeys, message: 'Invalid request!' });
        }

        //fetch template from s3
        const jsonS3Response = await helper.fetchJsonFromS3(
          url.substring(url.indexOf('services')),
        );
        if (!jsonS3Response) {
          return res.status(400).send({
            message: 'Error while finding template from s3',
          });
        }
        //validate the incoming template data with customized template data
        const resValDataTemp = validate.validateDataWithTemplate(
          jsonS3Response,
          [data],
        );

        if (resValDataTemp.missingColumns.length) {
          resValDataTemp.missingColumns = resValDataTemp.missingColumns.filter(
            (x) => x.field != 'sub_company_code',
          );
        }

        if (!resValDataTemp) {
          return res.status(400).send({
            message: 'No records found',
          });
        }
        if (resValDataTemp.unknownColumns.length) {
          return res.status(400).send({
            message: resValDataTemp.unknownColumns[0],
          });
        }
        if (resValDataTemp.missingColumns.length) {
          return res.status(400).send({
            message: resValDataTemp.missingColumns[0],
          });
        }
        if (resValDataTemp.errorRows.length) {
          return res.status(400).send({
            message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
          });
        }
        const amount_financed = data.amount_financed ? data.amount_financed : 0;
        const duration_of_agreement = data.duration_of_agreement
          ? data.duration_of_agreement
          : 0;
        const postData = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="http://nextgenws.ngwsconnect.experian.com">
                <SOAP-ENV:Header />
                <SOAP-ENV:Body>
                   <urn:process>
                      <urn:cbv2String><![CDATA[<INProfileRequest>
                <Identification>
                <XMLUser>${process.env.EXPERIAN_AR_USERNAME}</XMLUser>
                <XMLPassword>${process.env.EXPERIAN_AR_PASSWORD}</XMLPassword>
                </Identification>
                <Application>
                    <FTReferenceNumber>${
                      data.ftr_reference_number
                    }</FTReferenceNumber>
                    <CustomerReferenceID>${
                      data.customer_reference_id
                    }</CustomerReferenceID>
                    <EnquiryReason>${data.enquiry_reason}</EnquiryReason>
                    <FinancePurpose>${data.finance_purpose}</FinancePurpose>
                    <AmountFinanced>${amount_financed}</AmountFinanced>
                    <DurationOfAgreement>${duration_of_agreement}</DurationOfAgreement>
                    <ScoreFlag>3</ScoreFlag>
                    <PSVFlag>0</PSVFlag>
                </Application>
                <Applicant>
                   <Surname>${data.last_name}</Surname>
                   <FirstName>${data.first_name}</FirstName>
                   <MiddleName1>${data.middle_name_1}</MiddleName1>
                   <MiddleName2>${data.middle_name_2}</MiddleName2>
                   <MiddleName3>${data.middle_name_3}</MiddleName3>
                   <GenderCode>${data.gender_code}</GenderCode>
                   <IncomeTaxPAN>${data.income_tax_pan}</IncomeTaxPAN>>
                   <PAN_Issue_Date>${data.pan_issue_date}</PAN_Issue_Date>
                   <PAN_Expiration_Date>${
                     data.pan_expiration_date
                   }</PAN_Expiration_Date>
                   <PassportNumber>${data.passport_number}</PassportNumber>
                   <Passport_Issue_Date>${
                     data.passport_issue_date
                   }</Passport_Issue_Date>
                   <Passport_Expiration_Date>${
                     data.passport_expiration_date
                   }</Passport_Expiration_Date>
                   <VoterIdentityCard>${
                     data.voter_identity_card
                   }</VoterIdentityCard>
                   <Voter_ID_Issue_Date>${
                     data.voter_id_issue_date
                   }</Voter_ID_Issue_Date>
                   <Voter_ID_Expiration_Date>${
                     data.voter_id_expiration_date
                   }</Voter_ID_Expiration_Date>
                   <Driver_License_Number>${
                     data.driver_license_number
                   }</Driver_License_Number>
                   <Driver_License_Issue_Date>${
                     data.driver_license_issue_date
                   }</Driver_License_Issue_Date>
                   <Driver_License_Expiration_Date>${
                     data.driver_license_expiration_date
                   }</Driver_License_Expiration_Date>
                   <Ration_Card_Number>${
                     data.ration_card_number
                   }</Ration_Card_Number>
                   <Ration_Card_Issue_Date>${
                     data.ration_card_issue_date
                   }</Ration_Card_Issue_Date>
                   <Ration_Card_Expiration_Date>${
                     data.ration_card_expiration_date
                   }</Ration_Card_Expiration_Date>
                   <Universal_ID_Number>${
                     data.universal_id_number
                   }</Universal_ID_Number>
                   <Universal_ID_Issue_Date>${
                     data.universal_id_issue_date
                   }</Universal_ID_Issue_Date>
                   <Universal_ID_Expiration_Date>${
                     data.universal_id_expiration_date
                   }</Universal_ID_Expiration_Date>
                   <DateOfBirth>${moment(data.date_of_birth).format(
                     'YYYYMMDD',
                   )}</DateOfBirth>
                   <STDPhoneNumber>${data.std_phone_number}</STDPhoneNumber>
                   <PhoneNumber>${data.phone_number}</PhoneNumber>
                   <Telephone_Extension>${
                     data.telephone_extension
                   }</Telephone_Extension>
                   <Telephone_Type>${data.telephone_type}</Telephone_Type>
                   <MobilePhone>${data.mobile_phone}</MobilePhone>
                   <EMailId>${data.email_id}</EMailId>
                </Applicant>
                <Details>
                   <Income>${data.income}</Income>
                   <MaritalStatus>${data.marital_status}</MaritalStatus>
                   <EmployStatus>${data.employ_status}</EmployStatus>
                   <TimeWithEmploy>${data.time_with_employ}</TimeWithEmploy>
                   <NumberOfMajorCreditCardHeld>${
                     data.number_of_major_credit_card_held
                   }</NumberOfMajorCreditCardHeld>
                </Details>
                <Address>
                   <FlatNoPlotNoHouseNo>${
                     data.flat_no_plot_no_house_no
                   }</FlatNoPlotNoHouseNo>
                   <BldgNoSocietyName>${
                     data.bldg_no_society_name
                   }</BldgNoSocietyName>
                   <RoadNoNameAreaLocality>${
                     data.road_no_name_area_locality
                   }</RoadNoNameAreaLocality>
                   <City>${data.city}</City>
                   <State>${data.state}</State>
                   <PinCode>${data.pin_code}</PinCode>
                </Address>
                <AdditionalAddressFlag> 
                    <Flag>${data.flag}</Flag>
                </AdditionalAddressFlag>
                <AdditionalAddress>
                   <FlatNoPlotNoHouseNo>${
                     data.add_flat_no_plot_no_house_no
                   }</FlatNoPlotNoHouseNo>
                   <BldgNoSocietyName>${
                     data.add_bldg_no_society_name
                   }</BldgNoSocietyName>
                   <RoadNoNameAreaLocality>${
                     data.add_road_no_name_area_locality
                   }</RoadNoNameAreaLocality>
                   <City>${data.add_city}</City>
                   <State>${data.add_state}</State>
                   <PinCode>${data.add_pin_code}</PinCode>
                </AdditionalAddress>
             </INProfileRequest>
             ]]></urn:cbv2String>
                   </urn:process>
                </SOAP-ENV:Body>
             </SOAP-ENV:Envelope>`;
        //Heders
        const config = {
          method: 'POST',
          url: process.env.EXPERIAN_AR_URL,
          headers: {
            'Content-type': 'text/xml;charset="utf-8"',
            Accept: 'text/xml',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            SOAPAction: '"run"',
          },
          body: postData,
        };

        const dates = moment().format('YYYY-MM-DD HH:mm:ss');
        const company_id = req.company?._id ? req.company?._id : 0;
        const company_code = req.company?.code ? req.company?.code : 'Sample';
        const objData = {
          company_id: company_id,
          company_code: company_code,
          request_id: requestID,
          api_name: 'EXPERIAN-AR',
          service_id: process.env.SERVICE_EXPERIAN_AR_ID
            ? process.env.SERVICE_EXPERIAN_AR_ID
            : '0',
          response_type: 'success',
          request_type: 'request',
          timestamp: dates,
          is_cached_response: 'FALSE',
          pan_card: req.body.income_tax_pan
            ? req.body.income_tax_pan
            : 'Sample',
          document_uploaded_s3: '1',
          api_response_type: 'XML',
          api_response_status: 'SUCCESS',
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
        };

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${objData.api_name}/${objData.api_name}/${
          objData.company_id
        }/${filename}/${Date.now()}.txt`;

        const uploadResponse = await helper.uploadFileToS3(req.body, reqKey);

        if (!uploadResponse) {
          (objData.document_uploaded_s3 = 0), (objData.response_type = 'error');
        }
        objData.raw_data = uploadResponse.Location;
        //insert request data s3 upload response to database

        if (req.body.consent === 'N') {
          const objDataFailed = {
            company_id: company_id,
            company_code: company_code,
            request_id: requestID,
            loan_app_id: req.body.loan_app_id,
            api_name: 'EXPERIAN-AR',
            raw_data: uploadResponse.Location,
            service_id: process.env.SERVICE_EXPERIAN_AR_ID
              ? process.env.SERVICE_EXPERIAN_AR_ID
              : '0',
            response_type: 'error',
            request_type: 'request',
            timestamp: dates,
            pan_card: req.body.income_tax_pan
              ? req.body.income_tax_pan
              : 'Sample',
            document_uploaded_s3: '1',
            api_response_type: 'XML',
            api_response_status: 'FAIL',
            consent: req.body.consent,
            consent_timestamp: req.body.consent_timestamp,
          };
          const addResult = await bureaurReqResLogSchema.addNew(objDataFailed);
          return res.status(400).send({
            request_id: requestID,
            message: 'Consent was not provided',
          });
        } else {
          const addResult = await bureaurReqResLogSchema.addNew(objData);
          if (!addResult)
            throw {
              message: 'Error while adding request data',
            };
        }

        /**
         * Caching mechanism for getting saved response data from server or S3.
         *
         * @param {String} loan_app_id The loan_app_id of the partner.
         * @param {String} borrower_id_number The pan number of customer.
         * @param {String} CRIF Bureau Type (CIBIL,EXPERIAN OR CRIF).
         */
        const receivedCachedResponse = await callCachedResponseIfExist(
          req.body.loan_app_id,
          req.body.income_tax_pan,
          'EXPERIAN',
          requestID,
          objData,
          res,
        );
        if (receivedCachedResponse) {
          return receivedCachedResponse;
        }

        /* ----------- caching mechanism end----------- */

        // Call Experian-AR API
        request(config, async (error, response) => {
          if (error) {
            let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${objData.api_name}/${
              objData.api_name
            }/${company_id}/${filename}/${Date.now()}.txt`;
            //upload request data on s3
            const uploadXmlDataResponse = await helper.uploadFileToS3(
              error,
              resKey,
            );

            if (!uploadXmlDataResponse) {
              (objData.document_uploaded_s3 = 0),
                (objData.response_type = 'error');
            }
            objData.request_type = 'response';
            objData.api_response_type = 'XML';
            objData.raw_data = uploadXmlDataResponse.Location;

            //insert request data s3 upload response to database
            const addResult = await bureaurReqResLogSchema.addNew(objData);
            if (!addResult) throw { message: 'Error while adding error data' };

            res.status(400).send({
              message: 'Please contact the administrator',
              status: 'fail',
            });
          } else {
            const find = ['&lt;', '&gt;'];
            const replace = ['<', '>'];
            const responseBody = response?.body.replace(
              new RegExp(
                '(' +
                  find
                    .map(function (i) {
                      return i.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
                    })
                    .join('|') +
                  ')',
                'g',
              ),
              function (s) {
                return replace[find.indexOf(s)];
              },
            );

            const retype = 'response';
            let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${objData.api_name}/${objData.api_name}/${
              objData.company_id
            }/${filename}/${Date.now()}.txt`;
            //upload response data on s3
            const bureaurLogSchemaResponse = await helper.uploadFileToS3(
              response?.body,
              resKey,
            );
            const experian_res_data = await addBureauData(
              req.body,
              uploadResponse.Location,
              bureaurLogSchemaResponse.Location,
              req.company._id,
              'SUCCESS',
              req.company.code,
            );

            if (!bureaurLogSchemaResponse) {
              (objData.document_uploaded_s3 = 0),
                (objData.response_type = 'error');
            }
            objData.request_type = 'response';
            objData.raw_data = bureaurLogSchemaResponse.Location;

            //insert response data s3 upload response to database
            const addResult = await bureaurReqResLogSchema.addNew(objData);

            if (!addResult) {
              throw { message: 'Error while adding response data' };
            }

            return res.send({
              request_id: objData.request_id,
              data: responseBody.replace(/(\r\n|\r|\n)/g, ''),
            });
          }
        });
      } catch (error) {
        res.status(400).send({
          requestID: requestID,
          status: 'fail',
          message: 'Please contact the administrator',
        });
      }
    },
  );

  // EXPERIAN CCONSUMER CIRV2 API -- POST
  app.post(
    '/api/experian-consumer-cirv2',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      services.isServiceEnabled(process.env.SERVICE_EXPERIAN_CIRV2_ID),
      AccessLog.maintainAccessLog,
      verifyloanAppIdValidation,
    ],
    async (req, res) => {
      const requestID = `${req.company.code}-EXPERIAN-CIR-${Date.now()}`;

      try {
        const data = req.body;
        const url = req.service.file_s3_path;
        //Conditional constraints code level validation

        let isValidRequest = true;
        let missingKeys = [];
        if (!req.body.income_tax_pan) {
          isValidRequest = false;
          missingKeys.push(
            'Please provide pan or (Passport,VoterId and Phone Number)',
          );
        }
        if (req.body.flag == 'Y') {
          if (
            !req.body.add_city ||
            !req.body.add_state ||
            !req.body.add_pin_code ||
            !req.body.add_flat_no_plot_no_house_no
          ) {
            isValidRequest = false;
            missingKeys.push(
              'Please provide additional city,state,pincode,flat details)',
            );
          }
        }

        const mobile = /^.{5,}$/;
        const valMobile = mobile.test(req.body.phone_number);
        if (!valMobile) {
          {
            isValidRequest = false;
            missingKeys.push(
              'Please provide valid Phone Number, minimun 5 digits',
            );
          }
        }

        if (!isValidRequest) {
          return res
            .status(400)
            .send({ data: missingKeys, message: 'Invalid request!' });
        }
        //fetch template from s3
        const jsonS3Response = await helper.fetchJsonFromS3(
          url.substring(url.indexOf('services')),
        );
        if (!jsonS3Response) {
          return res.status(400).send({
            message: 'Error while finding template from s3',
          });
        }
        //validate the incoming template data with customized template data
        const resValDataTemp = validate.validateDataWithTemplate(
          jsonS3Response,
          [data],
        );

        if (resValDataTemp.missingColumns.length) {
          resValDataTemp.missingColumns = resValDataTemp.missingColumns.filter(
            (x) => x.field != 'sub_company_code',
          );
        }

        if (!resValDataTemp) {
          return res.status(400).send({
            message: 'No records found',
          });
        }
        if (resValDataTemp.unknownColumns.length) {
          return res.status(400).send({
            message: resValDataTemp.unknownColumns[0],
          });
        }
        if (resValDataTemp.missingColumns.length) {
          return res.status(400).send({
            message: resValDataTemp.missingColumns[0],
          });
        }
        if (resValDataTemp.errorRows.length) {
          return res.status(400).send({
            message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
          });
        }
        const enquiry_amount = data.enquiry_amount ? data.enquiry_amount : 0;
        const duration_of_agreement = data.duration_of_agreement
          ? data.duration_of_agreement
          : 0;
        const postData = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="http://nextgenws.ngwsconnect.experian.com">
          <SOAP-ENV:Header />
          <SOAP-ENV:Body>
             <urn:process>
                <urn:cbv2String><![CDATA[<INProfileRequest>
          <Identification>
          <XMLUser>${process.env.EXPERIAN_AR_USERNAME}</XMLUser>
          <XMLPassword>${process.env.EXPERIAN_AR_PASSWORD}</XMLPassword>
          </Identification>
          <Application>
              <FTReferenceNumber>${
                data.ftr_reference_number
              }</FTReferenceNumber>
              <CustomerReferenceID>${
                data.customer_reference_id
              }</CustomerReferenceID>
              <EnquiryReason>${data.enquiry_purpose}</EnquiryReason>
              <FinancePurpose>${data.finance_purpose}</FinancePurpose>
              <AmountFinanced>${enquiry_amount}</AmountFinanced>
              <DurationOfAgreement>${duration_of_agreement}</DurationOfAgreement>
              <ScoreFlag>3</ScoreFlag>
              <PSVFlag>0</PSVFlag>
          </Application>
          <Applicant>
             <Surname>${data.last_name}</Surname>
             <FirstName>${data.first_name}</FirstName>
             <MiddleName1>${data.middle_name_1}</MiddleName1>
             <MiddleName2>${data.middle_name_2}</MiddleName2>
             <MiddleName3>${data.middle_name_3}</MiddleName3>
             <GenderCode>${data.gender_code}</GenderCode>
             <IncomeTaxPAN>${data.income_tax_pan}</IncomeTaxPAN>>
             <PAN_Issue_Date>${data.pan_issue_date}</PAN_Issue_Date>
             <PAN_Expiration_Date>${
               data.pan_expiration_date
             }</PAN_Expiration_Date>
             <PassportNumber>${data.passport_number}</PassportNumber>
             <Passport_Issue_Date>${
               data.passport_issue_date
             }</Passport_Issue_Date>
             <Passport_Expiration_Date>${
               data.passport_expiration_date
             }</Passport_Expiration_Date>
             <VoterIdentityCard>${data.voter_identity_card}</VoterIdentityCard>
             <Voter_ID_Issue_Date>${
               data.voter_id_issue_date
             }</Voter_ID_Issue_Date>
             <Voter_ID_Expiration_Date>${
               data.voter_id_expiration_date
             }</Voter_ID_Expiration_Date>
             <Driver_License_Number>${
               data.driver_license_number
             }</Driver_License_Number>
             <Driver_License_Issue_Date>${
               data.driver_license_issue_date
             }</Driver_License_Issue_Date>
             <Driver_License_Expiration_Date>${
               data.driver_license_expiration_date
             }</Driver_License_Expiration_Date>
             <Ration_Card_Number>${data.ration_card_number}</Ration_Card_Number>
             <Ration_Card_Issue_Date>${
               data.ration_card_issue_date
             }</Ration_Card_Issue_Date>
             <Ration_Card_Expiration_Date>${
               data.ration_card_expiration_date
             }</Ration_Card_Expiration_Date>
             <Universal_ID_Number>${
               data.universal_id_number
             }</Universal_ID_Number>
             <Universal_ID_Issue_Date>${
               data.universal_id_issue_date
             }</Universal_ID_Issue_Date>
             <Universal_ID_Expiration_Date>${
               data.universal_id_expiration_date
             }</Universal_ID_Expiration_Date>
             <DateOfBirth>${moment(data.dob).format('YYYYMMDD')}</DateOfBirth>
             <STDPhoneNumber>${data.std_phone_number}</STDPhoneNumber>
             <PhoneNumber>${data.phone_number}</PhoneNumber>
             <Telephone_Extension>${
               data.telephone_extension
             }</Telephone_Extension>
             <Telephone_Type>${data.telephone_type}</Telephone_Type>
             <MobilePhone>${data.mobile_phone}</MobilePhone>
             <EMailId>${data.email_id}</EMailId>
          </Applicant>
          <Details>
             <Income>${data.income}</Income>
             <MaritalStatus>${data.marital_status}</MaritalStatus>
             <EmployStatus>${data.employ_status}</EmployStatus>
             <TimeWithEmploy>${data.time_with_employ}</TimeWithEmploy>
             <NumberOfMajorCreditCardHeld>${
               data.number_of_major_credit_card_held
             }</NumberOfMajorCreditCardHeld>
          </Details>
          <Address>
             <FlatNoPlotNoHouseNo>${data.address}</FlatNoPlotNoHouseNo>
             <BldgNoSocietyName>${data.address_line_2}</BldgNoSocietyName>
             <RoadNoNameAreaLocality>${
               data.address_line_3
             }</RoadNoNameAreaLocality>
             <City>${data.city}</City>
             <State>${data.state}</State>
             <PinCode>${data.pin_code}</PinCode>
          </Address>
          <AdditionalAddressFlag> 
              <Flag>${data.flag}</Flag>
          </AdditionalAddressFlag>
          <AdditionalAddress>
             <FlatNoPlotNoHouseNo>${
               data.add_flat_no_plot_no_house_no
             }</FlatNoPlotNoHouseNo>
             <BldgNoSocietyName>${
               data.add_bldg_no_society_name
             }</BldgNoSocietyName>
             <RoadNoNameAreaLocality>${
               data.add_road_no_name_area_locality
             }</RoadNoNameAreaLocality>
             <City>${data.add_city}</City>
             <State>${data.add_state}</State>
             <PinCode>${data.add_pin_code}</PinCode>
          </AdditionalAddress>
       </INProfileRequest>
       ]]></urn:cbv2String>
             </urn:process>
          </SOAP-ENV:Body>
       </SOAP-ENV:Envelope>`;
        //Headers
        const config = {
          method: 'POST',
          url: process.env.EXPERIAN_CIRV2_URL,
          headers: {
            'Content-type': 'text/xml;charset="utf-8"',
            Accept: 'text/xml',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            SOAPAction: '"run"',
          },
          body: postData,
        };

        const dates = moment().format('YYYY-MM-DD HH:mm:ss');
        const company_id = req.company?._id ? req.company?._id : 0;
        const company_code = req.company?.code ? req.company?.code : 'Sample';
        const objData = {
          company_id: company_id,
          company_code: company_code,
          request_id: company_code + '-EXPERIAN-CIRV2-' + Date.now(),
          api_name: 'EXPERIAN-CIRV2',
          loan_app_id: req.body.loan_app_id,
          service_id: process.env.SERVICE_EXPERIAN_CIRV2_ID
            ? process.env.SERVICE_EXPERIAN_CIRV2_ID
            : '0',
          response_type: 'success',
          request_type: 'request',
          timestamp: dates,
          pan_card: req.body.income_tax_pan
            ? req.body.income_tax_pan
            : 'Sample',
          document_uploaded_s3: '1',
          is_cached_response: 'FALSE',
          api_response_type: 'XML',
          api_response_status: 'SUCCESS',
          consent: req.body.consent,
          consent_timestamp: req.body.consent_timestamp,
        };

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const reqKey = `${objData.api_name}/${objData.api_name}/${
          objData.company_id
        }/${filename}/${Date.now()}.txt`;

        const uploadResponse = await helper.uploadFileToS3(req.body, reqKey);

        if (!uploadResponse) {
          (objData.document_uploaded_s3 = 0), (objData.response_type = 'error');
        }
        objData.raw_data = uploadResponse.Location;
        //insert request data s3 upload response to database

        if (req.body.consent === 'N') {
          const objDataFailed = {
            company_id: company_id,
            company_code: company_code,
            request_id: requestID,
            api_name: 'EXPERIAN-CIRV2',
            raw_data: uploadResponse.Location,
            service_id: process.env.SERVICE_EXPERIAN_CIRV2_ID
              ? process.env.SERVICE_EXPERIAN_CIRV2_ID
              : '0',
            response_type: 'error',
            request_type: 'request',
            timestamp: dates,
            pan_card: req.body.income_tax_pan
              ? req.body.income_tax_pan
              : 'Sample',
            document_uploaded_s3: '1',
            api_response_type: 'XML',
            api_response_status: 'FAIL',
            consent: req.body.consent,
            consent_timestamp: req.body.consent_timestamp,
          };
          const addResult = await bureaurReqResLogSchema.addNew(objDataFailed);
          return res.status(400).send({
            request_id: requestID,
            message: 'Consent was not provided',
          });
        } else {
          const addResult = await bureaurReqResLogSchema.addNew(objData);
          if (!addResult)
            throw {
              message: 'Error while adding request data',
            };
        }

        /**
         * Caching mechanism for getting saved response data from server or S3.
         *
         * @param {String} loan_app_id The loan_app_id of the partner.
         * @param {String} borrower_id_number The pan number of customer.
         * @param {String} CRIF Bureau Type (CIBIL,EXPERIAN OR CRIF).
         */
        const receivedCachedResponse = await callCachedResponseIfExist(
          req.body.loan_app_id,
          req.body.income_tax_pan,
          'EXPERIAN',
          requestID,
          objData,
          res,
        );
        if (receivedCachedResponse) {
          return receivedCachedResponse;
        }

        /* ----------- caching mechanism end----------- */
        // Call Experian-CIRV2 API
        request(config, async (error, response) => {
          if (error) {
            let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${objData.api_name}/${
              objData.api_name
            }/${company_id}/${filename}/${Date.now()}.txt`;
            //upload request data on s3
            const uploadXmlDataResponse = await helper.uploadFileToS3(
              error,
              resKey,
            );

            if (!uploadXmlDataResponse) {
              (objData.document_uploaded_s3 = 0),
                (objData.response_type = 'error');
            }
            objData.request_type = 'response';
            objData.api_response_type = 'XML';
            objData.raw_data = uploadXmlDataResponse.Location;

            //insert request data s3 upload response to database
            const addResult = await bureaurReqResLogSchema.addNew(objData);
            if (!addResult) throw { message: 'Error while adding error data' };

            res.status(500).send({
              requestID: requestID,
              status: 'fail',
              message: 'Please contact the administrator',
            });
          } else {
            const find = ['&lt;', '&gt;'];
            const replace = ['<', '>'];
            const responseBody = response.body?.replace(
              new RegExp(
                '(' +
                  find
                    .map(function (i) {
                      return i.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
                    })
                    .join('|') +
                  ')',
                'g',
              ),
              function (s) {
                return replace[find.indexOf(s)];
              },
            );

            const retype = 'response';
            let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
            const resKey = `${objData.api_name}/${objData.api_name}/${
              objData.company_id
            }/${filename}/${Date.now()}.txt`;
            //upload response data on s3
            const bureaurLogSchemaResponse = await helper.uploadFileToS3(
              response?.body,
              resKey,
            );

            const experian_res_data = await addBureauData(
              req.body,
              uploadResponse.Location,
              bureaurLogSchemaResponse.Location,
              req.company._id,
              'SUCCESS',
              req.company.code,
            );

            if (!bureaurLogSchemaResponse) {
              (objData.document_uploaded_s3 = 0),
                (objData.response_type = 'error');
            }
            objData.request_type = 'response';
            objData.raw_data = bureaurLogSchemaResponse.Location;

            //insert response data s3 upload response to database

            const addResult = await bureaurReqResLogSchema.addNew(objData);

            if (!addResult) {
              throw { message: 'Error while adding response data' };
            }

            return res.send({
              request_id: objData.request_id,
              data: responseBody.replace(/(\r\n|\r|\n)/g, ''),
            });
          }
        });
      } catch (error) {
        return res.status(500).send({
          requestID: requestID,
          status: 'fail',
          message: 'Please contact the administrator',
        });
      }
    },
  );

  async function addBureauData(
    data,
    reqKey,
    resKey,
    company_id,
    status,
    company_code,
  ) {
    try {
      var req_data = {
        company_id: company_id,
        loan_app_id: data.loan_app_id,
        bureau_type: 'EXPERIAN',
        req_url: reqKey,
        res_url: resKey,
        consent: data.consent,
        consent_timestamp: data.consent_timestamp,
        pan: data.income_tax_pan,
        status: status,
        consent: data.consent,
        consent_timestamp: data.consent_timestamp,
        created_by: company_code,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      var res = await bureau_data.addNew(req_data);
      return res;
    } catch (err) {
      throw err;
    }
  }
};

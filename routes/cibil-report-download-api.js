const bodyParser = require('body-parser');
const kycServices = require('../utils/kyc-services.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const fs = require('fs');
const moment = require('moment');
const axios = require('axios');
const stateConvertion = require('../utils/stateConvertionMapping.js');
const jwt = require('../util/jwt');

/**
 * Exporting CIBIL File Download API
 * @param {*} app
 * @param {*} connection
 * @return {*} Report Details
 * @throws {*} No Record Found
 */

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    '/api/lead-cibil-report/:loan_app_id/:borrower_type',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    async (req, res) => {
      try {
        const borrower_type = req.params.borrower_type;
        const loan_app_id = req.params.loan_app_id;
        const data = await LoanRequestSchema.findByLId(loan_app_id);
        if (!data)
          throw {
            success: false,
            message:
              'No record found in lead table aginst provoded loan_app_id',
          };
        const mappedStateCode = data.state
          ? stateConvertion.stateConvertionMapping[data.state.toUpperCase()]
          : '';
        // Prepare address as per length for cibil api
        const address = await kycServices.generateAddress(data.resi_addr_ln1);
        //prepare config data to make call to the cibil api
        const genericData = {
          enquiry_purpose: '05',
          enquiry_amount: '1000',
          tele_telephone_type_1: '01',
          id_id_type_1: '01',
          add_address_category_1: '02',
          en_acc_account_number_1: loan_app_id.substring(0, 10),
          loan_app_id: loan_app_id,
          consent: 'Y',
          consent_timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        };
        var cibilData = {};
        if (borrower_type === '1') {
          cibilData = {
            ...genericData,
            name_first_name_1: data.first_name ? data.first_name : '',
            name_middle_name_1: data.middle_name ? data.middle_name : '',
            name_last_name_1: data.last_name ? data.last_name : '',
            name_birth_date_1: moment(data.dob).format('DDMMYYYY'),
            name_gender_1:
              data.gender.toUpperCase() === 'MALE'
                ? '2'
                : data.gender.toUpperCase() === 'FEMALE'
                ? '1'
                : '3',
            tele_telephone_number_1: data.appl_phone,

            id_id_number_1: data.appl_pan,
            add_line1_1: address.address_line_1,
            add_line2_1: address.address_line_2,
            add_line3_1: address.address_line_3,
            add_line4_1: address.address_line_4,
            add_line5_1: address.address_line_5,
            add_state_code_1: mappedStateCode,
            add_pin_code_1: data.pincode,
          };
          throw {
            success: false,
            message: 'DATA NOT AVAILABLE',
          };
        } else if (borrower_type === '2') {
          cibilData = {
            ...genericData,
            name_first_name_1: data.first_name ? data.first_name : '',
            name_middle_name_1: data.middle_name ? data.middle_name : '',
            name_last_name_1: data.last_name ? data.last_name : '',
            name_birth_date_1: moment(data.dob).format('DDMMYYYY'),
            name_gender_1:
              data.gender.toUpperCase() === 'MALE'
                ? '2'
                : data.gender.toUpperCase() === 'FEMALE'
                ? '1'
                : '3',
            tele_telephone_number_1: data.appl_phone,
            id_id_number_1: data.appl_pan,
            add_line1_1: address.address_line_1,
            add_line2_1: address.address_line_2,
            add_line3_1: address.address_line_3,
            add_line4_1: address.address_line_4,
            add_line5_1: address.address_line_5,
            add_state_code_1: mappedStateCode,
            add_pin_code_1: data.pincode,
          };
          throw {
            success: false,
            message: 'DATA NOT AVAILABLE',
          };
        } else {
          cibilData = {
            ...genericData,
            name_first_name_1: data.first_name ? data.first_name : '',
            name_middle_name_1: data.middle_name ? data.middle_name : '',
            name_last_name_1: data.last_name ? data.last_name : '',
            name_birth_date_1: moment(data.dob).format('DDMMYYYY'),
            name_gender_1:
              data.gender.toUpperCase() === 'MALE'
                ? '2'
                : data.gender.toUpperCase() === 'FEMALE'
                ? '1'
                : '3',
            tele_telephone_number_1: data.appl_phone,

            id_id_number_1: data.appl_pan,
            add_line1_1: address.address_line_1,
            add_line2_1: address.address_line_2,
            add_line3_1: address.address_line_3,
            add_line4_1: address.address_line_4,
            add_line5_1: address.address_line_5,
            add_state_code_1: mappedStateCode,
            add_pin_code_1: data.pincode,
          };
        }
        //prepare config data to make call to the cibil api
        const cibilConfig = {
          method: 'POST',
          url: `${process.env.SERVICE_MS_URL}/api/cibil-verify`,
          headers: {
            Authorization: process.env.SERVICE_MS_TOKEN,
            'Content-Type': 'application/json',
          },
          data: cibilData,
        };
        const cibilResp = await axios(cibilConfig);

        if(cibilResp?.data?.result?.controlData?.success == false){
          throw{
            success: false,
            message:"CIBIL pull failed, the report cannot be generated"
          }
        }
         // Make call to pdf parser
        const cibilParserConfig = {
          method: 'POST',
          url: `${process.env.SERVICE_CIBILPARSER_URL}`,
          headers: {
            'access-token': process.env.SERVICE_CIBIL_TOKEN,
            'Content-Type': 'application/json',
          },
          data: {
            request_id: cibilResp.data?.request_id,
            result: cibilResp.data.result,
          },
        };
        const cibilParserResp = await axios(cibilParserConfig);
        if (!cibilParserResp)
          throw {
            success: false,
            message: 'error parsing cibil response',
          };
        //send parsed file in response
        res.status(200).send(cibilParserResp.data.data);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

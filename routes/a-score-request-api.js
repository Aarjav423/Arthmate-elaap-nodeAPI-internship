const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const validate = require('../util/validate-req-body.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
let reqUtils = require('../util/req.js');
const AScoreRequestSchema = require('../models/a-score-request-schema.js');
const { validateAScoreDetailsData } = require('../util/score-helper');
const axios = require('axios');
const {
  stateConvertionMapping,
} = require('../utils/stateConvertionMapping.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    '/api/a-score-request/:loan_app_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct, jwt.verifyUser],
    async (req, res, next) => {
      try {
        const { loan_app_id } = req.params;
        let aScoreDetails = await AScoreRequestSchema.findByLAID(loan_app_id);
        if (!aScoreDetails)
          throw {
            success: false,
            message: 'A score details not found against loan_app_id.',
          };
        if (aScoreDetails?.a_score)
          return res.status(200).send({
            success: true,
            data: JSON.parse(JSON.stringify(aScoreDetails)),
          });
        let tokenData = req.body;
        tokenData.company_id = req.company._id;
        tokenData.company_code = req.company.code;
        tokenData.product_id = req.product._id;
        tokenData.type = 'service';
        tokenData.user_id = req.user._id;
        tokenData.user_name = req.user.username;
        //generate dynamic product token
        const productToken = await jwt.generateTokenAndStore(tokenData);
        if (aScoreDetails.a_score_request_id) {
          axios
            .post(
              `${process.env.FETCH_A_SCORE_URL}`,
              {
                request_id: aScoreDetails.a_score_request_id,
                product: aScoreDetails.product_type,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${productToken}`,
                },
              },
            )
            .then(async (response) => {
              aScoreDetails.a_score = response.data.data.score.NCVL_AScore;
              const recordAScoreDetails =
                await AScoreRequestSchema.updateAScoreDetails(
                  loan_app_id,
                  aScoreDetails,
                );

              //Record data in A-score details collection.
              return res.status(200).send({
                success: true,
                data: JSON.parse(JSON.stringify(recordAScoreDetails)),
              });
            })
            .catch((error) => {
              return res.status(200).send({
                success: true,
                data: JSON.parse(JSON.stringify(aScoreDetails)),
              });
            });
        } else {
          return res.status(200).send({
            success: true,
            data: JSON.parse(JSON.stringify(aScoreDetails)),
          });
        }
        // axios call to
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  //API to record A score details data.
  app.post(
    '/api/a-score-request',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct, jwt.verifyUser],
    validateAScoreDetailsData,
    async (req, res, next) => {
      try {
        const { loan_app_id } = req.body;
        let data = req.body;
        //Validate if lead exist by loan_app_id.
        const leadExist = await LoanRequestSchema.findIfExistsLAID(loan_app_id);
        if (!leadExist)
          throw {
            success: false,
            message: 'No lead found against loan_app_id.',
          };

        //Validate lead should not be soft deleted.
        if (leadExist.is_deleted == 1)
          throw {
            success: false,
            message: 'Lead is deleted.',
          };
        //Validate if data already exist against loan_app_id.
        const dataAlreadyExist =
          await AScoreRequestSchema.findByLAID(loan_app_id);
        if (dataAlreadyExist && dataAlreadyExist.status === 'confirmed')
          throw {
            success: false,
            message: 'A score details already confirmed against loan_app_id.',
          };
        data.loan_app_id = loan_app_id;
        data.company_id = req.company._id;
        data.company_name = req.company.name;
        data.product_id = req.product._id;
        data.product_name = req.product.name;
        let recordAScoreDetails;
        if (
          dataAlreadyExist &&
          dataAlreadyExist.status === 'open' &&
          data.status !== 'confirmed'
        ) {
          recordAScoreDetails = await AScoreRequestSchema.updateAScoreDetails(
            loan_app_id,
            data,
          );
          if (!recordAScoreDetails)
            throw {
              success: false,
              message: 'Error while updating A-score details.',
            };
        } else if (!dataAlreadyExist) {
          recordAScoreDetails = await AScoreRequestSchema.addNew(data);
          if (!recordAScoreDetails)
            throw {
              success: false,
              message: 'Error while recording A-score details.',
            };
        }

        // Invoke third party api
        if (data.status === 'confirmed') {
          const payload = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            dob: req.body.dob,
            pan: req.body.pan,
            gender: req.body.gender,
            mobile_number: req.body.mobile_number,
            address: req.body.address,
            city: req.body.city,
            state_code: stateConvertionMapping[req.body.state.toUpperCase()],
            pin_code: req.body.pin_code,
            enquiry_purpose: req.body.enquiry_purpose,
            enquiry_amount: req.body.enquiry_amount,
            enquiry_stage: req.body.enquiry_stage,
            en_acc_account_number_1: req.body.en_acc_account_number_1,
            loan_app_id: req.body.loan_app_id,
            consent: req.body.consent,
            consent_timestamp: req.body.consent_timestamp,
            bureau_type: req.body.bureau_type.toLowerCase(),
            tenure: req.body.tenure,
            product_type: req.body.product_type,
          };
          //generate dynamic product token
          let tokenData = req.body;
          tokenData.company_id = req.company._id;
          tokenData.company_code = req.company.company_code;
          tokenData.product_id = req.product._id;
          tokenData.type = 'service';
          tokenData.user_id = req.user._id;
          tokenData.user_name = req.user.username;

          //generate dynamic product token
          const productToken = await jwt.generateTokenAndStore(tokenData);
          axios
            .post(`${process.env.A_SCORE_URL_REQUEST}`, payload, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${productToken}`,
              },
            })
            .then(async (response) => {
              data.a_score_request_id = response.data.request_id;
              recordAScoreDetails =
                await AScoreRequestSchema.updateAScoreDetails(
                  loan_app_id,
                  data,
                );
              //Record data in A-score details collection.
              reqUtils.json(req, res, next, 200, {
                success: true,
                message: 'A score details recorded successfully.',
              });
            })
            .catch((error) => {
              return res.status(400).send(error);
            });
        } else {
          //Record data in A-score details collection.
          reqUtils.json(req, res, next, 200, {
            success: true,
            message: 'A score details recorded successfully.',
          });
        }
      } catch (error) {
        console.log('/api/a-score-request error', error);
        return res.status(400).send(error);
      }
    },
  );
};

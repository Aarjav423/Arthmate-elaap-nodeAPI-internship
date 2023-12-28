const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const LoanRequestSchema = require('../models/loan-request-schema.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.post('/api/udhyam-aadhar-webhook', async (req, res) => {
    try {
      const { loan_app_id, document_type, message } = req.body;
      let existingLead = await LoanRequestSchema.findByLId(loan_app_id);
      if (message === 'success') {
        // Access the data sent in the request body
        axios
          .post(
            `${process.env.CAMS_BASE_URL}${process.env.CAMS_DETAIL_URL}`,
            {
              loan_app_id,
              document_type,
            },
            {
              headers: {
                'access-token': `${process.env.GET_CAMS_DETAIL_TOKEN}`,
              },
            },
          )
          .then(async (response) => {
            existingLead.urc_parsing_data = JSON.stringify(response.data);
            existingLead.urc_parsing_status = 'success';
            const dataUpdate = await LoanRequestSchema.updateCamDetails(
              loan_app_id,
              existingLead,
            );
            return res.status(200).json({
              message: 'cam detail stored successfully',
            });
          })
          .catch(async (error) => {
            console.log('error', error);
            existingLead.urc_parsing_data = null;
            existingLead.urc_parsing_status = 'fail-api';
            const dataUpdate = await LoanRequestSchema.updateCamDetails(
              loan_app_id,
              existingLead,
            );
            return res.status(400).json({
              message: 'cam detail status recorded as fail',
            });
          });
      } else {
        existingLead.urc_parsing_data = null;
        existingLead.urc_parsing_status = 'fail';
        const dataUpdate = await LoanRequestSchema.updateCamDetails(
          loan_app_id,
          existingLead,
        );
        return res.status(400).json({
          message: 'cam detail status recorded as fail',
        });
      }

      // Send a response back to the client
    } catch (error) {
      console.log('error', error);
      return res.status(400).send(error);
    }
  });

  // get data from LoanRequestSchema with loan_app_id
  app.get('/api/udhyam-aadhar-OCR-data/:loan_app_id', async (req, res) => {
    try {
      const { loan_app_id } = req.params;
      const loanRequestDetails = await LoanRequestSchema.findByLId(loan_app_id);

      if (!loanRequestDetails)
        throw {
          success: false,
          message: 'Lead details not found against loan_app_id.',
        };
      return res.status(200).send({
        success: true,
        data: JSON.parse(JSON.stringify(loanRequestDetails)),
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

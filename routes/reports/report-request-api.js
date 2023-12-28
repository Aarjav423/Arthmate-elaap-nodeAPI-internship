const jwt = require('../../util/jwt');
const { check, validationResult } = require('express-validator');
const RequestQueueReportsSchema = require("../../models/request-queue-reports-schema");
const { getSignedUrl } = require('../third-party-apis/utils/aws-s3-helper');
const fs = require('fs').promises;
const moment = require('moment');

module.exports = (app, connections) => {
  app.use(bodyParser.json());

  app.get(
    '/api/report-request/:report_type/:page/:limit',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const company_id = req.authData.company_id;
        const reportData = 
          await RequestQueueReportsSchema.getPaginatedData(
            req.params.report_type,
            req.params.page,
            req.params.limit,
            company_id,
          );
        if (reportData.rows.length) {
          return res.status(200).send(reportData);
        } else {
          res.status(400).send({
            success: false,
            message: `No records found for ${req.params.report_type}`
          });
        }

      } catch (error) {
        res.status(500).send(error);
      }
    }
  );

  app.post(
    '/api/report-request',
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('from_date')
        .notEmpty()
        .withMessage('from_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid from_date in YYYY-MM-DD format'),
      check('to_date')
        .notEmpty()
        .withMessage('to_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid to_date in YYYY-MM-DD format'),
    ],
    [
      jwt.verifyToken,
      jwt.verifyUser
    ],
    async (req, res) => {
      try {
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(400).send({
            success: false,
            message: errors.errors[0]['msg'],
          });

        const reqBody = req.body;
        if (reqBody.company_id && reqBody.company_id !== req.authData.company_id) {
          res.status(400).send({
            success: false,
            message: "company_id mismatch"
          });
        }

        if (reqBody.from_date && reqBody.to_date) {
          let fromDate = moment(reqBody.from_date, 'YYYY-MM-DD');
          let toDate = moment(reqBody.to_date, 'YYYY-MM-DD');
          
          // Validate from date should not be greater than to date
          if (toDate.isBefore(fromDate)) {
            res.status(400).send({
              success: false,
              message: 'from_date should be less than to_date',
            });
          }
        }

        const requestData = {
          company_id: reqBody.company_id,
          company_code: reqBody.company_code,
          company_name: reqBody.company_name,
          product_id: reqBody.product_id,
          product_name: reqBody.product_name,
          report_name: reqBody.report_name,
          from_date: reqBody.from_date,
          to_date: reqBody.to_date,
          requested_by: req.user.email,
          report_status:reqBody?.status,
          status: "In-progress"
        }

        let newRequest = await RequestQueueReportsSchema.addNew(requestData);
        if (newRequest) {
          const fileName = `${reqBody.report_name}_${newRequest._id}_${
              reqBody.company_name ? reqBody.company_name : 'all_partners'
            }_${reqBody.product_name ? reqBody.product_name : 'all_products'
            }_${reqBody.from_date}_${reqBody.to_date}_report.csv`;
  
          newRequest = await RequestQueueReportsSchema.addFileName( newRequest._id, fileName );
          return res.status(201).send({
            success: true,
            message: 'Request successfully added to queue',
            data: newRequest
          });
        } else {
          throw {
            success: false,
            message: 'Failed to generate report request'
          };
        }

      } catch (error) {
        return res.status(500).send(error);
      }
    }
  );

  app.get(
    '/api/report-request/download/:id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const reportReq = await RequestQueueReportsSchema.findById(req.params.id);
        if (!reportReq) {
          return res.status(400).send({
            success: false,
            message: 'No report request found for the given id'
          })
        }

        if (!reportReq.file_url) {
          return res.status(400).send({
            success: false,
            message: 'File not ready for download'
          })
        }
        const key = `${reportReq.report_name}/${reportReq.file_name}`;
        const signedUrl = await getSignedUrl(key);

        if (signedUrl) {
          res.status(200).send({
            success: true,
            message: 'File download processed successfully',
            signed_url: signedUrl
          });
        } else {
          throw {
            success: false,
            message: 'Failed to get download url'
          }
        }

      } catch (error) {
        return res.status(500).send(error);
      }
    }
  );
    
}
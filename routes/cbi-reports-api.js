const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const LoanZipDetailsSchema = require('../models/loan-zip-schema');
const ProductSchema = require('../models/product-schema');
const s3helper = require('../util/s3helper');
const moment = require('moment');
const { check, validationResult } = require('express-validator');

module.exports = (app, conn) => {
  app.post(
    '/api/cbi/data',
    [
      check('co_lender_shortcode')
        .notEmpty()
        .withMessage('co_lender_shortcode is required'),
      check('from_date').notEmpty().withMessage('from_date is required'),
      check('to_date').notEmpty().withMessage('to_date is required'),
    ],
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }

        if (
          typeof req.body.from_date != 'string' ||
          req.body.from_date.length != 10
        ) {
          throw {
            code: 422,
            status: false,
            message: 'Invalid from_date',
          };
        }
        if (
          typeof req.body.to_date != 'string' ||
          req.body.to_date.length != 10
        ) {
          throw {
            code: 422,
            status: false,
            message: 'Invalid to_date',
          };
        }
        if (
          typeof req.body.co_lender_shortcode != 'string' ||
          req.body.co_lender_shortcode.length == 0
        ) {
          throw {
            code: 422,
            status: false,
            message: 'Invalid co_lender_shortcode',
          };
        }
        let resp_arr = [];
        const resp_data_with_filter =
          await LoanZipDetailsSchema.findAllWithFilter({
            co_lender_shortcode: req.body.co_lender_shortcode,
          });

        if (req.body.from_date || req.body.to_date) {
          let fromDate = moment(req.body.from_date, 'YYYY-MM-DD');
          let toDate = moment(req.body.to_date, 'YYYY-MM-DD');
          if (req.body.from_date && req.body.to_date) {
            // Validate from date should not be greater than to date
            if (toDate.isBefore(fromDate))
              throw {
                success: false,
                message: 'from_date should be less than to_date',
              };
            // Validate difference between from_date and to_date should be maximum one year
            let Days = toDate.diff(fromDate, 'days');
            if (Days > process.env.MAXIMUM_DATE_RANGE_REPORT) {
              throw {
                success: false,
                message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE_REPORT} days`,
              };
            }
          }
        }
        //format date
        let from_date = req.body.from_date.split('-');
        let to_date = req.body.to_date.split('-');
        //filter the data
        var from = new Date(
          from_date[0],
          parseInt(from_date[1]) - 1,
          from_date[2],
        );
        var to = new Date(to_date[0], parseInt(to_date[1]) - 1, to_date[2]);
        for (let obj in resp_data_with_filter) {
          let data = resp_data_with_filter[obj];
          let req_generated_date_arr = data.generated_date.split('-');
          var check = new Date(
            req_generated_date_arr[2],
            parseInt(req_generated_date_arr[1]) - 1,
            req_generated_date_arr[0],
          );
          if (check >= from && check <= to) {
            resp_arr.push(data);
          }
        }
        return res.status(200).send(resp_arr);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  app.post('/api/cbi/data/download', [jwt.verifyToken], async (req, res) => {
    try {
      let date_arr = req.body.generated_date.split('-');
      let date = moment(req.body.generated_date).format('DD-MM-YYYY');
      const resp_data = await LoanZipDetailsSchema.findIfExists({
        co_lender_shortcode: req.body.co_lender_shortcode,
        created_at: date,
      });
      if (!resp_data)
        throw {
          success: false,
          message: ' No records found',
        };
      const regex = /https:\/\/([^\.]+)\.s3/;
      const result = resp_data.zip_file_url.match(regex);
      const colenderBucketName = result[1];
      if (!result) {
        throw {
          status: false,
          Messgae: 'Bucket name not found',
        };
      }
      const regexUrl = /com\/([^\.]+)\//;
      const output = resp_data.zip_file_url.match(regexUrl);
      const urlIndex = output[1];
      let zip = await s3helper.fetchDataFromColenderS3(
        resp_data.zip_file_url.substring(
          resp_data.zip_file_url.indexOf(urlIndex),
        ),
        colenderBucketName,
      );
      return res.status(200).send(zip);
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

bodyParser = require('body-parser');
path = require('path');
const helper = require('../util/helper.js');
const s3helper = require('../util/s3helper.js');
var url = require('url');
var loanTemplets = require('../models/loan-templates-schema.js');
const jwt = require('../util/jwt');
const pick = require('lodash.pick');
const _ = require('lodash');

module.exports = (app, connection) => {
  app.post(
    '/api/postman/loanbook',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyProduct, jwt.verifyLoanSchema],
    async (req, res) => {
      try {
        const loantemplates = await loanTemplets.findAllById(
          req.loanSchema.loan_custom_templates_id,
        );
        if (!loantemplates)
          throw {
            message: 'Error finding loan template',
          };
        let i = 0;
        let resultArray = [];
        let temp = {
          info: {
            _postman_id: 'cf803956-34b1-4f9f-a63f-f24b13d9a34d',
            name: 'loan-booking-api',
            schema:
              'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
          },
          item: [],
          protocolProfileBehavior: {},
        };

        for (const element of loantemplates) {
          const result = await s3helper.fetchJsonFromS3(
            element.path.substring(element.path.indexOf('templates')),
          );
          if (!result)
            throw {
              message: 'Error fetching json from s3',
            };
          const apiPath = path
            .basename(url.parse(element.path).pathname)
            .split('.')
            .slice(0, 1)
            .toString();
          var dataObj = {};
          result
            .filter((item) => item.checked == 'TRUE')
            .map((element) => {
              dataObj[element.field] = element.validationmsg;
            });
          if (apiPath == 'loandocument') {
            var arr1 = Object.keys(
              _.omit(
                dataObj,
                'partner_loan_id',
                'partner_borrower_id',
                'loan_id',
                'borrower_id',
              ),
            ).join('/');
            dataObj = _.pick(
              dataObj,
              'loan_app_id',
              'borrower_id',
              'partner_loan_app_id',
              'partner_borrower_id',
            );
            dataObj['file_url'] = `Please provide file_url`;
            dataObj['code'] = `Please provide the document code`;
            dataObj['base64pdfencodedfile'] =
              'Please fill in base64 encoded pdf file string';
          }
          const item = {
            name: apiPath,
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
                {
                  key: 'Authorization',
                  value: 'Bearer <>',
                },
                {
                  key: 'company_code',
                  value: '',
                },
              ],
              body: {
                mode: 'raw',
                raw:
                  apiPath == 'loandocument'
                    ? JSON.stringify(dataObj)
                    : JSON.stringify([dataObj]),
              },
              url: {
                raw: process.env.POSTMAN_COLLECTION_RAW,
                host: process.env.POSTMAN_COLLECTION_HOST,
                path: ['api', apiPath],
              },
            },
            response: [],
          };
          temp.item.push(item);
          i++;
          if (i == loantemplates.length) {
            return res.status(200).json(temp);
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

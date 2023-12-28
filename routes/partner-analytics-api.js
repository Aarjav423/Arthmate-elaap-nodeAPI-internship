const moment = require('moment/moment');
const company = require('../models/company-schema.js');
const product = require('../models/product-schema.js');
const loanrequest = require('../models/loan-request-schema.js');
const borrowerinfo_common = require('../models/borrowerinfo-common-schema.js');
const loan_transaction_ledgers = require('../models/loan-transaction-ledger-schema.js');
const loan_states = require('../models/loan-state-schema.js');
const service_req_res_logs = require('../models/service-req-res-log-schema.js');
const jwt = require('../util/jwt');

/**
 * Exporting all routes regarding company analytics
 * @param {*} app
 * @param {*} connection
 */
module.exports = (app, connection) => {
  /**
   * API to fetch all companies.
   */
  app.get(
    '/api/analytics/companies',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      const companies = await company.getAll();
      // Return array of companies.
      return res.status(200).send({
        code: 200,
        data: companies,
      });
    },
  );

  /**
   * API to fetch all companies.
   */
  app.get(
    '/api/analytics/companies/:id/products',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      const products = await product
        .find({ company_id: req.params.id })
        .select('_id name company_id');
      // Return array of companies.
      return res.status(200).send({
        code: 200,
        data: products,
      });
    },
  );

  /**
   * API to fetch leads analytics for the provided company ID.
   */
  app.get(
    '/api/analytics/companies/:id/leads',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id.
      if (isNaN(req.params.id)) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.id);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }
      //Fetch rawdata.
      let rawData = await loanrequest.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            created_at: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at',
              },
            },
            total_leads: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);
      //Transform rawdata.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_leads: instance['total_leads'],
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_leads: 0,
          });
        }
      }
      //Return transformed analytics
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch loans analytics for the provided company ID.
   */
  app.get(
    '/api/analytics/companies/:id/loans',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company ID.
      if (isNaN(req.params.id)) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.id);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }
      //Fetch rawdata.
      let rawData = await borrowerinfo_common.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            created_at: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at',
              },
            },
            total_loans: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_loans: instance['total_loans'],
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_loans: 0,
          });
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch disbursed loans analytics for the provided company ID
   */
  app.get(
    '/api/analytics/companies/:id/loans/disbursed',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate Company ID.
      if (isNaN(req.params.id)) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.id);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }
      //Fetch raw data.
      let rawData = await loan_transaction_ledgers.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            label: 'disbursement',
            utr_date_time_stamp: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$utr_date_time_stamp',
              },
            },
            disbursed_loan_count: {
              $sum: 1,
            },
            net_disbursement_value: {
              $sum: { $toDecimal: '$txn_amount' },
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            disbursed_loan_count: instance['disbursed_loan_count'],
            net_disbursement_value: parseFloat(
              instance['net_disbursement_value'],
            ),
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            disbursed_loan_count: 0,
            net_disbursement_value: 0,
          });
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch DPD analytics for the provided company ID.
   */
  app.get(
    '/api/analytics/companies/:id/dpd',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company ID.
      if (isNaN(req.params.id)) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.id);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }
      //Fetch Raw Data.
      let rawData = await loan_states.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            status: 'Due',
          },
        },
        {
          $group: {
            _id: '$dpd_range',
            principal_outstanding: {
              $sum: { $toDecimal: '$prin_os' },
            },
            interest_outstanding: {
              $sum: { $toDecimal: '$int_os' },
            },
            principal_due: {
              $sum: { $toDecimal: '$current_prin_due' },
            },
            interest_due: {
              $sum: { $toDecimal: '$current_int_due' },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      //Transform raw data.
      let analytics = [];
      for (let i = 0; i < rawData.length; i++) {
        let instance = rawData[i];
        analytics.push({
          dpd_range: instance['_id'],
          principal_outstanding: parseFloat(instance['principal_outstanding']),
          interest_outstanding: parseFloat(instance['interest_outstanding']),
          principal_due: parseFloat(instance['principal_due']),
          interest_due: parseFloat(instance['interest_due']),
          count: instance['count'],
        });
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch services usage for the provided company ID.
   */
  app.get(
    '/api/analytics/companies/:id/services',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      // Validate company id.
      if (isNaN(req.params.id)) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.id);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }
      //Fetch raw data.
      let rawData = await service_req_res_logs.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            request_type: 'response',
          },
        },
        {
          $group: {
            _id: {
              api: '$api_name',
              month: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$timestamp',
                },
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 0; i < rawData.length; i++) {
        const element = rawData[i];
        let index = analytics.findIndex(
          (e) => e['month'] == element['_id']['month'],
        );
        if (index == -1) {
          analytics.push({
            month: element['_id']['month'],
            services: [
              {
                api: element['_id']['api'],
                count: element['count'],
              },
            ],
          });
        } else {
          analytics[index]['services'].push({
            api: element['_id']['api'],
            count: element['count'],
          });
        }
      }
      //Sort analytics array by month.
      analytics.sort(function (a, b) {
        if (moment(a['month']) > moment(b['month'])) return 1;
        else if (moment(a['month']) < moment(b['month'])) return -1;

        return 0;
      });

      //Add any remaining month in-btw. (*if any).
      if (analytics.length != 0) {
        let startMonth = analytics[0]['month'];
        let endMonth = analytics[analytics.length - 1]['month'];
        let diffInMonths =
          moment(endMonth).diff(moment(startMonth), 'months') + 1;
        for (let j = 0; j < diffInMonths; j++) {
          let instance = analytics.find(
            (element) =>
              element['month'] ==
              moment(endMonth).subtract(j, 'months').format('YYYY-MM'),
          );
          if (!instance) {
            analytics.push({
              month: moment(endMonth).subtract(j, 'days').format('YYYY-MM'),
              services: [],
            });
          }
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );

  /**
   * API to fetch leads analytics for the provided company ID and productID.
   */
  app.get(
    '/api/analytics/companies/:companyId/products/:productId/leads',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id and product id.
      if (isNaN(req.params.companyId || isNaN(req.params.productId))) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.companyId);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }

      //Check if product id exists in our DB.
      let productModel = await product.findById(req.params.productId);
      if (!productModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid product id.',
        });
      }

      //Fetch rawdata.
      let rawData = await loanrequest.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            product_id: productModel['_id'],
            created_at: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at',
              },
            },
            total_leads: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);

      //Transform rawdata.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_leads: instance['total_leads'],
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_leads: 0,
          });
        }
      }

      //Return transformed analytics
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch loans analytics for the provided company ID and productID.
   */
  app.get(
    '/api/analytics/companies/:companyId/products/:productId/loans',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id and product id.
      if (isNaN(req.params.companyId || isNaN(req.params.productId))) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.companyId);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }

      //Check if product id exists in our DB.
      let productModel = await product.findById(req.params.productId);
      if (!productModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid product id.',
        });
      }

      //Fetch rawdata.
      let rawData = await borrowerinfo_common.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            product_id: productModel['_id'],
            created_at: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$created_at',
              },
            },
            total_loans: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_loans: instance['total_loans'],
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            total_loans: 0,
          });
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch disbursed loans analytics for the provided company ID and productID.
   */
  app.get(
    '/api/analytics/companies/:companyId/products/:productId/loans/disbursed',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id and product id.
      if (isNaN(req.params.companyId || isNaN(req.params.productId))) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.companyId);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }

      //Check if product id exists in our DB.
      let productModel = await product.findById(req.params.productId);
      if (!productModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid product id.',
        });
      }
      //Fetch raw data.
      let rawData = await loan_transaction_ledgers.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            product_id: productModel['_id'],
            label: 'disbursement',
            utr_date_time_stamp: {
              $gte: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$utr_date_time_stamp',
              },
            },
            disbursed_loan_count: {
              $sum: 1,
            },
            net_disbursement_value: {
              $sum: { $toDecimal: '$txn_amount' },
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 15; i > 0; i--) {
        let instance = rawData.find(
          (element) =>
            element['_id'] == moment().subtract(i, 'days').format('YYYY-MM-DD'),
        );
        if (instance) {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            disbursed_loan_count: instance['disbursed_loan_count'],
            net_disbursement_value: parseFloat(
              instance['net_disbursement_value'],
            ),
          });
        } else {
          analytics.push({
            date: moment().subtract(i, 'days').format('YYYY-MM-DD'),
            disbursed_loan_count: 0,
            net_disbursement_value: 0,
          });
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
  /**
   * API to fetch DPD analytics for the provided company ID and productID.
   */
  app.get(
    '/api/analytics/companies/:companyId/products/:productId/dpd',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id and product id.
      if (isNaN(req.params.companyId || isNaN(req.params.productId))) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.companyId);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }

      //Check if product id exists in our DB.
      let productModel = await product.findById(req.params.productId);
      if (!productModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid product id.',
        });
      }
      //Fetch Raw Data.
      let rawData = await loan_states.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            product_id: productModel['_id'],
            status: 'Due',
          },
        },
        {
          $group: {
            _id: '$dpd_range',
            principal_outstanding: {
              $sum: { $toDecimal: '$prin_os' },
            },
            interest_outstanding: {
              $sum: { $toDecimal: '$int_os' },
            },
            principal_due: {
              $sum: { $toDecimal: '$current_prin_due' },
            },
            interest_due: {
              $sum: { $toDecimal: '$current_int_due' },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      //Transform raw data.
      let analytics = [];
      for (let i = 0; i < rawData.length; i++) {
        let instance = rawData[i];
        analytics.push({
          dpd_range: instance['_id'],
          principal_outstanding: parseFloat(instance['principal_outstanding']),
          interest_outstanding: parseFloat(instance['interest_outstanding']),
          principal_due: parseFloat(instance['principal_due']),
          interest_due: parseFloat(instance['interest_due']),
          count: instance['count'],
        });
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );

  /**
   * API to fetch services usage for the provided company ID and productID.
   */
  app.get(
    '/api/analytics/companies/:companyId/products/:productId/services',
    //Check if provided JWT is of a valid admin user.
    [jwt.verifyAdminUser],
    async (req, res) => {
      //Validate company id and product id.
      if (isNaN(req.params.companyId || isNaN(req.params.productId))) {
        //Return 400 if not valid.
        return res.status(400).send({
          code: 400,
          message: 'Bad Request',
        });
      }
      //Check if company id exists in our DB.
      let companyModel = await company.findById(req.params.companyId);
      if (!companyModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid company id.',
        });
      }

      //Check if product id exists in our DB.
      let productModel = await product.findById(req.params.productId);
      if (!productModel) {
        //Return 400 if no company found against provided company ID.
        return res.status(400).send({
          code: 400,
          message: 'Invalid product id.',
        });
      }
      //Fetch raw data.
      let rawData = await service_req_res_logs.aggregate([
        {
          $match: {
            company_id: companyModel['_id'],
            product_id: productModel['_id'],
            request_type: 'response',
          },
        },
        {
          $group: {
            _id: {
              api: '$api_name',
              month: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$timestamp',
                },
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]);
      //Transform raw data.
      let analytics = [];
      for (let i = 0; i < rawData.length; i++) {
        const element = rawData[i];
        let index = analytics.findIndex(
          (e) => e['month'] == element['_id']['month'],
        );
        if (index == -1) {
          analytics.push({
            month: element['_id']['month'],
            services: [
              {
                api: element['_id']['api'],
                count: element['count'],
              },
            ],
          });
        } else {
          analytics[index]['services'].push({
            api: element['_id']['api'],
            count: element['count'],
          });
        }
      }
      //Sort analytics array by month.
      analytics.sort(function (a, b) {
        if (moment(a['month']) > moment(b['month'])) return 1;
        else if (moment(a['month']) < moment(b['month'])) return -1;

        return 0;
      });

      //Add any remaining month in-btw. (*if any).
      if (analytics.length != 0) {
        let startMonth = analytics[0]['month'];
        let endMonth = analytics[analytics.length - 1]['month'];
        let diffInMonths =
          moment(endMonth).diff(moment(startMonth), 'months') + 1;
        for (let j = 0; j < diffInMonths; j++) {
          let instance = analytics.find(
            (element) =>
              element['month'] ==
              moment(endMonth).subtract(j, 'months').format('YYYY-MM'),
          );
          if (!instance) {
            analytics.push({
              month: moment(endMonth).subtract(j, 'days').format('YYYY-MM'),
              services: [],
            });
          }
        }
      }
      //Return transformed analytics.
      return res.status(200).send({
        code: 200,
        data: analytics,
      });
    },
  );
};

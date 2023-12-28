const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const ColenderLoan = require('../models/co-lender-loan-schema.js');
const colenderProfileSchema = require('../models/co-lender-profile-schema.js');
const cbiProfileSchema = require('../models/cbi-loan-schema.js');
const selectorSchema = require('../models/selector-details-schema.js');
const axios = require('axios');
const jwt = require('../util/jwt');
const _borrowerInfoSchema = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const ComplianceSchema = require('../models/compliance-schema.js');
const offerDetailsSchema = require('../models/offer-details-schema.js');
const s3helper = require('../util/s3helper.js');
const colenderHelper = require('../util/colender-helper.js');
const LoanActivities = require('../models/loan-activities-schema.js');
const {
  getSignedUrlForCoLending,
} = require('./third-party-apis/utils/aws-s3-helper');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/fetch-cbi-loan', async (req, res) => {
    try {
      const loan_id = req.query.loan_id;
      let colenderLoan = await cbiProfileSchema.getByLID(loan_id);
      colenderLoan = JSON.parse(JSON.stringify(colenderLoan));
      let combinedMakerChecker = [];

      Object.keys(colenderLoan?.sync_status).map((key) => {
        let tempArr = colenderLoan?.sync_status[`${key}`];
        tempArr.map((item) => {
          let tempItem = { ...item, role: key };
          combinedMakerChecker.push(tempItem);
        });
      });
      combinedMakerChecker.sort(function compare(a, b) {
        let dateA = new Date(a.updated_at);
        let dateB = new Date(b.updated_at);
        return dateA < dateB ? 1 : -1;
      });
      colenderLoan.combined_maker_checker = combinedMakerChecker;
      return res.status(200).json(colenderLoan);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/fetch-loan-details', async (req, res) => {
    try {
      const loan_id = req.query.loan_id;
      const loanDetails = await _borrowerInfoSchema.findOneWithKLID(loan_id);
      return res.status(200).json(loanDetails);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.put('/api/run-credit-engine', async (req, res) => {
    try {
      let latestObject = null;
      const loan_id = req.body.loan_id;
      const loan_app_id = req.body.loan_app_id;
      const bre_exe_date = req.body.bre_exe_date;
      const bre_generated_by = req.body.bre_generated_by;
      const latestBreDetails = await LoanActivities.findByLAPId(loan_app_id);
      if (latestBreDetails) {
        latestBreDetails.filter(item => !item.borrower_id).reduce((prev, current) => {
          if (
            !prev ||
            new Date(current.created_at) > new Date(prev.created_at)
          ) {
            latestObject = current;
          }
          return current;
        }, null);
      }
      const label = latestObject.label;
      const url = latestObject.url;
      if (label && url) {
        await cbiProfileSchema.updateColenderLoanAndAddBreDetails(
          loan_id,
          label,
          url,
          bre_exe_date,
          bre_generated_by
        );
      }
      setTimeout(() => {
        return res.status(200).json(url);
      }, 3000);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/fetch-bre-details', async (req, res) => {
    try {
      const s3_url = req.body.s3_url;
      const regexUrl = /com\/([^\.]+)\//;
      const output = s3_url.match(regexUrl);
      const urlIndex = output[1];
      const key = s3_url.substring(s3_url.indexOf(urlIndex));
      const buffer = await s3helper.fetchDataFromS3(key);
      const data = buffer.toString('utf8');
      const resp = JSON.parse(data.toString());
      return res.status(200).json(resp['rule-decision-list']);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/fetch-lead-details', async (req, res) => {
    try {
      const loan_app_id = req.query.loan_app_id;
      const loanDestails = await LoanRequestSchema.findByLId(loan_app_id);
      return res.status(200).json(loanDestails);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/fetch-ckyc-details', async (req, res) => {
    try {
      const loan_app_id = req.query.loan_app_id;
      const loanDestails = await ComplianceSchema.findByLoanAppId(loan_app_id);
      return res.status(200).json(loanDestails);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get(
    '/api/co-lender-loans-report/:colenderId/:userId',
    async (req, res) => {
      try {
        const _colenderId = req.params.colenderId;
        const _colenderLoan = await _borrowerInfoSchema.findByCLI(_colenderId);
        return res.status(200).json(_colenderLoan);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/selector-details',
    [check('loan_app_id').notEmpty().withMessage('Loan app id is required')],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const loan_app_id = req.body?.loan_app_id;
        const data = {
          enquiry_purpose: req.body?.enquiry_purpose,
          enquiry_stage: req.body?.enquiry_stage,
          bureau_type: req.body?.bureau_type,
          dscr: req.body?.dscr,
          consent: req.body?.consent,
          consent_timestamp: req.body?.consent_timestamp,
          product_type_code: req.body?.product_type_code,
          request_id_a_score: req.body?.request_id_a_score,
          request_id_b_score: req.body?.request_id_b_score,
          interest_rate: req.body?.interest_rate,
          ceplr_cust_id: req.body?.ceplr_cust_id,
          sanction_amount: req.body?.sanction_amount,
          tenure: req.body?.tenure,
          monthly_income: req.body?.monthly_income,
        };
        const _selectorData =
          await selectorSchema.findIfExistByLId(loan_app_id);
        if (!_selectorData) {
          await selectorSchema.addNew(loan_app_id, data);
        } else {
          const _updatedSelectorData = await selectorSchema.updateByLID(
            loan_app_id,
            data,
          );
        }
        return res.status(200).send({
          status: 'SUCCESS',
          message: 'Updated Successfully',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/selector-response',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
    [
      check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
      check('enquiry_purpose')
        .notEmpty()
        .withMessage('enquiry_purpose is required'),
      check('bureau_type').notEmpty().withMessage('bureau_type is required'),
      check('dscr').notEmpty().withMessage('dscr is required'),
      check('consent').notEmpty().withMessage('consent is required'),
      check('consent_timestamp')
        .notEmpty()
        .withMessage('consent_timestamp is required'),
      check('sanction_amount')
        .notEmpty()
        .withMessage('sanction_amount is required'),
      check('tenure').notEmpty().withMessage('tenure is required'),
      check('last_name').notEmpty().withMessage('last_name is required'),
      check('appl_pan').notEmpty().withMessage('appl_pan is required'),
      check('gender').notEmpty().withMessage('gender is required'),
      check('appl_phone').notEmpty().withMessage('appl_phone is required'),
      check('resi_addr_ln1')
        .notEmpty()
        .withMessage('resi_addr_ln1 is required'),
      check('city').notEmpty().withMessage('city is required'),
      check('state').notEmpty().withMessage('state is required'),
      check('pincode').notEmpty().withMessage('pincode is required'),
      check('monthly_income')
        .notEmpty()
        .withMessage('monthly_income is required'),
      check('product_type_code')
        .notEmpty()
        .withMessage('product_type_code is required'),
    ],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const loan_app_id = req.body?.loan_app_id;
        const data = {
          enquiry_purpose: req.body?.enquiry_purpose,
          enquiry_stage: req.body?.enquiry_stage,
          bureau_type: req.body?.bureau_type,
          dscr: parseInt(req.body?.dscr),
          consent: req.body?.consent,
          consent_timestamp: req.body?.consent_timestamp,
          product_type_code: req.body?.product_type_code,
          request_id_a_score: req.body?.request_id_a_score,
          request_id_b_score: req.body?.request_id_b_score,
          interest_rate: parseFloat(req.body?.interest_rate),
          ceplr_cust_id: req.body?.ceplr_cust_id,
          sanction_amount: parseFloat(req.body?.sanction_amount),
          tenure: parseInt(req.body?.tenure),
          first_name: req.body?.first_name,
          middle_name: req.body?.middle_name ? req.body?.middle_name : ' ',
          last_name: req.body?.last_name,
          dob: req.body?.dob,
          appl_pan: req.body?.appl_pan,
          gender: req.body?.gender,
          appl_phone: req.body?.appl_phone,
          address: req.body?.resi_addr_ln1,
          city: req.body?.city,
          loan_app_id: req.body?.loan_app_id,
          state: req.body?.state,
          pincode: req.body?.pincode.toString(),
          monthly_income: req.body?.monthly_income,
        };
        const config = {
          method: 'POST',
          url: process.env.SERVICE_MS_URL + '/api/co-lender-selector',
          headers: {
            'content-type': 'application/json',
            Authorization: req.headers['authorization'],
          },
          data: JSON.stringify(data),
        };
        const _selectorResponse = await axios(config);
        let is_submitted = false;
        if (_selectorResponse.data.status === 'success') {
          is_submitted = true;
        }

        const _selectorResp = {
          is_submitted: is_submitted,
          co_lender_shortcode: _selectorResponse.data.co_lender_shortcode,
          co_lender_assignment_id:
            _selectorResponse.data.co_lender_assignment_id,
          co_lender_name: _selectorResponse.data.co_lender_full_name,
        };
        const _selectorData =
          await selectorSchema.findIfExistByLId(loan_app_id);
        if (_selectorData) {
          await selectorSchema.updateByLID(loan_app_id, _selectorResp);
        }
        return res.status(200).send({
          status: 'SUCCESS',
          message: 'Updated Successfully',
        });
      } catch (error) {
        if (error.isAxiosError && !error.response.data.request_id) {
          return res.status(500).send({
            message: 'Service is unavailable, Please contact the administrator',
          });
        }
        if (error.isAxiosError) {
          return res.status(error.response.status).send(error.response.data);
        }
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/selector-basic-details/:loan_app_id',
    [check('loan_app_id').notEmpty().withMessage('Loan app id is required')],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const loan_app_id = req.params?.loan_app_id;
        const _selectorData =
          await selectorSchema.findIfExistByLId(loan_app_id);
        return res.status(200).json(_selectorData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post('/api/co-lender-loan', async (req, res) => {
    try {
      const colenderProfileData = req.body;
      const colenderProfileDataRes =
        await ColenderLoan.addOne(colenderProfileData);
      if (!colenderProfileDataRes)
        throw {
          message: 'Error while adding co_lender loan detail to database',
        };
      return res.send({
        message: 'Colender Loan Detail created successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/co-lender-loan-search', async (req, res) => {
    try {
      const co_lender_id = req.query.co_lender_id;
      const company_id = req.query.company_id;
      const product_id = req.query.product_id;
      const status = req.query.status;
      const min_co_lend_loan_amount = req.query.min_co_lend_loan_amount;
      const max_co_lend_loan_amount = req.query.max_co_lend_loan_amount;
      const from_created_at = req.query.from_created_at;
      const to_created_at = req.query.to_created_at;

      const data = {};
      co_lender_id && (data.co_lender_id = co_lender_id);
      company_id && (data.company_id = company_id);
      product_id && (data.product_id = product_id);
      status && (data.status = status);

      const co_lend_loan_amount = {};
      min_co_lend_loan_amount &&
        (co_lend_loan_amount.$gte = min_co_lend_loan_amount);
      max_co_lend_loan_amount &&
        (co_lend_loan_amount.$lte = max_co_lend_loan_amount);
      !(Object.keys(co_lend_loan_amount).length === 0) &&
        (data.co_lend_loan_amount = co_lend_loan_amount);

      const created_at = {};
      from_created_at && (created_at.$gte = from_created_at);
      to_created_at && (created_at.$lte = to_created_at);
      !(Object.keys(created_at).length === 0) && (data.created_at = created_at);

      const page = Number(req.query.page_no);
      const limit = Number(req.query.size);

      const colenderProfileData =
        await colenderProfileSchema.findByColenderId(co_lender_id);
      var colenderLoanData = [];
      var count = 0;

      if (
        process.env.NON_COLENDER_NAMES.includes(
          colenderProfileData?.co_lender_shortcode,
        ) &&
        product_id === ''
      ) {
        const nonColendersData = {};

        company_id && (nonColendersData.company_id = company_id);
        product_id && (nonColendersData.product_id = product_id);
        status && (nonColendersData.status = status);
        !(Object.keys(co_lend_loan_amount).length === 0) &&
          (nonColendersData.co_lend_loan_amount = co_lend_loan_amount);
        !(Object.keys(created_at).length === 0) &&
          (nonColendersData.created_at = created_at);

        var colenderLoanData1 = await ColenderLoan.findAll(nonColendersData);
        count = colenderLoanData1.length;
        colenderLoanData = await ColenderLoan.findAll(nonColendersData)
          .sort({ created_at: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .exec();
      } else {
        if (
          process.env.NON_COLENDER_NAMES.includes(
            colenderProfileData?.co_lender_shortcode,
          ) &&
          product_id
        ) {
          const nonColendersData = {};
          company_id && (nonColendersData.company_id = company_id);
          product_id && (nonColendersData.product_id = product_id);
          status && (nonColendersData.status = status);
          !(Object.keys(co_lend_loan_amount).length === 0) &&
            (nonColendersData.co_lend_loan_amount = co_lend_loan_amount);
          !(Object.keys(created_at).length === 0) &&
            (nonColendersData.created_at = created_at);

          var colenderLoanData1 = await ColenderLoan.findAll(nonColendersData);
          count = colenderLoanData1.length;
          colenderLoanData = await ColenderLoan.findAll(nonColendersData)
            .sort({ created_at: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();
        } else {
          colenderLoanData = await ColenderLoan.findByColenderData(data)
            .sort({ created_at: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();
          count = await ColenderLoan.countDocuments(data);
        }
      }
      var colenderLoan = [];
      for await (let obj of colenderLoanData) {
        if (obj.co_lender_id) {
          const colenderData = await colenderProfileSchema.findByColenderId(
            obj.co_lender_id,
          );
          colenderLoan.push({
            ...obj._doc,
            co_lender_name: colenderData.co_lender_name,
          });
        }
      }
      res.json({
        colenderLoan,
        count: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get(
    '/api/cbi-loan-search',
    [jwt.verifyToken, jwt.verifyUser, colenderHelper.checkMakerCheckerRole],
    [check('co_lender_id').notEmpty().withMessage('Colender name is required')],
    async (req, res) => {
      try {
        const error = validationResult(req);
        if (!error.isEmpty()) {
          throw {
            success: false,
            message: error.errors[0]['msg'],
          };
        }
        const co_lender_id = req.query.co_lender_id;
        const company_id = req.query.company_id;
        const from_created_at = req.query.from_created_at;
        const to_created_at = req.query.to_created_at;
        const page = Number(req.query.page_no);
        const limit = Number(req.query.size);
        let status = req.query.status;
        let assignee = req.query.assignee;

        const data = {};
        co_lender_id && (data.co_lender_id = co_lender_id);
        company_id && (data.company_id = company_id);
        status && (data.status = status);
        assignee && (data.assignee = assignee);

        const created_at = {};
        from_created_at && (created_at.$gte = from_created_at);
        to_created_at && (created_at.$lte = to_created_at);
        !(Object.keys(created_at).length === 0) &&
          (data.created_at = created_at);
        let colenderAllLoans;
        let colenderLoans;
        if (req.userRole) {
          if (req.userRole == 'checker1Role') {
            data['$and'] = [{ 'sync_status.maker.status': { $exists: true } },{ 'assignee': { $exists: true } }];
            if (status.toLowerCase() == 'new') {
              data['sync_status.maker'] = {
                $exists: true,
                $not: { $size: 0 },
                $elemMatch: {
                  status: { $in: ['Approved', 'Rejected'] },
                },
              };
             // data['$or'] = [{ 'sync_status.checker1.status': { $exists: false } },{ 'sync_status.checker2.status': { $exists: false } }];
            }
            if(status.toLowerCase()=="hold")
            {
              data['$and'] = [{ 'sync_status.checker2.status': { $exists: false } }];
                data['sync_status.checker1'] = {
                  $exists: true,
                  $not: { $size: 0 },
                  $elemMatch: {
                    status: { $in: ['Hold'] },
                  },
                };

            }
          } else if (req.userRole == 'checker2Role') {
            data['$and'] = [{ 'assignee': { $exists: true } },{ 'sync_status.maker.status': { $exists: true } },{ 'sync_status.checker1.status': { $exists: true } }];
            if (status.toLowerCase() == 'new') {
              data['$and'] = [
                {
                  'sync_status.checker1': {
                    $exists: true,
                    $not: { $size: 0 },
                    $elemMatch: {
                      status: { $in: ['Request_Sent'] },
                    }, // Check if 'status' is "approved" or "rejected"
                  },
                },
              ];
            }
            if(status.toLowerCase()=="hold")
            {
             // data['$and'] = [{ 'sync_status.checker2.status': { $exists: false } }];
                data['sync_status.checker2'] = {
                  $exists: true,
                  $not: { $size: 0 },
                  $elemMatch: {
                    status: { $in: ['Hold'] },
                  },
                };
              
            }
          } else if (req.userRole == 'makerRole') {
            if (assignee && assignee.toLowerCase() == 'maker' && status.toLowerCase()=="new") {
              delete data.assignee;
              data['$or'] = [
                    {
                      assignee: {
                        $exists: false,
                      },
                    },
                   { assignee: 'Maker' },
                  ]
            }
          }
          colenderAllLoans = await cbiProfileSchema.find({
            ...data,
          });
          colenderLoans = await cbiProfileSchema
            .find({
              ...data,
            })
            .sort({ created_at: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();
        } else {
          colenderAllLoans = await cbiProfileSchema.findAll(data);
          colenderLoans = await cbiProfileSchema
            .findByColenderData(data)
            .sort({ created_at: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();
        }
        let colenderLoan = [];
        for await (let ele of colenderLoans) {
          colenderLoan.push(ele);
        }
        let count = 0;
        count = colenderAllLoans?.length;
        res.json({
          colenderLoan,
          count: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/co-lender-loan-decision',
    [
      check('loan_id').notEmpty().withMessage('Loan Id is required'),
      check('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Approved', 'Rejected', 'Hold', 'Request_Sent'])
        .withMessage(
          'Please enter valid status i.e. Approved/Rejected/Hold/Request_Sent.',
        ),
      check('remarks').notEmpty().withMessage('Comment is required'),
      //check('user_id').notEmpty().withMessage('user_id is required'),
    ],
    colenderHelper.validatePayload,
    colenderHelper.validateUserRoleColenderStatusUpdate,
    colenderHelper.CBILoanExist,
    colenderHelper.validateLoanStatus,
    async (req, res) => {
      try {
        const { loan_id, status, remarks, username } = req.body;
        const loanExist = req.loanExist;
        const userData = req.userData;
        const statusUpdateAllowedArray = ['Approved', 'Rejected', 'Hold'];
        const role = req.userRole;
        let user;

        //Prepare data to update in collection

        if (role == 'makerRole') {
          user = 'maker';
          if (status.toLowerCase() == 'hold') {
            assignee = 'Maker';
          } else if (
            status.toLowerCase() == 'rejected' ||
            status.toLowerCase() == 'approved'
          ) {
            assignee = 'Checker1';
          }
        } else if (role == 'checker1Role') {
          user = 'checker1';
          if (
            status.toLowerCase() == 'hold' ||
            status.toLowerCase() == 'approved' ||
            status.toLowerCase() == 'rejected'
          ) {
            assignee = 'Checker1';
          } else if (status.toLowerCase() == 'request_sent') {
            assignee = 'Checker2';
          }
        } else if (role == 'checker2Role') {
          user = 'checker2';
          assignee = 'Checker2';
        } else {
          user = '';
        }

        const newEntry = {
          comment: remarks,
          status,
          updated_by: userData.username,
        };

        let syncStatus = loanExist.sync_status ? loanExist.sync_status : {};
        if (!syncStatus[user]) {
          syncStatus[user] = [];
        }
        // Append the new entry to the syncStatus data
        if (syncStatus[user]) {
          syncStatus[user].push(newEntry);
        } else {
          syncStatus[user] = [newEntry];
        }
        //Update the sync status in cbi_loans collection
        const updateLoanSyncStatus =
          await cbiProfileSchema.modifyColenderLoanData(loan_id, {
            assignee,
            sync_status: syncStatus,
          });

        if (!updateLoanSyncStatus)
          throw {
            success: false,
            message: 'Error while updating colender case status.',
          };

        //condition to update actual status
        let updateStatus =
          ((user == 'checker1' || user == 'checker2') &&
            statusUpdateAllowedArray.includes(status)) ||
          (user == 'maker' && status == 'Hold')
            ? true
            : false;
        //update the actual status in cbi_loans collection.
        if (updateStatus) {
          const updateLoanStatus = await cbiProfileSchema.updateColenderLoan(
            loan_id,
            status,
            remarks,
            Date.now(),
            user.username,
          );
          if (!updateLoanStatus)
            throw {
              success: false,
              message: 'Error while updating loan status.',
            };
        }
        if (
          user == 'maker' &&
          (status.toLowerCase() == 'approved' ||
            status.toLowerCase() == 'rejected') &&
            loanExist?.status.toLowerCase() == 'hold'
        ) {
          await cbiProfileSchema.findOneAndUpdate(
            {
              loan_id: loan_id,
            },
            { status: 'New' },
          );
        } else if (
          user == 'checker1' &&
          status.toLowerCase() == 'request_sent' &&
          loanExist?.status.toLowerCase() == 'hold'
        ) {
          await cbiProfileSchema.findOneAndUpdate(
            {
              loan_id: loan_id,
            },
            { status: 'New' },
          );
        }

        if (
          (user == 'checker1' || user == 'checker2') &&
          status.toUpperCase() === 'APPROVED'
        ) {
          const colenderShortCode = (
            await cbiProfileSchema.findShortCode(loan_id)
          )?.co_lender_shortcode;
          const adapterTriggerData = {
            loan_id: loan_id,
            co_lender_shortcode: colenderShortCode,
          };
          const adapterUrl = process.env.CBI_LOAN_DECISION_URL;
          axios.post(adapterUrl, JSON.stringify(adapterTriggerData), {
            headers: {
              Authorization: `Basic ${process.env.CBI_LOAN_DECISION_API_AUTHORIZATION}`,
              'Content-Type': 'application/json',
            },
          });
        }

        //Send the mail
        const mailResponse = await colenderHelper.ColenderStatusUpdateMail(
          user,
          req,
          res,
        );
        if (mailResponse && !mailResponse.success) throw { mailResponse };

        /*
        const isApproved =
          (
            await cbiProfileSchema.findIfApproved(loan_id)
          )?.status?.toUpperCase() === 'HOLD';

        const colenderShortCode = (
          await cbiProfileSchema.findShortCode(loan_id)
        )?.co_lender_shortcode;
        const adapterTriggerData = {
          loan_id: loan_id,
          co_lender_shortcode: colenderShortCode,
        };
        const adapterUrl = process.env.CBI_LOAN_DECISION_URL;

        if (!isApproved) {
          await cbiProfileSchema.updateColenderLoan(
            loan_id,
            status,
            remarks,
            Date.now(),
            username,
          );
        }
        */

        /*
        if (isApproved) {
          const _prevStatus = (await cbiProfileSchema.findIfApproved(loan_id))
            ?.status;
          const _prevRemarks = (await cbiProfileSchema.findIfApproved(loan_id))
            ?.remarks;
          await cbiProfileSchema.modifyColenderLoan(
            loan_id,
            _prevStatus,
            status,
            _prevRemarks,
            remarks,
            Date.now(),
            username,
          );
        }
        */

        return res.status(200).send({
          message: 'success',
        });
      } catch (error) {
        console.log('error=========', error);
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/da-approval',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const _data = req.body;
        const _query = {
          loan_id: _data.loan_id,
        };
        const _approvalDetails = {
          approve_for_da: _data.approve_for_da,
          approve_for_da_date: _data.approve_for_da_date,
          approved_by: _data.approved_by,
          approved_da: _data.approved_da,
        };
        await _borrowerInfoSchema.findOneAndUpdate(_query, _approvalDetails);
        return res.status(200).send({
          message: 'success',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  // fetch data from offer details schema with loan_app_id
  app.get('/api/offer-details-data/:loan_app_id', async (req, res) => {
    try {
      const { loan_app_id } = req.params;
      const offerDetails = await offerDetailsSchema.getByLoanAppId(loan_app_id);

      if (!offerDetails)
        throw {
          success: false,
          message: 'Offer details not found against loan_app_id.',
        };
      return res.status(200).send({
        success: true,
        data: JSON.parse(JSON.stringify(offerDetails)),
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get(
    '/api/download-all-document/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const loan_id = req.params.loan_id;
        const colenderLoan = await cbiProfileSchema.getByLID(loan_id);

        if (!colenderLoan?.s3_url)
          throw {
            success: false,
            message: 'No record found for co-lender documents.',
          };
        const url = colenderLoan.s3_url;
        const signedUrl = await getSignedUrlForCoLending(url);
        return res.status(200).send(signedUrl);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const bodyParser = require('body-parser');
const jwt = require('../../../util/jwt.js');
const {
  handleGetRequest,
  handlePostRequest,
  handleDeleteRequest,
} = require('../../../util/axios-helper.js');
const { validationResult, oneOf, body, check } = require('express-validator');
const SingleDataTranslation = require('../../../models/single_data_translation-schema');
const { default: axios } = require('axios');
const { handleTokenGeneration } = require('../../../util/nach-helper.js');
const { findLoanDetailsForNach, updateNachDetailsInBIC } = require('../../../util/borrower-helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  // app.post(
  //   '/api/enach-status',
  //   oneOf([body('MndtReqId').notEmpty(), body('Loan_app_id').notEmpty()], {
  //     message: 'Either MndtReqId or Loan_app_id should be present',
  //   }),
  //   [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany],
  //   async (req, res) => {
  //     try {
  //       const error = validationResult(req);
  //       if (!error.isEmpty()) {
  //         return res.status(400).send({ error: error.errors[0]['msg'] });
  //       }

  //       const enachDetails = req.body.MndtReqId
  //         ? await EnachDetails.getByRequestId(req.body.MndtReqId)
  //         : await EnachDetails.getByLoanAppId(req.body.Loan_app_id);

  //       var response = {};

  //       if (
  //         process.env.ENACH_STATUS_FOR_PARTNER_SUCCESS.includes(
  //           enachDetails?.status,
  //         )
  //       ) {
  //         response = await generateEnachStatusResponse(
  //           enachDetails,
  //           'Success',
  //           'Your registration has been successful',
  //         );
  //       } else if (
  //         process.env.ENACH_STATUS_FOR_PARTNER_FAIL.includes(
  //           enachDetails?.status,
  //         )
  //       ) {
  //         response = await generateEnachStatusResponse(
  //           enachDetails,
  //           'Fail',
  //           `Your registration has been failed due to ${enachDetails?.status_desc}`,
  //         );
  //       } else {
  //         response = await generateEnachStatusResponse(null, 'Pending', '');
  //       }
  //       return res.status(200).send(response);
  //     } catch (err) {
  //       return res.status(500).send(err);
  //     }
  //   },
  // );

  app.post(
    '/api/enach-detail-by-requestId',
    [jwt.verifyToken, jwt.verifyUser],
    [check('user_id').notEmpty().withMessage('User ID is required'),
    check('request_id').notEmpty().withMessage('Request Id is required')],
    async (req, res, next) => {
      try {
        const tokenData = {
          company_id: req?.body?.company_id || '',
          user_id: req?.body?.user_id,
        };
        const { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          tokenData,
        );

        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        const payloadData = {
          search_by: req.body.request_id,
          page: 1,
          limit: 1,
        };
        const options = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        const enachDataByReqId = await handlePostRequest(
          process?.env?.ENACH_SEARCH_ENDPOINT,
          payloadData,
          options,
        );
        const nachData =
          enachDataByReqId?.result?.data?.data['data-lst'].length > 0
            ? enachDataByReqId?.result?.data?.data['data-lst'][0]
            : {};
        if (!nachData) {
          throw {
            success: false,
            message: 'Error getting Enach Details',
          };
        }
        return res.status(200).send({
          data: nachData,
          success: true,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.patch('/api/enach-bic-status', [jwt.verifyToken], async (req, res) => {
    try {
      const loanId = req.body?.externalRefNum;
      const isLoanIdExists = await findLoanDetailsForNach(loanId);
      if (!isLoanIdExists) {
        return res.status(200).send({
          status: 'fail',
          message: 'Loan Id does not exists',
        });
      }
      const enachData = {
        subscription_umrn: req.body.mandateId,
        subscription_id: req.body.requestId,
        subscription_account_no: req.body.accountNo,
        subscription_amount: req.body.amount,
        subscription_start_date: req.body.startDate,
        subscription_end_date: req.body.endDate,
        subscription_status: req.body.status,
        subscription_customer_name: req.body.customerName,
        subscription_remarks: req.body.remarks,
        subscription_created_at: req.body.createdAt,
        subscription_corporate_name: req.body.corporateName,
        subscription_purpose_of_mandate: req.body.purposeOfMandate,
        subscription_customer_mobile_no: req.body.customerMobileNo,
        subscription_sponsor_bank_mandate_id: req.body.sponsorBankMandateId,
      };
      await updateNachDetailsInBIC(enachData, {
        loan_id: loanId,
      });
      return res.status(200).send({
        status: 'success',
        message: 'Updated Successfully',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/enach-get-generated-token',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyTokenSkipCIDPIDPost,  jwt.verifyCompany],
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
        ],
    async (req, res) => {
      try {
        const tokenData = {
          company_id: req?.body?.company_id || '',
          user_id: req?.body?.user_id,
          is_enable_expiry: false,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          tokenData,
        );
        const token = result?.data?.data?.token;
        if (!token) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        return res.status(200).send({
          data: token,
          success: true,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.response?.data?.errors[0],
        });
      }
    },
  );

  app.post(
    '/api/enach-create-presentment',
    [jwt.verifyToken, jwt.verifyUser],
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
      check('company_id_subscription').notEmpty().withMessage('Company ID of subscription is not available'),
      check('mandate_id').notEmpty().withMessage('Mandate ID is required'),
      check('amount').notEmpty().withMessage('Amount is required'),
      check('scheduled_on')
        .notEmpty()
        .withMessage('Scheduled on date is required'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const tokenData = {
          company_id: req?.body?.company_id || '',
          user_id: req?.body?.user_id,
        };

        const { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          tokenData,
        );

        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        const options = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        let data = {
          request_id: req?.body?.request_id,
          mandate_id: req?.body?.mandate_id,
          amount: req?.body?.amount,
          scheduled_on: req?.body?.scheduled_on,
          company_id: req?.body?.company_id_subscription,
          old_presentment_txn_id : req?.body.old_presentment_txn_id
        };
        const enachData = await handlePostRequest(
          process?.env?.ENACH_CREATE_PRESENTMENT_ENDPOINT,
          data,
          options,
        );
        return res.status(200).send({
          data: enachData?.result?.data?.data,
          success: true,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.response?.data?.errors[0],
        });
      }
    },
  );

  app.post(
    '/api/enach-transaction-details',
    [jwt.verifyToken, jwt.verifyUser],
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const data = {
          page: Number(req?.body?.page),
          limit: Number(req?.body?.rows_per_page),
          search_by: req?.body?.search_by,
          from_date: req?.body?.from_date || null,
          to_date: req?.body?.to_date || null,
          company_id: req?.body?.companyId || null,
          status: req?.body?.status || null,
        };
        const tokenData = {
          company_id: req?.body?.company_id || '',
          user_id: req?.body?.user_id,
        };
        const { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          tokenData,
        );
        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        const options = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        const transaction_data = await handlePostRequest(
          process?.env?.ENACH_TRANSACTION_DETAIL_ENDPOINT,
          data,
          options,
        );
        if (!transaction_data) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        return res.status(200).send({
          data: transaction_data?.result?.data?.data,
          count: transaction_data?.result?.data?.data?.["total-records"],
          suscess: true,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/enach-details',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyTokenSkipCIDPIDPost,
      jwt.verifyCompany,
    ],
    [check('user_id').notEmpty().withMessage('User ID is required')],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const tokenData = {
          company_id: req?.body?.company_id || '',
          user_id: req?.body?.user_id,
        };
        const { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          tokenData,
        );
        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        const options = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        const page = Number(req.body.page);
        const data = {
          page: Number(req.body.page),
          limit: Number(req.body.rowsPerPage),
          status: req.body.status === "" ? [] : req.body.status,
          from_date: req.body.fromDate === "" ? null : req.body.fromDate,
          to_date: req.body.toDate === "" ? null : req.body.toDate,
          company_id: req?.body?.company_id === "" ? null : req?.body?.company_id,
          search_by: req.body.searchBy,
        };
        const enachDetails = await handlePostRequest(
          process?.env?.ENACH_SEARCH_ENDPOINT,
          data,
          options,
        );
        const enachDetailsData = enachDetails?.result?.data?.data['data-lst'];
        const totalCount = enachDetails?.result?.data?.data['total-records'];
        return res
          .status(200)
          .send({
            enachDetailsData,
            count: totalCount,
            page: page,
            suscess: true,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  app.post(
    '/api/create-subscription',
    [jwt.verifyToken, jwt.verifyUser,jwt.verifyCompany],
    async (req, res) => {
      let data = req?.body?.payloadData;
      let dataForUser = req?.body?.userData;
      try {
        const { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          dataForUser,
        );
        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        const options = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        const isLoanIdPresent = await findLoanDetailsForNach(
          data?.external_ref_num
        );
        if (isLoanIdPresent === null || !isLoanIdPresent) {
          throw {
            success: false,
            message: 'Please enter valid External Reference Number',
          };
        }
        if(isLoanIdPresent?.company_id !== data?.company_id ){
          throw {
            success: false,
            message: 'Please enter External Reference Number corresponding to company id',
          };
        }
        const transaction_data = await handlePostRequest(
          process?.env?.ENACH_CREATE_SUBSCRIPTION_ENDPOINT,
          data,
          options,
        );      
        let requestId = transaction_data?.result?.data?.data?.request_id;
        if (!requestId) {
          throw {
            success: false,
            message: 'Error while creation of registration',
          };
        }
        let nachURL= "";
        if (requestId) {
          const URL = await handleGetRequest(
            `${process?.env?.ENACH_SUBSCRIPTION_WEBURL_ENDPOINT}/${requestId}`,
            options,
          );
          nachURL = URL?.result?.data?.data?.webUrl;
          if(!nachURL){
            throw {
              success: false,
              message: 'Error while creation of URL',
            };  
          }
        }
        return res.status(200).send({
          data: requestId,
          url: nachURL,
          success: true,
          message: 'Subscription requested successfully',
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Subscription creation failed',
        });
      }
    },
  );

  app.post(
    '/api/nach-transaction-details',
    jwt.verifyToken,
    jwt.verifyUser,
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
      check('transactionID')
        .notEmpty()
        .withMessage('Transaction ID is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const txn_id = req.body.transactionID;
        let payload = {
          company_id: data?.company_id || '',
          user_id: data?.user_id,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          payload,
        );

        const generatedTokenHeader = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        ({ result } = await handleGetRequest(
          `${process?.env?.ENACH_CREATE_PRESENTMENT_ENDPOINT}/${txn_id}`,
          generatedTokenHeader,
        ));
        if (!result) {
          throw {
            success: false,
            message: 'Error getting Transaction Details',
          };
        }
        return res.status(200).send({
          sucess: true,
          data: result?.data?.data,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error getting Transaction details',
        });
      }
    },
  );

  app.post(
    '/api/nach-suspend-registration',
    jwt.verifyToken,
    jwt.verifyUser,
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
      check('registrationId')
        .notEmpty()
        .withMessage('Registration ID is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const registrationId = req.body.registrationId;
        let payload = {
          company_id: data?.company_id || '',
          user_id: data?.user_id,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          payload,
        );

        const generatedTokenHeader = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        ({ result } = await handleGetRequest(
          `${process?.env?.ENACH_SUSPEND_REGISTRATION_ENDPOINT}/${registrationId}`,
          generatedTokenHeader,
        ));
        if (!result) {
          throw {
            success: false,
            message: 'Error suspending registration',
          };
        }
        return res.status(200).send({
          sucess: true,
          data: result?.data?.data,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error suspending registration',
        });
      }
    },
  );

  // cancel subscription
  app.post(
    '/api/nach-cancel-registration',
    jwt.verifyToken,
    jwt.verifyUser,
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
      check('registrationId')
        .notEmpty()
        .withMessage('Registration ID is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const registrationId = req.body.registrationId;
        let payload = {
          company_id: data?.company_id || '',
          user_id: data?.user_id,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          payload,
        );

        const generatedTokenHeader = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        ({ result } = await handleDeleteRequest(
          `${process?.env?.ENACH_CREATE_SUBSCRIPTION_ENDPOINT}/${registrationId}`,
          generatedTokenHeader,
        ));
        if (!result) {
          throw {
            success: false,
            message: 'Error suspending registration',
          };
        }
        return res.status(200).send({
          sucess: true,
          data: result?.data?.data,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error suspending registration',
        });
      }
    },
  );

  app.post(
    '/api/nach-revoke-suspend-registration',
    jwt.verifyToken,
    jwt.verifyUser,
    [
      check('user_id').notEmpty().withMessage('User ID is required'),
      check('registrationId')
        .notEmpty()
        .withMessage('Registration ID is required'),
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const registrationId = req.body.registrationId;
        let payload = {
          company_id: data?.company_id || '',
          user_id: data?.user_id,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          payload,
        );

        const generatedTokenHeader = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };
        ({ result } = await handleGetRequest(
          `${process?.env?.ENACH_REVOKE_SUSPEND_REGISTRATION_ENDPOINT}/${registrationId}`,
          generatedTokenHeader,
        ));
        if (!result) {
          throw {
            success: false,
            message: 'Error revoking suspended registration',
          };
        }
        return res.status(200).send({
          sucess: true,
          data: result?.data?.data,
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error revoking suspended registration',
        });
      }
    },
  );

  app.post(
    '/api/enach-purpose',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const singleDataTranslationData =
          await SingleDataTranslation.getAllDataByType('enach_purpose');
        if (!singleDataTranslationData)
          throw {
            success: false,
            message: 'No record found for Translation.',
          };
        return res.status(200).send({
         data :  singleDataTranslationData,
         success : true
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error getting mandate purpose details',
        });
      }
    },
  );

  app.get(
    '/api/nach-live-bank-status',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        let payload = {
          user_id: req.user._id,
        };

        let { result } = await handleTokenGeneration(
          process?.env?.ENACH_TOKEN_GENERATE_ENDPOINT,
          payload,
        );

        const generatedTokenHeader = {
          headers: {
            Authorization: `Bearer ${result?.data?.data?.token}`,
            'Content-Type': 'application/json',
          },
        };

        ({ result } = await handleGetRequest(
          process?.env?.ENACH_LIVE_BANK_DETAILS,
          generatedTokenHeader,
        ));

        if (!result) {
          throw {
            success: false,
            message: 'Unable to fetch live bank details',
          };
        }

        return res.status(200).send({
          sucess: true,
          data: result?.data?.data,
        });

      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error fetching live bank details',
        });
      }
    },
  );

  app.get(
    '/api/loan-details-nach/:loanId',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const loanId = req.params.loanId;
        const data = await findLoanDetailsForNach(loanId);

        if (!data) {
          throw {
            success: false,
            message: 'Unable to fetch loan details for nach',
          };
        }

        if (req.user.company_id && req.user.company_id !== data?.company_id) {
          throw {
            success: false,
            message: 'company id mismatch',
          };
        }

        return res.status(200).send({
          sucess: true,
          data,
        });

      } catch (error) {
        return res.status(400).send({
          success: false,
          message: error?.message || 'Error while fetching loan details for nach',
        });
      }
    },
  );

};

const generateEnachStatusResponse = async function (
  enachDetails,
  status,
  remark,
) {
  const response = {
    Status: status,
    Remark: remark,
  };

  return enachDetails
    ? { ...response, ...(await generateEnachDetails(enachDetails)) }
    : response;
};

var generateEnachDetails = async function (enachDetails) {
  var result = {
    CreDtTm: enachDetails.created_at,
    CatCode: enachDetails.purpose_of_mandate,
    CatDesc: (
      await SingleDataTranslation.getValueByTypeAndKey(
        'enach_purpose',
        enachDetails.purpose_of_mandate,
      )
    ).value,
    Frqcy: (
      await SingleDataTranslation.getValueByTypeAndKey(
        'enach_frequency',
        enachDetails.emi_frequency,
      )
    ).value,
    MndtReqId: enachDetails.request_id,
    Mndt_Type: 'DEBIT',
    SeqTp: 'RCUR',
    FrstColltnDt: enachDetails.start_date,
    FnlColltnDt: enachDetails.end_date,
    Acct_Type: enachDetails.account_type,
    Mobile:
      enachDetails.customer_mobile_code + ' ' + enachDetails.customer_mobile_no,
    Email: enachDetails.customer_email_id,
    Pan: enachDetails.customer_pan,
  };

  if (enachDetails.customer_telephone_no) {
    result.Phone =
      enachDetails.customer_telephone_code +
      ' ' +
      enachDetails.customer_telephone_no;
  }

  if (enachDetails.amount_type === 'FIXED_AMOUNT') {
    result.ColltnAmt = enachDetails.amount.toString();
  } else if (enachDetails.amount_type === 'MAXIMUM_AMOUNT') {
    result.MaxAmt = enachDetails.amount.toString();
  }

  return result;
};

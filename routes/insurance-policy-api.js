const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const { getAge } = require('../utils/kyc-services.js');
const moment = require('moment');
const axios = require('axios');
const insurancePolicyHelper = require('../util/insurance-policy-helper.js');
const s3Helper = require('../util/s3helper.js');
const borrowerHelper = require('../util/borrower-helper.js');
const InsuranceMISSchema = require('../models/insurance-mis-schema.js');
const BorrowerInsuranceSchma = require('../models/borrower-insurance-details-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const PolicyPremiumRateSchema = require('../models/insurance-base-policy-premium-rate-schema.js');
let reqUtils = require('../util/req.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const fireGetPdfDetails = async (req, res, next) => {
    try {
      const loan_id = req.body.products[0]?.policyDetails.loanAccountNumber;
      //******************* Call to generate policy pdf api.*********************
      //Store request to s3
      req.apiName = 'GET-POLICY-PDF';
      req.vendor_name = 'GO-DIGIT';
      storeRequest = await s3Helper.storeRequestDataToS3(req);
      const PolicyPDFRes = callFetchPolicyPDFApi(
        req,
        res,
        req.policyDetailResp.data[0].policyNumber,
      );
      //Store response to s3
      storeResponse = await s3Helper.storeResponseDataToS3(req);
      let schedule_path = req.resS3Url;
      updateInsuranceDataObj = {
        schedule_path,
      };
      updateInsuranceMis = await InsuranceMISSchema.updateByLID(
        loan_id,
        updateInsuranceDataObj,
      );
    } catch (error) {
      return res.staus(400).send(error);
    }
  };

  //API to fetch policy details
  app.get(
    '/api/policy-details/:partner_ref_no',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    insurancePolicyHelper.validateGetPolicyDetailPayload,
    borrowerHelper.isLoanExistByLID,
    s3Helper.storeRequestToS3,
    insurancePolicyHelper.callGetPolicyDetailApi,
    s3Helper.storeResponseToS3,
    async (req, res) => {
      try {
        if (!req.responseData)
          throw {
            success: false,
            message: req.responseData,
          };
        //Update policy details in borrower insurance details schema.
        const insuranceUpdateData = {
          policy_number: req.responseData.data[0].policyNumber,
        };
        const updateborrowerInsuranceDetails =
          await BorrowerInsuranceSchma.updateByLID(
            req.body.loan_id,
            insuranceUpdateData,
          );
        if (!updateborrowerInsuranceDetails)
          throw {
            success: false,
            message: 'Error while updating borrower insurance details.',
          };
        return res.status(200).send({
          success: true,
          data: req.responseData.data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to get policy pdf
  app.get(
    '/api/policy-pdf/:policy_number',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    insurancePolicyHelper.validateGetPolicyPdfPayload,
    borrowerHelper.isLoanExistByLID,
    s3Helper.storeRequestToS3,
    insurancePolicyHelper.callGetPolicyPdfApi,
    s3Helper.storeResponseToS3,
    async (req, res) => {
      try {
        if (!req.responseData)
          throw {
            success: false,
            message: req.responseData.data,
          };
        return res.status(200).send({
          success: true,
          data: req.responseData.data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to fetch sourcing partner policy details
  app.get(
    '/api/sourcing-partner-policy-details/:loan_id/:policy_number',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_id, policy_number } = req.params;
        //Validate if loan exist by loan_id
        const loanData = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;

        //Check record exist by loan_id and policy_number
        const insuraceRecord =
          await InsuranceMISSchema.findByLIDAndPolicyNumber(
            loan_id,
            policy_number,
          );
        if (!insuraceRecord)
          throw {
            success: false,
            message:
              'No record found against provided loan_id and policy_number',
          };
        if (insuraceRecord) {
          //Prepare response data and return
          let respObj = {
            loan_id: insuraceRecord.loan_id,
            master_policy_number: insuraceRecord.master_policy_number,
            policy_number: insuraceRecord.policy_number,
            policy_status: insuraceRecord.policy_status
              ? insuraceRecord.policy_status
              : '',
            insurance_provider: insuraceRecord.insurance_provider,
            policy_start_date: insuraceRecord.policy_start_date
              ? moment(insuraceRecord.policy_start_date).format('YYYY-MM-DD')
              : '',
            policy_end_date: insuraceRecord.policy_end_date
              ? moment(insuraceRecord.policy_end_date).format('YYYY-MM-DD')
              : '',
            policy_issuance_date: insuraceRecord.policy_issuance_date
              ? moment(insuraceRecord.policy_issuance_date).format('YYYY-MM-DD')
              : '',
            policy_premium: insuraceRecord.policy_premium
              ? insuraceRecord.policy_premium
              : '',
            net_premium: insuraceRecord.net_premium
              ? insuraceRecord.net_premium
              : '',
            cgst: insuraceRecord.cgst ? insuraceRecord.cgst : '',
            sgst: insuraceRecord.sgst ? insuraceRecord.sgst : '',
            igst: insuraceRecord.igst ? insuraceRecord.igst : '',
            ugst: insuraceRecord.ugst ? insuraceRecord.ugst : '',
            schedule_path: insuraceRecord.schedule_path
              ? insuraceRecord.schedule_path
              : '',
          };

          return res.status(200).send({
            success: true,
            data: respObj,
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //API to issue policy
  app.post(
    '/api/issue-policy',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    insurancePolicyHelper.validatePayload,
    borrowerHelper.isLoanExistByLID,
    s3Helper.storeRequestToS3,
    insurancePolicyHelper.callInsurancePolicyIssueApi,
    s3Helper.storeResponseToS3,
    async (req, res) => {
      try {
        if (!req.responseData)
          throw {
            success: false,
            message: req.responseData,
          };
        // Update data in borrower_insurance_details schema.
        const insuranceData = {
          external_reference_number:
            req.responseData.data[0].externalReferenceNumber,
          product_key: req.responseData.data[0].productKey,
          policy_start_date: req.body.products[0]?.policyDetails.startDate,
          policy_end_date: req.body.products[0]?.policyDetails.endDate,
        };
        const updateborrowerInsuranceDetails =
          await BorrowerInsuranceSchma.updateByLID(
            req.body.loan_id,
            insuranceData,
          );
        if (!updateborrowerInsuranceDetails)
          throw {
            success: false,
            message: 'Error while updating borrower insurance details.',
          };
        return res.status(200).send({
          success: true,
          message: req.responseData.data[0].status.message,
          data: req.responseData.data,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //Issue policy API for sourcing partner.
  app.post(
    '/api/sourcing-partner-issue-policy',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const data = req.body;
        const loan_id = data.products[0]?.policyDetails.loanAccountNumber;
        const totalcollectedPremium =
          data.products[0]?.policyDetails.totalCollectedPremium;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        // Check loan exist in the system by loan_id
        const loanData = await BorrowerinfoCommon.findOneWithKLID(loan_id);
        if (!loanData)
          throw {
            success: false,
            message:
              'No records found against provided loan id in borrowerinfo.',
          };
        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, loanData.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;
        req.loanData = loanData;
        //Fetch lead data.
        const leadResp = await LoanRequestSchema.findIfExists(
          req.loanData.loan_app_id,
        );
        if (!leadResp)
          throw {
            success: false,
            message: 'No lead found against provided loan_app_id.',
          };
        req.leadData = leadResp;
        let leadsData = JSON.parse(JSON.stringify(req.leadData));
        let borrowerData = JSON.parse(JSON.stringify(req.loanData));
        const lmsPostData = await Object.assign(leadsData, borrowerData);
        req.lmsPostData = lmsPostData;
        //Validate totalcollectedPremium passed by the partner is same as the insurance_amount  from borrowerinfo_common table.
        if (
          Number(totalcollectedPremium) !==
          Math.round(
            (Number(req.loanData.insurance_amount) / 1.18 + Number.EPSILON) *
              100,
          ) /
            100
        )
          throw {
            success: false,
            message:
              'Exception: Policy premium mismatch between Loan Request and Issue Policy Request.',
          };
        //Calculate insurance premium at base pricing.
        const insurancePremiumAtBasePricing =
          await calculateInsurancePremiumAtBasePricing(req, lmsPostData);
        if (!insurancePremiumAtBasePricing.success)
          throw { insurancePremiumAtBasePricing };

        //******************* Call to the issue policy api.*********************
        //Store request to s3
        req.apiName = 'ISSUE-POLICY';
        req.vendor_name = 'GO-DIGIT';
        let storeRequest = await s3Helper.storeRequestDataToS3(req);

        const issuePolicyRes = await callInsurancePolicyIssueApi(req, res);
        //Store response to s3
        let storeResponse = await s3Helper.storeResponseDataToS3(
          req,
          req.issuePolicyResp.data,
        );
        let issue_policy_s3_url = req.resS3Url;

        //Calculate gst on total collected premium.
        if (req.leadData.state.toUpperCase() === 'HARYANA') {
          igst = 0;
          cgst =
            Math.round(
              ((Number(totalcollectedPremium) * 0.18) / 2 + Number.EPSILON) *
                100,
            ) / 100;
          sgst =
            Math.round(
              ((Number(totalcollectedPremium) * 0.18) / 2 + Number.EPSILON) *
                100,
            ) / 100;
        } else {
          cgst = 0;
          sgst = 0;
          igst =
            Math.round(
              (Number(totalcollectedPremium) * 0.18 + Number.EPSILON) * 100,
            ) / 100;
        }
        const recordInsuranceData = {
          master_policy_number:
            data.products[0]?.policyDetails.masterPolicyNumber,
          loan_id: data.products[0]?.policyDetails.loanAccountNumber,
          loan_app_id: req.loanData.loan_app_id,
          company_id: req.company._id,
          company_name: req.company.name,
          product_id: req.product._id,
          product_name: req.product.name,
          external_reference_number:
            req.issuePolicyResp.data[0].externalReferenceNumber,
          product_key: req.issuePolicyResp.data[0].productKey,
          insurance_provider: 'Go Digit General Insurance Ltd',
          policy_start_date: data.products[0]?.policyDetails.startDate,
          policy_end_date: data.products[0]?.policyDetails.endDate,
          policy_issuance_date: Date.now(),
          policy_premium:
            totalcollectedPremium * 1 +
            Math.round(
              (Number(totalcollectedPremium) * 0.18 + Number.EPSILON) * 100,
            ) /
              100,
          net_premium: totalcollectedPremium,

          gst_on_premium:
            Math.round(
              (Number(totalcollectedPremium) * 0.18 + Number.EPSILON) * 100,
            ) / 100,
          cgst: cgst,
          sgst: sgst,
          igst: igst,
          total_policy_premium_at_base_pricing:
            insurancePremiumAtBasePricing.total_policy_premium_at_base_pricing,
          gst_on_premium_at_base_pricing:
            insurancePremiumAtBasePricing.gst_on_premium_at_base_pricing,
          net_policy_premium_at_base_pricing:
            insurancePremiumAtBasePricing.net_policy_premium_at_base_pricing,
          issue_policy_s3_url: issue_policy_s3_url,
        };

        //Check record already exist against loanId.

        const insuranceMISDataExist =
          await InsuranceMISSchema.findByLoanId(loan_id);
        if (!insuranceMISDataExist) {
          // Record data in insurance mis table after calling issue policy api.
          const recordInsuranceDetails =
            await InsuranceMISSchema.addNew(recordInsuranceData);
        } else {
          let updateInsuranceDetails = await InsuranceMISSchema.updateByLID(
            loan_id,
            recordInsuranceData,
          );
        }

        //******************* Call to fetch policy details api.*********************
        //Store request to s3
        req.apiName = 'GET-POLICY';
        req.vendor_name = 'GO-DIGIT';
        storeRequest = await s3Helper.storeRequestDataToS3(req);
        const PolicyDetailsRes = await callFetchPolicyDetailsApi(
          req,
          res,
          req.issuePolicyResp.data[0].externalReferenceNumber,
        );
        //Store response to s3
        storeResponse = await s3Helper.storeResponseDataToS3(
          req,
          req.policyDetailResp.data,
        );
        let policy_details_s3_url = req.resS3Url;
        let updateInsuranceDataObj = {
          policy_status: req.policyDetailResp.data[0].status
            ? req.policyDetailResp.data[0].status
            : '',
          policy_details_s3_url: policy_details_s3_url,
          policy_number: req.policyDetailResp.data[0].policyNumber,
        };
        let updateInsuranceMis = await InsuranceMISSchema.updateByLID(
          loan_id,
          updateInsuranceDataObj,
        );
        const respObj = {
          success: true,
          externalReferenceNumber: req.issuePolicyResp.data[0]
            .externalReferenceNumber
            ? req.issuePolicyResp.data[0].externalReferenceNumber
            : '',
          policyNumber: req.policyDetailResp?.data[0]?.policyNumber
            ? req.policyDetailResp.data[0].policyNumber
            : '',
          schedulePath: req.policyPDFResp?.data?.schedulePath
            ? req.policyPDFResp.data.schedulePath
            : '',
          statusCode: 200,
          statusMessage: '',
        };
        return reqUtils.json(req, res, next, 200, {
          success: true,
          data: respObj,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    fireGetPdfDetails,
  );

  const callInsurancePolicyIssueApi = async (req, res) => {
    try {
      const payload = req.body;
      const apiUrl = `${process.env.INSURANCE_POLICY_ISSUE_URL}/issuePolicy`;
      const apiConfig = {
        method: 'post',
        url: apiUrl,
        headers: {
          Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      issuePolicyResp = await axios(apiConfig);
      req.issuePolicyResp = issuePolicyResp;
      return true;
    } catch (error) {
      if (error?.response?.statusText) {
        return res
          .status(400)
          .send({ success: false, message: error?.response?.statusText });
      }
      return res.status(400).send(error);
    }
  };

  const callFetchPolicyDetailsApi = async (req, res, partner_ref_no) => {
    try {
      const apiUrl = `${process.env.GET_POLICY_DETAIL_URL}/policyDetails?partnerRefNo=${partner_ref_no}`;
      const apiConfig = {
        method: 'get',
        url: apiUrl,
        headers: {
          Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };
      const policyDetailResp = await axios(apiConfig);
      req.policyDetailResp = policyDetailResp;
      return true;
    } catch (error) {
      return res.staus(400).send(error);
    }
  };

  const callFetchPolicyPDFApi = async (req, res, policyNumber) => {
    try {
      const apiUrl = `${process.env.GET_POLICY_DETAIL_URL}/regeneratePolicyPDF?policyNumber=${policyNumber}`;
      const apiConfig = {
        method: 'get',
        url: apiUrl,
        headers: {
          Authorization: `${process.env.INSURANCE_POLICY_ISSUE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };
      const policyPDFResp = await axios(apiConfig);
      req.policyPDFResp = policyPDFResp;
      return true;
    } catch (error) {
      return error;
    }
  };

  const calculateInsurancePremiumAtBasePricing = async (req, data) => {
    try {
      let insuranceFlag = req.product.insurance_charges;
      let loanTenureInMonths = 0;
      let gstOnPolicyPremium = 0;
      let policyPremiumIncGST = 0;

      data.tenure_type = data.tenure_type
        ? data.tenure_type
        : req.product.loan_tenure_type;
      data.tenure = data.tenure ? data.tenure : req.product.loan_tenure;

      // Condition1: Check insurance flag in product, if not then throw error "Exception: Insurance charge is not configured"
      if (!insuranceFlag)
        throw {
          success: false,
          message: 'Exception: Insurance charge is not configured',
        };
      let loanTenureInDays;
      // get tenure from the loan api convert it to the months
      if (data.tenure_type.toLowerCase() === 'month' && data.tenure) {
        loanTenureInMonths = data.tenure * 1;
      } else if (data.tenure_type.toLowerCase() === 'week' && data.tenure) {
        let loanTenureInDays = data.tenure * 1 * 7;
        loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
      } else if (
        data.tenure_type.toLowerCase() === 'fortnight' &&
        data.tenure
      ) {
        loanTenureInMonths = Math.ceil(data.tenure * 0.4602739726);
      } else {
        let loanTenureInDays = data.tenure;
        loanTenureInMonths = Math.ceil(loanTenureInDays / 30) * 1;
      }
      // Calculate age of the borrower using dob from lead data
      if (!data.dob) throw { success: false, message: 'dob is required' };
      const borrowerAge = await getAge(new Date(data.dob).getFullYear());
      //Using age and tenure determine the policy premium using Base Policy Premium Rate Sheet
      const policyPremiumByAge =
        await PolicyPremiumRateSchema.findByAge(borrowerAge);
      if (!policyPremiumByAge)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumObj = JSON.parse(JSON.stringify(policyPremiumByAge));
      delete policyPremiumObj.max_age;
      delete policyPremiumObj.min_age;
      const keys = Object.keys(policyPremiumObj);
      let tenureArray = [];
      keys.forEach((key) => {
        if (loanTenureInMonths == key * 1 || loanTenureInMonths < key * 1) {
          tenureArray.push(key);
        }
      });
      if (!tenureArray.length)
        throw {
          success: false,
          message: 'Exception: Requested policy configuration not found',
        };
      const policyPremiumByTenure = policyPremiumByAge[`${tenureArray[0]}`];
      //Calculate policy premium
      policyPremium =
        ((data.sanction_amount * 1) / 1000) * policyPremiumByTenure;
      //18% of GST should be applied on the above calculated policy premium amount to arrive at the Total premium inclusive of GST
      gstOnPolicyPremium =
        Math.round((policyPremium * 0.18 * 1 + Number.EPSILON) * 100) / 100;
      policyPremiumIncGST = policyPremium + gstOnPolicyPremium;
      policyPremiumIncGST =
        Math.round((policyPremiumIncGST * 1 + Number.EPSILON) * 100) / 100;
      return {
        success: true,
        total_policy_premium_at_base_pricing: policyPremiumIncGST,
        gst_on_premium_at_base_pricing: gstOnPolicyPremium,
        net_policy_premium_at_base_pricing:
          policyPremiumIncGST * 1 - gstOnPolicyPremium * 1,
      };
    } catch (error) {
      return error;
    }
  };
};

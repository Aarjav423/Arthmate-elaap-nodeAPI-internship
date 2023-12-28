bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const s3helper = require('../util/s3helper');
const jwt = require('../util/jwt');
const leadHelper = require('../util/lead');
const validate = require('../util/validate-req-body.js');
const AccessLog = require('../util/accessLog');
let reqUtils = require('../util/req.js');
const service = require('../services/mail/mail.js');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
const loanStatus = require('../util/loan-status');
const intrestDpdConfigRevision = require('../models/intrest-dpd-config-revision-schema.js');
const LOCCreditlimitSchema = require('../models/loc-credit-limit-schema.js');
const mails = require('../services/mail/genericMails.js');
const thirdPartyHelper = require('../util/thirdPartyHelper');
const calculation = require('../util/calculation');
const repayment = require('../util/repayment');
const kycServices = require('../utils/kyc-services.js');
const broadcastEvent = require('../util/disbursalApprovedEvent.js');
const ColenderProfile = require('../models/co-lender-profile-schema.js');
const ColenderAssignment = require('../models/co-lender-assignment-schema');
const InsurancePricingSchema = require('../models/insurance-pricing-schema.js');
const borrowerHelper = require('../util/borrower-helper');
const insuranceHelper = require('../util/insurance-policy-helper.js');
const scoreHelper = require('../util/score-helper.js');
const ComplianceSchema = require('../models/compliance-schema.js');
const CamsDetailsSchema = require('../models/cams-details-schema.js');
const Customer = require('../models/customer-schema.js');
const loanDocumentCommonSchema = require('../models/loandocument-common-schema');
const DocumentMappingSchema = require('../models/document-mappings-schema.js');
const ChargesSchema = require('../models/charges-schema.js');
const chargesHelper = require('../util/charges.js');
const Product = require('../models/product-schema.js');
const axios = require('axios');
const kycBroadcastEvent = require('./kyc/kyc-broadcast-event.js');
const { leadStatus } = require('../constants/lead-status.js');
const {
  storeIHServiceRequestDataToS3,
  storeIHServiceResponseDataToS3,
} = require('../util/IHService-req-res-log.js');
const { re } = require('mathjs');

/**
 * Exporting ALL LOAN RELATED APIs
 * @param {*} app
 * @param {*} connection
 * @return {*} LOAN Details
 * @throws {*} KYC/BUREAU/BRE/LOAN Exception
 */

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const verifyLoanPayload = async (req, res, next) => {
    try {
      var biReqData = req.body;
      biReqData = reqUtils.cleanBody(biReqData);
      if (!Array.isArray(biReqData)) {
        biReqData = [biReqData];
      }
      // Validate company_id and product_id with token
      const validateCompanyProductWithLAID =
        await jwt.verifyLoanAppIdCompanyProduct(req, biReqData[0].loan_app_id);
      if (!validateCompanyProductWithLAID.success)
        throw validateCompanyProductWithLAID;
      //find the custom template path of requested template type
      const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
        req.loanSchema.loan_custom_templates_id,
        'loan',
      );
      if (!loanTemplate)
        throw {
          message: 'No records found for template',
        };
      //fetch the custom template json data from s3 by path
      const resultJson = await s3helper.fetchJsonFromS3(
        loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        {
          method: 'Get',
        },
      );
      //validate the incoming template data with customized template data
      const result = await validate.validateDataWithTemplate(
        resultJson,
        biReqData,
      );
      if (!result)
        throw {
          message: 'loanTemplate path not found',
        };
      if (result.unknownColumns.length)
        throw {
          message:
            'EX_LOAN_042 Parameters mentioned below are not accepted. Kindly ensure that they are not included in request payload and try again.',
          errorCode: '03',
          data: {
            unknownColumns: result.unknownColumns,
          },
        };
      if (result.missingColumns.length)
        throw {
          message:
            'EX_LOAN_043 Parameters mentioned below are mandatory. Kindly ensure that they are included in request payload and try again.',
          errorCode: '01',
          data: {
            missingColumns: result.missingColumns,
          },
        };
      if (result.errorRows.length)
        throw {
          message:
            'EX_LOAN_029 Data passed for the below mentioned parameters is invalid. Kindly modify data being passed and try again.',
          errorCode: '02',
          data: {
            exactErrorRows: result.exactErrorColumns,
            errorRows: result.errorRows,
          },
        };
      if (result.exactEnumErrorColumns.length)
        throw {
          success: false,
          message: `${result.exactEnumErrorColumns[0]}`,
          errorCode: '02',
          data: {
            exactEnumErrorColumns: result.exactEnumErrorColumns,
          },
        };
      req.result = result;
      req.biReqData = biReqData;
      next();
    } catch (error) {
      return res.status(400).send(error);
    }
  };

  const verifyBulletTypeLoan = async (req, res, next) => {
    try {
      if (req.product?.allow_loc || req.product?.repayment_type !== 'Bullet')
        return next();
      var biReqData = req.body[0];

      if (biReqData?.repayment_type && biReqData?.repayment_type !== 'Bullet')
        return next();

      if (!biReqData?.repayment_type) {
        if (
          req.product?.repayment_type &&
          req.product?.repayment_type !== 'Bullet'
        )
          return next();
      }

      if (!biReqData.tenure) {
        if (!req.product.loan_tenure)
          throw {
            success: false,
            message:
              'repayment days are required for loan having repayment type Bullet',
          };
      }

      if (biReqData.tenure && biReqData.tenure == '')
        throw {
          success: false,
          message:
            'repayment days are required for loan having repayment type Bullet',
        };

      if (!biReqData.tenure_type) {
        if (req.product.loan_tenure_type !== 'Day')
          throw {
            success: false,
            message:
              'tenure_type should be Day for loan having repayment type Bullet',
          };
      }

      if (biReqData.tenure_type !== 'Day')
        throw {
          success: false,
          message:
            'tenure_type should be Day for loan having repayment type Bullet',
        };

      if (!biReqData.loan_int_rate) {
        if (!req.product?.int_value)
          throw {
            success: false,
            message:
              'loan_int_rate should be greater than 0 for loan having repayment type Bullet',
          };
      }

      if (!biReqData.loan_int_rate) {
        if (!req.product?.int_value)
          throw {
            success: false,
            message:
              'loan_int_rate should be greater than 0 for loan having repayment type Bullet',
          };
      }

      if (!biReqData.emi_count)
        throw {
          success: false,
          message:
            'emi_count can be only 1 for loan having repayment type Bullet',
        };
      if (biReqData.emi_count && biReqData.emi_count.toString() !== '1')
        throw {
          success: false,
          message:
            'emi_count can be only 1 for loan having repayment type Bullet',
        };
      next();
    } catch (error) {
      console.log('error', error);
      return res.status(400).send(error);
    }
  };

  app.get(
    '/api/loan/:libi',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const borrowerInfoData = await BorrowerinfoCommon.findOneWithKBIORKLI(
          req.params.libi,
        );
        if (!borrowerInfoData)
          throw {
            message:
              'EX_LOAN_001 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
          };
        if (req.company._id !== borrowerInfoData.company_id)
          throw {
            message:
              'EX_LOAN_002 Entered loan ID does not match the selected company. Kindly verify if correct company has been selected and loan ID has been entered accurately.',
          };
        if (req.product._id !== borrowerInfoData.product_id)
          throw {
            message:
              'EX_LOAN_003 Entered loan ID does not match the selected product. Kindly verify if correct product has been selected and loan ID has been entered accurately.',
          };
        return res.send({
          loanDetails: borrowerInfoData,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/borrowerrecords',
    [
      jwt.verifyTokenSkipCIDPIDPost,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        const { company_id, product_id, from_date, to_date, str, is_msme } = data;
        if (is_msme && req.product && req.product.is_msme_automation_flag !== 'Y'){
            throw {
              success: false,
              message: 'EX_LOAN_004 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
            };
        }
        if (is_msme && str){
          let singleBICRecord = await BorrowerinfoCommon.findOneGlobalSearch(str);
          const product = await Product.findOne({ _id: singleBICRecord[0].product_id });
          if (product.is_msme_automation_flag!=='Y'){
            throw {
              success: false,
              message: 'EX_LOAN_004 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
            };
          }
          return res.send({ count: 1, rows: singleBICRecord });
        }
        if (
          req.authData.skipCIDPID &&
          (!company_id || company_id === 'null') &&
          (!product_id || product_id === 'null') &&
          (!from_date || from_date === 'null') &&
          (!to_date || to_date === 'null') &&
          str !== '' &&
          str !== null &&
          str !== 'null' &&
          str !== undefined
        ) {
          let singleBICRecord =
            await BorrowerinfoCommon.findOneGlobalSearch(str);
          if (!singleBICRecord)
            throw {
              success: false,
              message:
                'EX_LOAN_004 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
            };
          singleBICRecord = JSON.parse(JSON.stringify(singleBICRecord));
          if (!singleBICRecord.length)
            throw {
              success: false,
              message: 'No records found',
            };
          let locCreditData =
            (await LOCCreditlimitSchema.checkCreditLimit(str)) || {};

          singleBICRecord[0]['loc_available_balance'] =
            locCreditData?.available_balance || 'NA';
          singleBICRecord[0]['loc_credit_limit'] =
            locCreditData?.limit_amount || 'NA';
          delete singleBICRecord[0]["penny_drop_result"]
          delete singleBICRecord[0]["name_match_result"]
          return res.send({ count: 1, rows: singleBICRecord });
        }
        if (!req.authData['skipCIDPID']) {
          if (String(req.company._id) !== String(data.company_id))
            throw {
              message:
                'EX_LOAN_005 Entered loan ID does not match the selected company. Kindly verify if correct company has been selected and loan ID has been entered accurately.',
            };
          if (String(req.product._id) !== String(data.product_id))
            throw {
              message:
                'EX_LOAN_006 Entered loan ID does not match the selected product. Kindly verify if correct product has been selected and loan ID has been entered accurately.',
            };
        }

        const isPagination = data.hasOwnProperty('pagination');
        if (isPagination && process.env.MAXIMUM_DATE_RANGE) {
          //Calculate the from date and to date diff in days and validate with MAXIMUM_DATE_RANGE
          let fromDate = moment(data.from_date);
          let toDate = moment(data.to_date);
          let days = toDate.diff(fromDate, 'days');
          if (days > process.env.MAXIMUM_DATE_RANGE) {
            throw {
              success: false,
              message: `EX_LOAN_007 Maximum permissible date range is ${process.env.MAXIMUM_DATE_RANGE} days. Kindly reduce the date range in order to proceed.`,
            };
          }
        }

        let records = await BorrowerinfoCommon.getAllByFilter(data);
        let mimicRecords = records?.rows ? records.rows : records;

        if (isPagination && (!mimicRecords || !mimicRecords.length))
          throw {
            message:
              'EX_LOAN_004 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
          };
        if (!isPagination && (!mimicRecords || !mimicRecords.length))
          throw {
            message:
              'EX_LOAN_004 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
          };

        if (data.isExport) {
          const returnPayload = [];

          let loanIds = [];
          mimicRecords.forEach((record) => {
            loanIds.push(record.loan_id);
          });

          let leads = await LoanRequestSchema.findAllByLoanIds(loanIds);
          leads = JSON.parse(JSON.stringify(leads));
          let leadsObjects = {};
          Array.from(leads).forEach((row) => {
            leadsObjects[row.loan_id] = row;
          });
          mimicRecords?.map((record, index) => {
            const leadObject = { ...leadsObjects[record.loan_id] };
            leadObject.loan_status = record.status;
            delete record.penny_drop_result
            delete record.name_match_result
            returnPayload.push({
              ...record,
              ...leadObject,
            });
          });
          return res.send(returnPayload);
        }
        for (let i = 0; i < mimicRecords.length; i++) {
          let tempObj = mimicRecords[i];
          let locCreditData =
            (await LOCCreditlimitSchema.checkCreditLimit(tempObj.loan_id)) ||
            {};
          mimicRecords[i]['loc_available_balance'] =
            locCreditData?.available_balance;
          mimicRecords[i]['loc_credit_limit'] =
            locCreditData?.limit_amount || '';
          delete mimicRecords[i]["penny_drop_result"]
          delete mimicRecords[i]["name_match_result"]
        }
        return res.send(records);
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loan',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
      verifyLoanPayload,
      verifyBulletTypeLoan,
    ],
    async (req, res, next) => {
      try {
        let subventionFeesExclGST;
        let gstOnConvFees;
        let gstOnApplicationFees;
        let processInsurance = {};
        let aScore = 0;
        let bScore = 0;
        let upfrontInterest = 0;

        // check for few hardcoded data fields should not cross the data recorded in product
        for (var i = 0; i < req.biReqData.length; i++) {
          if (Number(req.biReqData[i].tenure) > Number(req.product.loan_tenure))
            throw {
              message: `EX_LOAN_008 Loan tenure cannot be greater than ${req.product.loan_tenure}. Kindly reduce the loan tenure in order to proceed.`,
            };
          if (
            req.biReqData[i].tenure_type &&
            req.biReqData[i].tenure_type.toLowerCase() !==
            req.product.loan_tenure_type.toLowerCase()
          )
            throw {
              success: false,
              message: `EX_LOAN_009 Mismatch in tenure type. Kindly modify tenure type to ${req.product.loan_tenure_type} in order to proceed.`,
            };
          if (
            req.biReqData[i].repayment_type &&
            req.product.repayment_type &&
            req.company.lms_version === 'origin_lms' &&
            req.biReqData[i].repayment_type.toLowerCase() !==
            req.product.repayment_type.toLowerCase()
          )
            throw {
              success: false,
              message: `EX_LOAN_010 Mismatch in repayment type. Kindly modify repayment type to ${req.product.repayment_type} in order to proceed.`,
            };
          if (
            Number(req.biReqData[i].sanction_amount) >
            Number(req.product.max_loan_amount)
          )
            throw {
              message: `EX_LOAN_011 Sanction amount cannot be greater than ${req.product.max_loan_amount}. Kindly reduce the sanction amount in order to proceed.`,
            };
        }

        //check for doc mandate if party_type is present in product
        if (
          req.product.party_type &&
          req.product.party_type != null &&
          req.product.party_type == 'Individual'
        ) {
          const loanDocument = await loanDocumentCommonSchema.findByLoanAppID(
            req.body[0].loan_app_id,
          );
          if (!loanDocument || loanDocument == null || loanDocument == '')
            throw {
              success: false,
              message:
                'EX_LOAN_012 Selfie has not been added. Kindly add selfie in order to proceed.',
            };

          const complianceDetails = await ComplianceSchema.findByLoanAppId(
            req.body[0].loan_app_id,
          );

          const files = [];
          const fileType = loanDocument.forEach((item) => {
            files.push(item.file_type);
          });
          const documentMappings = await DocumentMappingSchema.getAll();
          let documentMapping = {};
          for await (let ele of documentMappings) {
            documentMapping[ele.doc_code] = ele.doc_type;
          }

          const requiredDoc = [
            documentMapping['005'],
            documentMapping['006'],
            documentMapping['116'],
            documentMapping['003'],
            documentMapping['114'],
          ];
          //filter files for which file is not present
          var resultArr = requiredDoc.filter(function (val) {
            return !files.find(function (obj) {
              return val === obj;
            });
          });
          //remove pan_card from response if file pan_xml is present
          if (
            files.includes(documentMapping['116']) &&
            resultArr.includes(documentMapping['005'])
          ) {
            const idx = resultArr.indexOf(documentMapping['005']);
            resultArr.splice(idx, 1);
          }
          //remove pan_xml from response if file pan_card is present
          if (
            files.includes(documentMapping['005']) &&
            resultArr.includes(documentMapping['116'])
          ) {
            const idx = resultArr.indexOf(documentMapping['116']);
            resultArr.splice(idx, 1);
          }

          //remove aadhaar_xml from response if file aadhar_card is present
          if (
            files.includes(documentMapping['006']) &&
            resultArr.includes(documentMapping['114'])
          ) {
            const idx = resultArr.indexOf(documentMapping['114']);
            resultArr.splice(idx, 1);
          }

          //remove aadhar_card from response if file aadhar_xml is present
          if (
            files.includes(documentMapping['114']) &&
            resultArr.includes(documentMapping['006'])
          ) {
            const idx = resultArr.indexOf(documentMapping['006']);
            resultArr.splice(idx, 1);
          }

          if (
            resultArr.includes(documentMapping['006'], documentMapping['114'])
          ) {
            const idx = resultArr.indexOf(documentMapping['114']);
            resultArr.splice(idx, 1);
          }
          if (
            resultArr.includes(documentMapping['005'], documentMapping['116'])
          ) {
            const idx = resultArr.indexOf(documentMapping['116']);
            resultArr.splice(idx, 1);
          }

          const responseArray = resultArr.map((file) => {
            if (
              file == documentMapping['006'] ||
              file == documentMapping['114']
            ) {
              return 'Aadhaar';
            }
            if (
              file == documentMapping['005'] ||
              file == documentMapping['116']
            ) {
              return 'PAN';
            }
            if (file == documentMapping['003']) {
              return 'Selfie';
            }
          });

          if (resultArr.length > 0)
            throw {
              success: false,
              message: `${responseArray} is missing`,
            };
        }

        if (req.result.validatedRows.length == req.biReqData.length) {
          const validateDataAsPerFlag =
            await validate.validateProductconfigWithRequestData(
              req,
              res,
              req.product,
              req.result.validatedRows[0],
            );
          if (validateDataAsPerFlag.success === false)
            throw { validateDataAsPerFlag };
          // Validate sanction amount if allow_loc flag is true in product
          if (
            req.product.allow_loc === 1 &&
            req.result.validatedRows[0].sanction_amount
          ) {
            const minLimit = req.product.min_loan_amount;
            const maxLimit = Number(req.product.max_loan_amount);
            if (
              req.result.validatedRows[0].sanction_amount < minLimit ||
              req.result.validatedRows[0].sanction_amount > maxLimit
            ) {
              throw {
                success: false,
                message:
                  'EX_LOAN_013 Sanction amount is not within limits assigned to this product. Kindly check product details and modify the sanction amount accordingly.',
              };
            }
          }
          //Validate loan_amt_requested is less than sanction amount.
          const loanAmountRequested = Number(
            req.result.validatedRows[0].loan_amount_requested,
          );
          const sanctionAmountRequested = Number(
            req.result.validatedRows[0].sanction_amount,
          );
          if (
            !req.product.allow_loc &&
            sanctionAmountRequested > loanAmountRequested
          )
            throw {
              success: false,
              message:
                'EX_LOAN_089 - Loan amount requested should be more than or equal to sanction amount',
            };

          //Validate EMI Count is less than  amount.
          const emiCount = req.result.validatedRows[0].emi_count;
          const tenure =
            req.result.validatedRows[0]?.tenure || req.product.loan_tenure;
          if (!req.product.allow_loc && emiCount > tenure)
            throw {
              success: false,
              message:
                'EX_LOAN_090 - emi count should be less than or equal to tenure',
            };

          //Validate broken_period_int_amt if calculate_broken_interest flag is checked.
          const brokenPeriodIntAmountCached =
            req.result.validatedRows[0].broken_period_int_amt;
          if (
            req.product.calculate_broken_interest &&
            brokenPeriodIntAmountCached === ''
          )
            throw {
              success: false,
              message:
                'EX_LOAN_014 Broken Period Interest Amount is a mandatory parameter. Kindly verify if an acceptable value is being passed in the aforementioned parameter.',
            };
          const loanIds = req.biReqData.map((item) => {
            return item.loan_app_id;
          });

          //find in DB whether all  loan id exists in loanrequest table
          const lead = await LoanRequestSchema.findExistingKLIByIds(loanIds);
          if (lead[0] == null || !lead.length) {
            throw {
              message:
                'EX_LOAN_015 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
            };
          }
          if (lead.length !== loanIds.length) {
            throw {
              message: `Only ${lead.length} rows are in loanrequest record`,
            };
          }

          const panNumbers = await lead.map((item) => {
            return item.appl_pan;
          });
          const panAlreadyExist = await LoanRequestSchema.findByPan(
            panNumbers,
            req.company._id,
          );

          //Check loan_app_id already exist in loanrequest schema.
          const deletedLoanAppIdExist =
            await LoanRequestSchema.getDeletedLeadLAIds(loanIds);
          if (deletedLoanAppIdExist.length)
            throw {
              success: false,
              message:
                'EX_LOAN_016 Lead ID linked to this loan ID has been deleted. Kindly create a new lead before proceeding to loan creation.',
            };

          const leadDetails = await LoanRequestSchema.findByLId(loanIds);
          if (leadDetails.lead_status === leadStatus.Manual) {
            throw {
              success: false,
              message: 'Loan cannot be booked as lead is under manual review',
            };
          }

          if (panAlreadyExist) {
            const panData =
              panNumbers.length === 1 ? [panAlreadyExist] : panAlreadyExist;
            const LoanAppIds = await panData.map((item) => {
              return item.loan_app_id;
            });

            //Check loan_app_id already exist in borrower info table
            const loanAppIdAlreadyExist =
              await BorrowerinfoCommon.findByLoanAppIds(loanIds);

            if (
              loanAppIdAlreadyExist.length &&
              loanAppIdAlreadyExist[0] !== null
            ) {
              throw {
                success: false,
                message:
                  'EX_LOAN_017 Loan Application ID already exists. Kindly verify if correct loan application ID has been entered.',
              };
            }
          }
          const existingBorrowerIds =
            await BorrowerinfoCommon.fastFindExistingKLIByIds(loanIds);
          if (existingBorrowerIds[0] !== null && existingBorrowerIds.length)
            throw {
              success: false,
              message:
                'EX_LOAN_018 Loan Application ID already exists. Kindly verify if correct loan application ID has been entered.',
              data: {
                existingBorrowerIds,
              },
            };

          //Set flag to identify Pf is calculated internally
          req.result.validatedRows.forEach((item) => {
            if (
              req?.product?.allow_loc &&
              req?.product?.line_pf === 'repayment'
            ) {
              item.pf_calculated = !item.hasOwnProperty('processing_fees_amt')
                ? 1
                : 0;
            }
          });

          // add bulk bifurcated data in borrowerinfo common table
          req.result.validatedRows.forEach(async (item) => {
            // Calculate subvention fees excusive of gst
            if (item.subvention_fees) {
              subventionFeesExclGST =
                await calculation.calculateSubventionFeesExcGST(
                  item,
                  req.product,
                );
            }
            var leadRecord = lead.find(
              (record) => record.loan_app_id === item.loan_app_id,
            );
            if (item.conv_fees) {
              gstOnConvFees = await calculation.calculateGSTOnConvFees(
                item,
                leadRecord,
                req.product,
              );
            }
            if (item.application_fees) {
              gstOnApplicationFees =
                await calculation.calculateGSTOnApplicationFees(
                  item,
                  leadRecord,
                  req.product,
                );
            }
            item.first_name = leadRecord?.first_name;
            item.middle_name = leadRecord?.middle_name;
            item.last_name = leadRecord?.last_name;
            item.age = leadRecord?.age;
            item.applied_amount = leadRecord?.applied_amount;
            item.company_id = req.company._id;
            item.product_id = req.product._id;
            item.product_key = req.product.name;
            item.status = 'open';
            item.tenure_type = item.tenure_type
              ? item.tenure_type
              : req.product.loan_tenure_type;
            item.repayment_type = item.repayment_type
              ? item.repayment_type
              : req.product.repayment_type;
            item.int_type = item.int_type
              ? item.int_type
              : req.product.interest_rate_type
                ? req.product.interest_rate_type.charAt(0).toUpperCase() +
                req.product.interest_rate_type.slice(1)
                : '';
            item.loan_int_rate = item.loan_int_rate
              ? item.loan_int_rate
              : req.product.int_value.replace(/[a-zA-Z]+/g, '') * 1;
            item.interest_type = req.product.interest_type
              ? req.product.interest_type
              : '';
            item.processing_fees_amt =
              Number(item.processing_fees_amt) >= 0
                ? Math.round(
                  (item.processing_fees_amt * 1 + Number.EPSILON) * 100,
                ) / 100
                : req.product.processing_fees.indexOf('A') > -1
                  ? Math.round(
                    (req.product.processing_fees.replace(/[a-zA-Z]+/g, '') * 1 +
                      Number.EPSILON) *
                    100,
                  ) / 100
                  : req.product.processing_fees.indexOf('P') > -1
                    ? (
                      ((req.product.processing_fees.replace(/[a-zA-Z]+/g, '') *
                        1) /
                        100) *
                      Number(item.sanction_amount ? item.sanction_amount : 0)
                    ).toFixed(2)
                    : 0;
            item.subvention_fees_amount = item.subvention_fees
              ? subventionFeesExclGST.subventionFeesExcludingGst
              : '';
            item.gst_on_subvention_fees = item.subvention_fees
              ? subventionFeesExclGST.gstOnSubventionFees
              : '';
            item.cgst_on_subvention_fees = item.subvention_fees
              ? subventionFeesExclGST.cgstOnSubventionFees
              : '';
            item.sgst_on_subvention_fees = item.subvention_fees
              ? subventionFeesExclGST.sgstOnSubventionFees
              : '';
            item.igst_on_subvention_fees = item.subvention_fees
              ? subventionFeesExclGST.igstOnSubventionFees
              : '';
            item.penal_interest =
              Number(
                req?.product?.penal_interest
                  .toString()
                  .replace(/[a-zA-Z]+/g, ''),
              ) || 0;
            item.bounce_charges =
              Number(
                req?.product?.bounce_charges
                  .toString()
                  .replace(/[a-zA-Z]+/g, ''),
              ) || 0;

            //record gst on conv_fees
            item.gst_on_conv_fees = item.conv_fees
              ? gstOnConvFees.calculatedGstAmt
              : '';
            item.conv_fees_excluding_gst = item.conv_fees
              ? gstOnConvFees.convFeesExcludingGst
              : '';
            item.cgst_on_conv_fees = item.conv_fees
              ? gstOnConvFees.calculatedCgst
              : '';
            item.sgst_on_conv_fees = item.conv_fees
              ? gstOnConvFees.calculatedSgst
              : '';
            item.igst_on_conv_fees = item.conv_fees
              ? gstOnConvFees.calculatedIgst
              : '';
            //record gst on application_fees
            item.gst_on_application_fees = item.application_fees
              ? gstOnApplicationFees?.calculatedGstAmt
              : '';
            item.application_fees_excluding_gst = item.application_fees
              ? gstOnApplicationFees.applFeesExcludingGst
              : '';
            item.cgst_on_application_fees = item.application_fees
              ? gstOnApplicationFees.calculatedCgst
              : '';
            item.sgst_on_application_fees = item.application_fees
              ? gstOnApplicationFees.calculatedSgst
              : '';
            item.igst_on_application_fees = item.application_fees
              ? gstOnApplicationFees.calculatedIgst
              : '';
            //Add foreclosure related variables
            item.fc_offer_days = req.product.foreclosure
              ? req.product.fc_offer_days
              : null;
            item.foreclosure_charge = req.product.foreclosure
              ? req.product.foreclosure_charge
              : null;
          });

          const leadData = await leadHelper.fetchLead(
            req.biReqData[0].loan_app_id,
            req,
            res,
          );
          let leadsData = JSON.parse(JSON.stringify(req.lead));
          let borrowerData = JSON.parse(
            JSON.stringify(req.result.validatedRows[0]),
          );
          let customerData = await Customer.findByPan(leadsData.appl_pan);
          let lmsPostData = await Object.assign(
            leadsData,
            borrowerData,
            customerData,
          );
          let brokenInterest = 0;
          let gstAmount = 0;
          let insurancePricingRecord;
          let insuranceStagingData = {};
          req.insuranceStagingData = insuranceStagingData;

          // Process insurance amount passed in loan payload
          if (
            lmsPostData.insurance_amount &&
            lmsPostData.insurance_amount * 1 > 1 &&
            lmsPostData.insurance_amount !== null &&
            lmsPostData.insurance_amount !== 'null'
          ) {
            //Check entry in insurance pricing table by company_id and product_id
            insurancePricingRecord = await InsurancePricingSchema.findByCIDPID(
              req.company._id,
              req.product._id,
            );

            //Calculate and validate insurance amount.
            processInsurance = await insuranceHelper.loanInsuranceValidations(
              req,
              res,
              lmsPostData,
            );
            if (!processInsurance.success) {
              throw { success: false, message: processInsurance.message };
            }
            lmsPostData.borrower_premium = req.insuranceResponse.borrowerPremium
              ? Math.round(
                (req.insuranceResponse.borrowerPremium * 1 + Number.EPSILON) *
                100,
              ) / 100
              : 0;
            lmsPostData.coborrower_premium = req.insuranceResponse
              .coBorrowerPremium
              ? req.insuranceResponse.coBorrowerPremium
              : 0;
          }
          // A score finding process
          if (lmsPostData.a_score_request_id) {
            aScoreData = await scoreHelper.processAscore(req, lmsPostData);
            if (!aScoreData.success) throw aScoreData;
            aScore = aScoreData.score;
            lmsPostData.a_score = aScore;
            lmsPostData.bureau_score = aScoreData.bureau_score
              ? aScoreData.bureau_score
              : 0;
          }

          // B score finding process
          if (lmsPostData.b_score_request_id) {
            bScoreData = await scoreHelper.processBscore(req, lmsPostData);
            if (!bScoreData.success) throw bScoreData;
            bScore = bScoreData.score;
            lmsPostData.b_score = bScore;
          }
          // fetch offer details from offer_details collection instead bScore collection
          offerDetailsData = await scoreHelper.processOfferDetails(
            req,
            lmsPostData.loan_app_id,
          );

          if (offerDetailsData) {
            lmsPostData.offered_amount = offerDetailsData.offered_amount
              ? offerDetailsData.offered_amount
              : 0;
            lmsPostData.offered_int_rate = offerDetailsData.offered_int_rate
              ? offerDetailsData.offered_int_rate
              : 0;
            lmsPostData.monthly_imputed_income =
              offerDetailsData.monthly_imputed_income
                ? offerDetailsData.monthly_imputed_income
                : 0;
            lmsPostData.monthly_average_balance =
              offerDetailsData.monthly_average_balance
                ? offerDetailsData.monthly_average_balance
                : 0;
            lmsPostData.foir = offerDetailsData.foir
              ? offerDetailsData.foir
              : 0;
          }
          //calculate eligible loan amount
          if (
            lmsPostData.program_type ||
            lmsPostData.partner_customer_category
          ) {
            eligibleLoanAmt =
              await calculation.calculateEligibleLoanAmount(lmsPostData);
            if (!eligibleLoanAmt.success) throw eligibleLoanAmt;
            lmsPostData.eligible_loan_amount =
              eligibleLoanAmt.eligible_loan_amount;
            lmsPostData.emi_allowed =
              eligibleLoanAmt.emi_allowed; 
            req.result.validatedRows.forEach((item) => {
              item.eligible_loan_amount = lmsPostData.eligible_loan_amount;
              item.emi_allowed = lmsPostData.emi_allowed;
            });
          }
          // Calculate and validate upfront intrest
          if (
            !req.product.allow_loc &&
            req.product.interest_type === 'upfront'
          ) {
            upfrontInterest = await calculation.calculateUpfrontInterest(
              req,
              lmsPostData,
            );
            if (!upfrontInterest.success) throw upfrontInterest;
            upfrontInterest = upfrontInterest.upfront_interest;
          }
          req.result.validatedRows.forEach((item) => {
            item.insurance_amount = req.insuranceResponse
              ? req.insuranceResponse.policyPremiumIncGST
              : 0;
            item.a_score = aScore ? aScore : 0;
            item.b_score = bScore ? bScore : 0;
            item.upfront_interest = upfrontInterest ? upfrontInterest : 0;

            item.bureau_score = lmsPostData.bureau_score;
            item.offered_amount = lmsPostData.offered_amount;
            item.offered_int_rate = lmsPostData.offered_int_rate;
            item.monthly_imputed_income = lmsPostData.monthly_imputed_income;
            item.monthly_average_balance = lmsPostData.monthly_average_balance;
            item.foir = lmsPostData.foir;
          });

          req.result.validatedRows.forEach(async (item) => {
            let uniqueId = [];
            uniqueId.push(item.loan_app_id);
            const itemLead =
              await LoanRequestSchema.findExistingKLIByIds(uniqueId);
            let itemObj = itemLead[0];
            if (
              'scr_match_result' in itemObj &&
              itemObj.scr_match_result == 'Probable'
            ) {
              item.scr_status = 'pending';
              item.stage = 901;
            }
          });

          // Check if calculateGstForProduct flag is active and lms_version is origin_lms
          if (req.company.lms_version === 'origin_lms') {
            const gstCalculation = await calculation.calculateGST(
              lmsPostData,
              req.product,
            );
            if (!gstCalculation.success) {
              throw {
                ...gstCalculation,
              };
            }
            gstAmount = gstCalculation?.calculatedGstAmt;
            req.result.validatedRows.forEach((item) => {
              item.cgst_amount = gstCalculation?.calculatedCgst;
              item.sgst_amount = gstCalculation?.calculatedSgst;
              item.igst_amount = gstCalculation?.calculatedIgst;
              item.gst_on_pf_amt = gstCalculation?.calculatedGstAmt;
            });
          }
          // Check if calculate_broken_interest flag is active and lms_version is origin_lms
          if (
            req.product.calculate_broken_interest &&
            req.company.lms_version === 'origin_lms'
          ) {
            brokenInterestResp = await calculation.calculateBrokenInterest(
              lmsPostData,
              req.product,
            );
            if (!brokenInterestResp.success) {
              throw {
                ...brokenInterestResp,
              };
            }
            brokenInterest = brokenInterestResp.brokenInterestAmount;

            if (brokenInterest * 1 !== lmsPostData.broken_period_int_amt * 1)
              throw {
                success: false,
                message: `EX_LOAN_019 Broken period interest amount entered is invalid. Kindly modify the amount to ${brokenInterest} in order to proceed.`,
              };
          }
          req.result.validatedRows.forEach((item) => {
            item.broken_interest = brokenInterest;
          });
          if (req.company.lms_version === 'origin_lms') {
            const netDisbursementAmount =
              await calculation.calculateNetDisbursementAmount(
                brokenInterest,
                gstAmount,
                lmsPostData,
                req.product,
              );
            if (!netDisbursementAmount.success) {
              throw {
                ...netDisbursementAmount,
              };
            }
            req.result.validatedRows.forEach((item) => {
              item.net_disbur_amt =
                netDisbursementAmount?.netDisbursementAmount;
              item.borrower_premium = lmsPostData?.borrower_premium;
              item.coborrower_premium = lmsPostData?.coborrower_premium;
              if (req.product.cash_collateral) {
                item.withheld_amt = netDisbursementAmount?.withheld_amt;
              }
            });
          }

          //add party type in borrowers data
          if (req.product && req.product.party_type) {
            req.result.validatedRows.forEach((item) => {
              item.party_type = req.product.party_type;
            });
          }
          //--------------------CKYC AND PAN VALIDATION INTEGRATION------------------------

          var { ckycDownload, loanReqData, panKYCResp } =
            await ckycAndPanValidation(lmsPostData, req, res);

          // --------------------NAME MATCHING ---------------------------------------//
          var nameMatchResValue = await callNameMatchingAPI(
            ckycDownload,
            req,
            loanReqData,
            panKYCResp,
          );
          //------------------  PIN CODE MATCHING -------------------------------//

          await callPinCodeMatchingAPI(ckycDownload, req, loanReqData);
          //--------AADHAAR AND PAN MATCH INTEGRATION ONLY WHEN WE RECIEVE ALL KYC DOCUMENTS------------------------

          if (
            req.product.party_type &&
            req.product.party_type != null &&
            req.product.party_type == 'Individual'
          ) {
            let loan_app_id_kyc = req.body[0].loan_app_id;
            let kycDocExist =
              await ComplianceSchema.alreadyExists(loan_app_id_kyc);
          }

          //---------------- OKYC INTEGRATION ----------------------------------//

          await callOKYCAPI(ckycDownload, nameMatchResValue, loanReqData, req);
          //---------------     BUREAU VALIDATION--------------------------------//

          //validate if bureau and partner_name is configured in product
          const callBureauValidationResp = await callBureauValidation(
            req,
            res,
            lmsPostData,
          );

          if (
            callBureauValidationResp &&
            callBureauValidationResp?.success === true &&
            callBureauValidationResp?.cibilResp?.result?.controlData
              ?.success === true &&
            req.product?.bureau_parser
          ) {
            //get the response
            const cibilParserConfig = {
              method: 'POST',
              url: `${process.env.BUREAU_CIBIL_PARSER_URL}`,
              headers: {
                'access-token': process.env.BUREAU_CIBIL_PARSER_TOKEN,
                'Content-Type': 'application/json',
              },
              data: {
                request_id: callBureauValidationResp.cibilResp.request_id,
                bureau_response: {
                  result: callBureauValidationResp.cibilResp.result,
                },
              },
            };
            req['raw_data_object'] = {
              request_id: callBureauValidationResp.cibilResp.request_id,
              bureau_response: {
                result: callBureauValidationResp.cibilResp.result,
              },
            };
            req.apiName = 'api/bureauParse';
            const storeIHServiceRequestDataToS3Call =
              await storeIHServiceRequestDataToS3(
                req,
                res,
                req.result.validatedRows[0],
              );
            if (!storeIHServiceRequestDataToS3Call)
              throw {
                success: false,
                message: 'Error while storing bureau parser API request to S3',
              };
            //call api
            let cibilParserResp;
            try {
              const response = await axios(cibilParserConfig);
              cibilParserResp = {
                success: true,
                data: response.data,
              };
            } catch (error) {
              cibilParserResp = {
                success: false,
                data: error.response?.data,
              };
            }
            const storeIHServiceResponseDataToS3Call =
              await storeIHServiceResponseDataToS3(
                req,
                res,
                cibilParserResp.data,
                req.result.validatedRows[0],
              );
            if (!storeIHServiceResponseDataToS3Call)
              throw {
                success: false,
                message: 'Error storing bureau parser API response to S3',
              };
            if (!cibilParserResp.success)
              throw {
                success: false,
                message: 'Error while parsing bureau response',
              };
            const dataTochange = cibilParserResp?.data?.summary;
            if (!dataTochange)
              throw {
                success: false,
                message: 'Error in bureau parser, please try again',
              };
            lmsPostData['bureau_outstanding_loan_amt'] =
              dataTochange.bureau_outstanding_loan_amt;
            lmsPostData['bureau_score'] = dataTochange.bureau_score;
            lmsPostData['cnt_active_unsecured_loans'] =
              dataTochange.cnt_active_unsecured_loans;
            lmsPostData['credit_card_settlement_amount'] =
              dataTochange.credit_card_settlement_amount;
            lmsPostData['current_overdue_value'] =
              dataTochange.current_overdue_value;
            lmsPostData['dpd_in_last_12_months'] =
              dataTochange.dpd_in_last_12_months;
            lmsPostData['dpd_in_last_24_months'] =
              dataTochange.dpd_in_last_24_months;
            lmsPostData['dpd_in_last_3_months'] =
              dataTochange.dpd_in_last_3_months;
            lmsPostData['dpd_in_last_6_months'] =
              dataTochange.dpd_in_last_6_months;
            lmsPostData['dpd_in_last_9_months'] =
              dataTochange.dpd_in_last_9_months;
            lmsPostData['dpd_in_last_3_months_credit_card'] =
              dataTochange.dpd_in_last_3_months_credit_card;
            lmsPostData['dpd_in_last_3_months_unsecured'] =
              dataTochange.dpd_in_last_3_months_unsecured;
            lmsPostData['enquiries_bureau_30_days'] =
              dataTochange.enquiries_bureau_30_days;
            lmsPostData['enquiries_in_last_3_months'] =
              dataTochange.enquiries_in_last_3_months;
            lmsPostData['ninety_plus_dpd_in_last_24_months'] =
              dataTochange.ninety_plus_dpd_in_last_24_months;
            lmsPostData['total_overdues_in_cc'] =
              dataTochange.total_overdues_in_cc;
            lmsPostData['written_off_settled'] =
              dataTochange.written_off_settled;

            //Override loan variables

            req.result.validatedRows[0]['bureau_outstanding_loan_amt'] =
              dataTochange.bureau_outstanding_loan_amt;
            req.result.validatedRows[0]['bureau_score'] =
              dataTochange.bureau_score;
            req.result.validatedRows[0]['cnt_active_unsecured_loans'] =
              dataTochange.cnt_active_unsecured_loans;
            req.result.validatedRows[0]['credit_card_settlement_amount'] =
              dataTochange.credit_card_settlement_amount;
            req.result.validatedRows[0]['current_overdue_value'] =
              dataTochange.current_overdue_value;
            req.result.validatedRows[0]['dpd_in_last_12_months'] =
              dataTochange.dpd_in_last_12_months;
            req.result.validatedRows[0]['dpd_in_last_24_months'] =
              dataTochange.dpd_in_last_24_months;
            req.result.validatedRows[0]['dpd_in_last_3_months'] =
              dataTochange.dpd_in_last_3_months;
            req.result.validatedRows[0]['dpd_in_last_6_months'] =
              dataTochange.dpd_in_last_6_months;
            req.result.validatedRows[0]['dpd_in_last_9_months'] =
              dataTochange.dpd_in_last_9_months;
            req.result.validatedRows[0]['dpd_in_last_3_months_credit_card'] =
              dataTochange.dpd_in_last_3_months_credit_card;
            req.result.validatedRows[0]['dpd_in_last_3_months_unsecured'] =
              dataTochange.dpd_in_last_3_months_unsecured;
            req.result.validatedRows[0]['enquiries_bureau_30_days'] =
              dataTochange.enquiries_bureau_30_days;
            req.result.validatedRows[0]['enquiries_in_last_3_months'] =
              dataTochange.enquiries_in_last_3_months;
            req.result.validatedRows[0]['ninety_plus_dpd_in_last_24_months'] =
              dataTochange.ninety_plus_dpd_in_last_24_months;
            req.result.validatedRows[0]['total_overdues_in_cc'] =
              dataTochange.total_overdues_in_cc;
            req.result.validatedRows[0]['written_off_settled'] =
              dataTochange.written_off_settled;
          } else if (
            req.product?.bureau_parser &&
            callBureauValidationResp &&
            (callBureauValidationResp?.success === false ||
              callBureauValidationResp?.cibilResp?.result?.controlData
                ?.success === false)
          ) {
            throw {
              success: false,
              message: 'Unable to fetch bureau response using this data',
            };
          }

          //--------------------- Co-lender Check --------------------------------//
          if (req.product.is_lender_selector_flag === 'Y') {
            await configureCoLenderLoans(req);
          }

          // Pass the cams data to BRE if found against loan_app_id;
          const camsData = await CamsDetailsSchema.findByLAID(
            req.biReqData[0].loan_app_id,
          );
          if (camsData) {
            camsRespData = JSON.parse(JSON.stringify(camsData));
            delete camsRespData._id;
            delete camsRespData.status;
            delete camsRespData.company_id;
            delete camsRespData.product_id;
            delete camsRespData.loan_app_id;
            delete camsRespData._v;
            lmsPostData = { ...lmsPostData, ...camsRespData };
          }

          //-----------------Make call to BRE VALIDATION ------------------------//
          const validateAndMakeLoan = await thirdPartyHelper.BREValidation(
            req,
            lmsPostData,
          );
          if (validateAndMakeLoan) {
            if (!validateAndMakeLoan.success) {
              throw {
                success: false,
                message: validateAndMakeLoan.errorData
                  ? validateAndMakeLoan.errorData.errorData.message
                  : 'Error while creating loan',
                data: validateAndMakeLoan.errorData.errorData.data,
              };
            }
          }
          req.result.validatedRows.forEach((item) => {
            if (
              req.product?.repayment_type === 'Bullet' &&
              !req.product.allow_loc
            ) {
              // Ovverride loan_app_date passed in data and make it today.
              item['loan_app_date'] = moment(new Date()).format('YYYY-MM-DD');
            }
            item.loan_id = validateAndMakeLoan.makeLoanData['loan_id'];
            item.upi_handle = validateAndMakeLoan.makeLoanData['upi_handle'];
            item.upi_reference =
              validateAndMakeLoan.makeLoanData['upi_reference'];
          });
          const tenureCaptured = req.result.validatedRows[0].tenure
            ? req.result.validatedRows[0].tenure
            : req.product.loan_tenure;
          if (
            !req.product.allow_loc &&
            req.product.repayment_schedule === 'custom'
          ) {
            const repaymentScheduleData = {
              tenureCaptured: tenureCaptured,
              repayment_type: req.result.validatedRows[0].repayment_type,
              int_type:
                req.product.interest_type === 'upfront'
                  ? 'flat'
                  : req.result.validatedRows[0].int_type
                    ? req.result.validatedRows[0].int_type
                    : req.product.interest_rate_type,
              tenure_in_days: req.result.validatedRows[0].tenure
                ? req.result.validatedRows[0].tenure
                : req.product.loan_tenure,
              emi_count: req.result.validatedRows[0].emi_count,
              sanction_amount: req.result.validatedRows[0].sanction_amount,
              intr_rate: req.result.validatedRows[0].loan_int_rate
                ? Number(req.result.validatedRows[0].loan_int_rate)
                : String(req.product.int_value).replace(/[a-zA-Z]+/g, '') * 1,
              first_inst_date: req.result.validatedRows[0].first_inst_date,
            };

            const repaymentSchedule = await calculation.generateRepaySch(
              repaymentScheduleData,
              req.product,
            );
            if (!repaymentSchedule.success) {
              throw {
                ...repaymentSchedule,
              };
            }
            if (repaymentSchedule) {
              const uploadRepaymentSchedule =
                await repayment.storeRepaymentSchedule(
                  req,
                  req.result.validatedRows[0],
                  repaymentSchedule.repaymentScheduleGenerated,
                  res,
                );
              if (!uploadRepaymentSchedule)
                throw {
                  uploadRepaymentSchedule,
                };
            }
          }
          //get compliance data by loan app id
          let complianceCkycData = await ComplianceSchema.findByLoanAppId(
            req.body[0].loan_app_id,
          );
          let loan_status = 'open';
          //check if party type is individual and ckyc search marked true
          if (req.product.ckyc_search) {
            if (
              req.product.party_type &&
              req.product.party_type != null &&
              req.product.party_type == 'Individual'
            ) {
              if (
                complianceCkycData[0].ckyc_search == 'Y' &&
                complianceCkycData[0].ckyc_match == 'Y'
              ) {
                req.result.validatedRows[0].status = 'open';
                req.result.validatedRows[0].stage = 0;
                // add key to compliance table
                await ComplianceSchema.findIfExistAndUpdateKey(
                  req.body[0].loan_app_id,
                  'N',
                );
              } else {
                req.result.validatedRows[0].status = 'batch';
                req.result.validatedRows[0].stage = 905;
                loan_status = 'batch';
              }
            }
          }
          const newLoans = await BorrowerinfoCommon.addInBulk(
            req.result.validatedRows,
          );
          const updateLeadStatus = await LoanRequestSchema.updateStatus(
            req.result.validatedRows,
            loan_status,
            'logged',
          );
          const updateLoanIdsInLoanRequest =
            await LoanRequestSchema.updateLoanIdsBulk(
              req.result?.validatedRows?.map(({ loan_app_id, loan_id }) => {
                return {
                  loan_app_id,
                  loan_id,
                };
              }),
            );

          //update loan id in compliance
          const updateLoanIdsInCompliance =
            await ComplianceSchema.updateLoanIdsBulk(
              req.result?.validatedRows?.map(({ loan_app_id, loan_id }) => {
                const loan_created_at = updateLoanIdsInLoanRequest.created_at;
                return {
                  loan_app_id,
                  loan_id,
                  loan_created_at,
                };
              }),
            );

          ///update user_id
          const updateUser = await borrowerHelper.recordUser(
            req,
            req.result?.validatedRows[0].loan_id,
            req.authData.type,
          );

          if (req.company.auto_loan_status_change === 1) {
            //change loan status to kyc_data_approved
            const updateStatusKycDataApproved =
              await loanStatus.updateStatusToKycDataApproved(
                req,
                req.result.validatedRows[0],
              );

            //Also checking for co_lending based status
            //Change the loan status to credit_approved
            const updateStatusCreditApproved =
              await loanStatus.updateStatusToCreditApproved(
                req,
                req.result.validatedRows[0],
              );
          }

          // Record borrower insurance details
          if (
            lmsPostData.insurance_amount &&
            lmsPostData.insurance_amount * 1 > 1 &&
            lmsPostData.insurance_amount !== null &&
            lmsPostData.insurance_amount !== 'null'
          ) {
            if (insurancePricingRecord) {
              const borrowerInsuranceData =
                await insuranceHelper.recordBorrowerInsuranceDetails(
                  req,
                  req.result.validatedRows[0],
                  req.insuranceResponse,
                );
              if (!borrowerInsuranceData.success) {
                throw borrowerInsuranceData;
              }
              //Record data in issue_policy_staging collection if request from UI or API.
              const issuePolicyStagingData =
                await insuranceHelper.recordIssuePolicyStagingData(
                  req,
                  lmsPostData,
                  newLoans,
                );
              if (!issuePolicyStagingData.success)
                throw {
                  success: false,
                  message: 'Issue in recording insurance details.',
                };
            }
          }
          //Send updated loan status and loan stage in response
          const loanData = await BorrowerinfoCommon.findOneWithKLID(
            newLoans[0].loan_id,
          );
          newLoans[0].status = loanData.status;
          newLoans[0].stage = loanData.stage;

          let chargesItems = [];
          newLoans.forEach((loanItem) => {
            let charge_types = [];

            let skipPFRecord = false;
            const productCached = JSON.parse(JSON.stringify(req.product));
            if (
              productCached.allow_loc &&
              productCached?.line_pf &&
              productCached.line_pf === 'drawdown'
            )
              skipPFRecord = true;

            if (
              productCached.allow_loc &&
              !productCached?.line_pf
            )
              skipPFRecord = true;


            if (loanItem.processing_fees_amt && !skipPFRecord) {
              charge_types.push(
                chargesHelper.createCharge(
                  'Processing Fees',
                  loanItem,
                  req.company._id,
                  req.product._id,
                ),
              );
            }

            // Add subvention fees charge
            if (loanItem.subvention_fees) {
              charge_types.push(
                chargesHelper.createCharge(
                  'Subvention Fees',
                  loanItem,
                  req.company._id,
                  req.product._id,
                ),
              );
            }

            // Add Convenience fees charge
            if (loanItem.conv_fees)
              charge_types.push(
                chargesHelper.createCharge(
                  'Convenience Fees',
                  loanItem,
                  req.company._id,
                  req.product._id,
                ),
              );

            // Add usage fees charge
            if (loanItem.usage_fee)
              charge_types.push(
                chargesHelper.createCharge(
                  'Usage Fees',
                  loanItem,
                  req.company._id,
                  req.product._id,
                ),
              );
              
            // Add application charge
            if (loanItem.application_fees)
              charge_types.push(
                chargesHelper.createCharge(
                  'Application Fees',
                  loanItem,
                  req.company._id,
                  req.product._id,
                ),
              );

            // Loop through the charge_types and add the createdBy and updatedBy field
            charge_types.forEach((chargesItems) => {
              chargesItems.created_by = req.user.email;
              chargesItems.updated_by = req.user.email;
            });

            if (charge_types.length)
              chargesItems = [...chargesItems, ...charge_types];
          });
          // Make db insertion call to charges collection
          if (chargesItems.length)
            await ChargesSchema.addMultipleRecords(chargesItems);

          if (req.product?.validations?.length > 0) {
            const leadData = await LoanRequestSchema.findByLId(req.body[0]?.loan_app_id)
            const hashedAadhaar = leadData?.aadhar_card_hash;
            const aadharVerified = leadData?.aadhar_verified;
            const prevLoanStatus = leadData?.loan_status;
            const prevStatus = leadData?.status;
            const prevLeadStatus = leadData?.lead_status;
  
            await LoanRequestSchema.updateLeadStatus(req.body[0]?.loan_app_id, {
              loan_status: "in_review",
              status: "in_review",
              lead_status: "in_review",
              prev_loan_status: prevLoanStatus,
              prev_status: prevStatus,
              prev_lead_status: prevLeadStatus
            });
  
            // Update loan status to 421 is aadhaar check enabled
            const _payload = {
              stage: 421,
              prev_stage: loanData?.stage,
              status: "in_review",
              prev_status: loanData?.status,
              aadhar_verified: aadharVerified,
              aadhar_card_hash: hashedAadhaar
            }
            await BorrowerinfoCommon.updateStageByProductChecks(req.body[0]?.loan_app_id, _payload);
          }
          return reqUtils.json(req, res, next, 200, {
            success: true,
            message: 'Loan details added successfully',
            data: newLoans,
          });
          // entry in charges table
        } else {
          return reqUtils.json(req, res, next, 400, {
            success: false,
            data: result,
          });
        }
      } catch (error) {
        if (error?.response?.status == 401) {
          return res.status(400).send({
            success: false,
            message: error.message,
          });
        }
        if (error?.response?.status == 500) {
          return res.status(400).send({
            success: false,
            message: 'Please contact administrator.',
          });
        }
        if (typeof error.errors === 'object') {
          let msg = '';
          Object.keys(error?.errors).forEach((item) => {
            msg = msg + '  ' + error.errors[item].properties?.message;
          });
          return res.status(400).send({
            success: false,
            message: msg,
            data: '',
          });
        }
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/loan/:_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        var data = {
          partner_loan_app_id: reqData.partner_loan_app_id,
          partner_borrower_id: reqData.partner_borrower_id,
          loan_id: reqData.loan_id,
          borrower_id: reqData.borrower_id,
          status: reqData.status,
          final_approve_date:
            reqData.final_approve_date || moment().format('YYYY-MM-DD'),
          sanction_amount: reqData.sanction_amount,
        };
        const sendMail = async (type, data) => {
          var companyId = req.company._id;
          if (!req.user)
            throw {
              message:
                'EX_LOAN_020 No users found against selected company. Kindly contact system administrator.',
            };
          data.user_name = req.user.username;
          const htmlcontent = mails.genericMails(type, data);
          const subject = `Loan has been moved to ${data.status} for below customer.`;
          var toEmail = process.env.FORCE_TO_EMAIL || req.user.email;
          service.sendMail(
            toEmail,
            subject,
            htmlcontent,
            (mailerr, mailres) => {
              if (mailerr)
                throw {
                  message:
                    'EX_LOAN_021 Failed to trigger e-mail. Kindly contact system administrator.',
                };
              return true;
            },
          );
        };
        const mailRes = await sendMail(data.status, reqData);
        if (!mailRes)
          throw {
            message: 'error while sending mail',
          };
        const updateLoanStatus = await validate.updateStatus(
          req.company,
          req.product,
          req.user,
          req.loanSchema,
          data,
        );
        return res.send(updateLoanStatus);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/borrowerinfostatusupdate/:_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        var data = {
          partner_loan_app_id: reqData.partner_loan_app_id,
          partner_borrower_id: reqData.partner_borrower_id,
          loan_id: reqData.loan_id,
          loan_app_id: reqData.loan_app_id,
          borrower_id: reqData.borrower_id,
          status: reqData.status,
          reason: reqData?.reason,
          remarks: reqData?.remarks,
          company_id: req?.company._id,
          company_code: req?.company.code,
          product_id: req?.product._id,
          user_id: req?.user._id,
          user_name: req?.user.username,
        };
        req.broadcastEventData = reqData;
        //get borrowerInfo_common data
        const borrowerInfocommonData = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (data.status != 'rejected') {
          if (
            borrowerInfocommonData.scr_status &&
            borrowerInfocommonData.scr_status != 'approved'
          ) {
            throw {
              success: false,
              message:
                'EX_LOAN_022 Failed to update loan status. Kindly contact system administrator.',
            };
          }
        }
        //add add and val of kyc_app_or_rejected_by for manual cases
        if (
          data.status == 'rejected' &&
          (data.reason == 'K01' ||
            data.reason == 'K02' ||
            data.reason == 'K03' ||
            data.reason == 'K04')
        ) {
          const AddStatusKeyResp = await BorrowerinfoCommon.updateLoanStatus(
            { kyc_app_or_rejected_by: req.user.email },
            data.loan_id,
          );
          const updatedRejectedLeadStatus =
            await LoanRequestSchema.updateLeadStatus(data.loan_app_id, {
              lead_status: 'rejected',
            });
          if (!AddStatusKeyResp)
            throw {
              success: false,
              message:
                'EX_LOAN_023 Failed to update loan status. Kindly contact system administrator.',
            };
          if (!updatedRejectedLeadStatus)
            throw {
              success: false,
              message:
                'EX_LOAN_024 Failed to update lead status. Kindly contact system administrator.',
            };
        }
        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, reqData.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;

        const updateLoanStatus = await loanStatus.updateStatus(req, data);
        if (updateLoanStatus.success === false) {
          throw {
            message: updateLoanStatus.message,
          };
        }
        if (data.reason == 'I09') {
          //update db state and src_status
          const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
            { scr_status: 'rejected' },
            data.loan_id,
          );
          const updatedRejectedLeadStatus =
            await LoanRequestSchema.updateLeadStatus(data.loan_app_id, {
              lead_status: 'rejected',
            });
          if (!updateStatusResp)
            throw {
              success: false,
              message:
                'EX_LOAN_023 Failed to update loan status. Kindly contact system administrator.',
            };
          if (!updatedRejectedLeadStatus)
            throw {
              success: false,
              message:
                'EX_LOAN_024 Failed to update lead status. Kindly contact system administrator.',
            };
        }
        if (
          data.status == 'rejected' &&
          (data.reason == 'K01' ||
            data.reason == 'K02' ||
            data.reason == 'K03' ||
            data.reason == 'K04')
        ) {
          req.webhookData = {
            event_key: 'kyc',
            data: {
              status: 'rejected',
              message: 'Loan is rejected',
              loan_id: data.loan_id,
              partner_loan_id: data.partner_loan_app_id,
            },
          };
          // call the webhook
          let webhookResp = await kycBroadcastEvent.partnerNotify(req);
          if (webhookResp !== true) {
            throw {
              sucess: false,
              message: 'Something went Wrong',
            };
          }
        }
        next();
        return res.send(updateLoanStatus);
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
    broadcastEvent.fireDisbursalApprovedStatusEvent,
  );

  app.put(
    '/api/borrowerinfostatusupdate/accept/:_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;

        var data = {
          scr_approved_by: req.user.email,
          updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          loan_id: reqData.loan_id,
          scr_status: 'approved',
          stage: 902,
        };
        const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
          data,
          data.loan_id,
        );
        if (!updateStatusResp)
          throw {
            success: false,
            message:
              'EX_LOAN_024 Failed to update loan status. Kindly contact system administrator.',
          };
        return res.status(200).send({ success: true });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/borrowerinfo/update_disbursement_dates',
    [AccessLog.maintainAccessLog],
    async (req, res, next) => {
      try {
        //cw.track(req);
        const reqData = req.body;
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg:
              'EX_LOAN_025 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
          },
          {
            field: 'disbursement_date',
            type: 'date',
            checked: 'TRUE',
            validationmsg:
              'EX_LOAN_026 Invalid disbusement date. Kindly verify if disbursement date is in YYYY-MM-DD format.',
          },
        ];
        //validate request data with above data
        const result = await validate.validateDataWithTemplate(
          template,
          reqData,
        );
        if (!result)
          throw {
            message:
              'EX_LOAN_027 Mismatch between request payload and loan product template. Kindly verify if API payload is accurate.',
          };
        if (result.unknownColumns.length)
          throw {
            message: 'Few columns are unknown',
            data: {
              unknownColumns: result.unknownColumns,
            },
          };
        if (result.missingColumns.length)
          throw {
            message:
              'EX_LOAN_028 Parameters mentioned below are mandatory. Kindly ensure that they are included in request payload and try again.',
            data: {
              missingColumns: result.missingColumns,
            },
          };
        if (result.errorRows.length)
          throw {
            message:
              'EX_LOAN_029 Data passed for the below mentioned parameters is invalid. Kindly modify data being passed and try again.',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
          };
        //making array off all loan ids
        const bookkingLoanIds = result.validatedRows.map((item) => {
          return item.loan_id;
        });
        // Make array of all unique loan ids so that there is no repetition of ids
        const uniqueLoanIds = [...new Set(bookkingLoanIds)];
        // Check if all the unique loan ids are present in borrower info
        const biFindResp =
          await BorrowerinfoCommon.fastFindExistingKLIByIds(uniqueLoanIds);
        const biFindRes = [biFindResp];
        if (!biFindRes)
          throw {
            message:
              "EX_LOAN_030 Loan ID's not found. Kindly verify if entered Loan ID's are correct.",
          };
        if (biFindRes.length !== uniqueLoanIds.length) {
          let missingIds = [];
          const presentIds = biFindRes.map((record) => {
            return record.loan_id;
          });
          uniqueLoanIds.forEach((loanId) => {
            if (presentIds.indexOf(loanId) <= -1)
              missingIds.push({
                loan_id: loanId,
              });
          });
          throw {
            message: `EX_LOAN_031 Loan ID's not found. Kindly verify if entered Loan ID's are correct.`,
            data: {
              missingIds: missingIds,
            },
          };
        }
        // Check if any loans are closed in borrower info and return error
        let closedLoans = [];
        biFindRes.forEach((record) => {
          if (record.status === 'closed')
            closedLoans.push({
              loan_id: record.loan_id,
            });
        });
        if (closedLoans.length)
          throw {
            message:
              "EX_LOAN_032 Certain Loan ID's are closed. Kindly verify if entered Loan ID's are correct.",
            closedLoanIds: closedLoans,
          };
        const updateRes = await BorrowerinfoCommon.updateDisburseDates(
          result.validatedRows,
        );
        if (!updateRes)
          throw {
            message:
              'EX_LOAN_033 Failed to update disbursement dates. Kindly contact system administrator.',
          };
        return reqUtils.json(req, res, next, 200, {
          message: 'Disbursement dates updated successfully.',
        });
      } catch (error) {
        return res.status(400).send({
          error,
        });
      }
    },
  );

  app.post(
    '/api/update_insurance_details',
    [
      check('loan_id').notEmpty().withMessage('Bookking loan id is required'),
      check('insurance_amt')
        .notEmpty()
        .withMessage(
          'EX_LOAN_034 Insurance amount is a mandatory parameter. Kindly ensure that valid amount is being passed.',
        ),
    ],
    //[jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, services.isServiceEnabled(process.env.SERVICE_INSURANCE_ID), AccessLog.maintainAccessLog],
    async (req, res, next) => {
      try {
        //cw.track(req);
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const data = req.body;
        const biFindRes = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (!biFindRes)
          throw {
            message:
              'EX_LOAN_035 No loan record found against the queried loan ID or borrower ID. Kindly verify if entered loan ID or borrower ID is correct.',
          };
        if (
          biFindRes.status !== 'credit_approved' &&
          biFindRes.status !== 'kyc_data_approved' &&
          biFindRes.status !== 'disbursal_approved'
        )
          throw {
            message: `EX_LOAN_036 Loan status is '${biFindRes.status}'. Cannot update insurance details.`,
          };
        if (biFindRes.insurance_details === 1)
          throw {
            message:
              'EX_LOAN_037 Insurance details exist for this loan ID. Kindly verify if entered loan ID is correct.',
          };
        if (biFindRes.insured === 1)
          throw {
            message:
              'EX_LOAN_038 Insurance details exist for this loan ID. Kindly verify if entered loan ID is correct.',
          };
        biFindRes.insurance_amt = data.insurance_amt;
        biFindRes.insurance_details = 1;
        biFindRes.total_charges = (
          +biFindRes.total_charges + +data.insurance_amt
        ).toFixed(2);
        biFindRes.net_disbur_amt = (
          +biFindRes.net_disbur_amt - +data.insurance_amt
        ).toFixed(2);
        const updtRes = await BorrowerinfoCommon.updateBI(biFindRes);
        if (!updtRes)
          throw {
            message: 'Error while updating borrower info.',
          };
        return reqUtils.json(req, res, next, 200, {
          message: 'Insurance details updated successfully',
          loan_id: biFindRes.loan_id,
          insurance_amt: biFindRes.insurance_amt,
          updated_disbursement_amt: biFindRes.net_disbur_amt,
          updated_total_charges: biFindRes.total_charges,
        });
      } catch (error) {
        return res.send({
          error,
        });
      }
    },
  );

  //update borrowerinfo common table and and loan type related table by loan_id and borrower_id
  app.put(
    '/api/loan',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const biReqData = req.body;
        const reqData = Array.isArray(biReqData) ? biReqData : [biReqData];
        //find the custom template path of requested template type
        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'loan',
        );
        if (!loanTemplate)
          throw {
            success: false,
            message:
              'EX_LOAN_039 No records found. Kindly verify if search paramters are accurate',
          };
        //fetch the custom template json data from s3 by path
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        if (!resultJson)
          throw {
            success: false,
            message:
              'EX_LOAN_040 Error fetching data from server. Kindly contact system administrator',
          };
        //validate the incoming template data with customized template data
        const result = await validate.validateDataWithTemplate(
          resultJson,
          reqData,
        );
        if (!result)
          throw {
            success: false,
            message:
              'EX_LOAN_041 Mismatch between request payload and loan product template. Kindly verify if API payload is accurate.',
          };
        if (result.unknownColumns.length)
          throw {
            success: false,
            message:
              'EX_LOAN_042 Parameters mentioned below are not accepted. Kindly ensure that they are not included in request payload and try again.',
            data: {
              unknownColumns: result.unknownColumns,
            },
          };
        if (result.missingColumns.length)
          throw {
            success: false,
            message:
              'EX_LOAN_043 Parameters mentioned below are mandatory. Kindly ensure that they are included in request payload and try again.',
            data: {
              missingColumns: result.missingColumns,
            },
          };
        if (result.errorRows.length)
          throw {
            success: false,
            message:
              'EX_LOAN_044 Data passed for the below mentioned parameters is invalid. Kindly modify data being passed and try again.',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
          };
        if (result.exactEnumErrorColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: `${result.exactEnumErrorColumns[0]}`,
            errorCode: '02',
            data: {
              exactEnumErrorColumns: result.exactEnumErrorColumns,
            },
          });
        if (result.validatedRows.length == reqData.length) {
          const loanAppIds = reqData.map((item) => {
            return item.loan_app_id;
          });
          //find whether data exists in borrowerinfo table by loan_app_id
          const liIdsList =
            await BorrowerinfoCommon.findByLoanAppIds(loanAppIds);
          if (!liIdsList)
            throw {
              success: false,
              message:
                'EX_LOAN_045 Failed to fetch loan data. Kindly try again in a few minutes or contact the system administrator',
            };
          if (!liIdsList.length)
            throw {
              success: false,
              message:
                'EX_LOAN_046 No record found matching entered loan ID. Kindly verify if correct loan ID has been entered.',
            };

          if (liIdsList.length !== loanAppIds.length) {
            throw {
              success: false,
              message:
                "EX_LOAN_047 No records found matching certain entered loan ID's. Kindly verify if correct loan ID's have been entered.",
            };
          }
          const alreadyApproved = liIdsList.filter((row) => {
            row.stage >= 4;
          });
          if (alreadyApproved.length) {
            throw {
              success: false,
              message:
                "EX_LOAN_048 Selected loans cannot be updated as they are at the stage 'Disbursed'. Kindly modify the stage before attempting update or contact support for futher assistance.",
              data: {
                alreadyApproved: alreadyApproved,
              },
            };
          }

          for (var i = 0; i < reqData.length; i++) {
            if (reqData[i].tenure && req.product.loan_tenure) {
              if (Number(reqData[i].tenure) > Number(req.product.loan_tenure))
                throw {
                  message: `EX_LOAN_049 Loan tenure cannot be greater than ${req.product.loan_tenure}. Kindly reduce the loan tenure in order to proceed.`,
                };
            }
            if (reqData[i].sanction_amount && req.product.max_loan_amount) {
              if (
                Number(reqData[i].sanction_amount) >
                Number(req.product.max_loan_amount)
              )
                throw {
                  message: `EX_LOAN_050 Sanction amount cannot be greater than ${req.product.max_loan_amount}. Kindly reduce the sanction amount in order to proceed.`,
                };
            }
          }

          await leadHelper.fetchLead(reqData[0].loan_app_id, req, res);

          let leadsData = JSON.parse(JSON.stringify(req.lead));
          let borrowerData = JSON.parse(
            JSON.stringify(result.validatedRows[0]),
          );
          const lmsPostData = await Object.assign(leadsData, borrowerData);
          let brokenInterest = 0;
          let gstAmount = 0;
          // Check if calculateGstForProduct flag is active and lms_version is origin_lms
          if (
            req.product.calculateGstForProduct &&
            req.company.lms_version === 'origin_lms'
          ) {
            const gstCalculation = await calculation.calculateGST(
              lmsPostData,
              req.product,
            );
            if (!gstCalculation.success) {
              throw {
                ...gstCalculation,
              };
            }
            gstAmount = gstCalculation?.calculatedGstAmt;
            result.validatedRows.forEach((item) => {
              item.cgst_amount = gstCalculation?.calculatedCgst;
              item.sgst_amount = gstCalculation?.calculatedSgst;
              item.igst_amount = gstCalculation?.calculatedIgst;
              item.gst_on_pf_amt = gstCalculation?.calculatedGstAmt;
            });
          }
          // Check if calculate_broken_interest flag is active and lms_version is origin_lms
          if (
            req.product.calculate_broken_interest &&
            req.company.lms_version === 'origin_lms'
          ) {
            brokenInterestResp = await calculation.calculateBrokenInterest(
              lmsPostData,
              req.product,
            );
            if (!brokenInterestResp.success) {
              throw {
                ...brokenInterestResp,
              };
            }
            brokenInterest = brokenInterestResp.brokenInterestAmount;
          }
          result.validatedRows.forEach((item) => {
            item.broken_interest = brokenInterest;
          });
          if (req.company.lms_version === 'origin_lms') {
            const netDisbursementAmount =
              await calculation.calculateNetDisbursementAmount(
                brokenInterest,
                gstAmount,
                lmsPostData,
                req.product,
              );
            if (!netDisbursementAmount.success) {
              throw {
                ...netDisbursementAmount,
              };
            }
            result.validatedRows.forEach((item) => {
              item.net_disbur_amt =
                netDisbursementAmount?.netDisbursementAmount;
            });
          }

          const validateBRE = await thirdPartyHelper.LMSBREValidation(
            req,
            reqData[0],
          );
          if (validateBRE.success) {
            result.validatedRows.forEach((item, index) => {
              item.stage = 0;
              item.status = 'open';
            });
            if (
              req.company.lms_version !== 'origin_lms' ||
              req.company.lms_version === 'legacy_lms'
            ) {
              const LMS_BORROWER_INFO_DATA = {
                product_key: req.product.name,
                ...result.validatedRows[0],
                loan_id: liIdsList.find(
                  (lids) =>
                    lids.loan_app_id === result.validatedRows[0]?.loan_app_id,
                )?.loan_id,
              };
              const lmsUpdateLoan = await thirdPartyHelper.LMSUpdateLOAN(
                req,
                LMS_BORROWER_INFO_DATA,
              );
              if (!lmsUpdateLoan?.success && !lmsUpdateLoan?.flag) {
                return res.status(400).json(lmsUpdateLoan);
              }
              if (lmsUpdateLoan?.flag) {
                return reqUtils.json(req, res, next, 200, {
                  message: 'Loan info updated successfully',
                  updatedLoan: updatedLoans,
                });
              }
            } else {
              const updateLeadStatus = await LoanRequestSchema.updateStatus(
                result.validatedRows,
                'open',
              );
              const updatedLoans = await BorrowerinfoCommon.updateBulk(
                result.validatedRows,
              );
              if (!updatedLoans) {
                throw {
                  success: false,
                  message:
                    'EX_LOAN_051 Failed to update borrower info. Kindly try again in a few minutes or contact the system administrator.',
                };
              }
              return reqUtils.json(req, res, next, 200, {
                message: 'Loan info updated successfully',
                updatedLoan: updatedLoans,
              });
            }
          } else {
            throw {
              success: false,
              message:
                'EX_LOAN_052 Failed to validate BRE data. Kindly try again in a few minutes or contact the system administrator.',
              data: validateBRE,
            };
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/borrowerinfo/get_loan_list',
    async (req, res, next) => {
      try {
        //cw.track(req);
        const data = req.body.data;
        const paginate = req.body.paginate || {};
        var startTime, endTime;
        startTime = new Date();
        if (!data.loan_id) delete data.loan_id;
        if (!data.status) delete data.status;
        if (!data.company_id) delete data.company_id;
        if (!data.product_id) delete data.product_id;
        if (data.from_date || data.to_date) {
          let created_at = {};
          let fromDate;
          let toDate;
          const currDate = new Date().setUTCHours(23, 59, 59);
          if (data.from_date) {
            fromDate = new Date(data.from_date).setUTCHours(0, 0, 0);
            if (fromDate > currDate)
              throw {
                message:
                  'EX_LOAN_054 From date should precede Current date. Kindly verify if correct From date was selected.',
              };
            delete data.from_date;
            Object.assign(created_at, {
              $gte: fromDate,
            });
          }
          if (data.to_date) {
            toDate = new Date(data.to_date).setUTCHours(23, 59, 59);
            if (fromDate && fromDate > toDate)
              return res.status(400).json({
                message:
                  'EX_LOAN_053 From date should precede To date. Kindly verify if correct From date was selected.',
              });
            delete data.to_date;
            Object.assign(created_at, {
              $lte: toDate,
            });
          }
          data.created_at = created_at;
        }
        const response = await BorrowerinfoCommon.getLoanList(data, paginate);
        if (response.count == 0)
          throw {
            message: 'No records found',
          };
        if (!response)
          throw {
            message:
              'EX_LOAN_055 Failed to fetch loan data. Kindly try again in a few minutes or contact the system administrator.',
          };
        const bookkingLoanIds = response.rows.map((item) => {
          return item.loan_id;
        });
        const lrfindresp =
          await LoanRequestSchema.fastFindExistingKLIByIds(bookkingLoanIds);
        const lrfindres = [lrfindresp];
        if (!lrfindres)
          throw {
            Message:
              'EX_LOAN_056 Failed to fetch lead data. Kindly try again in a few minutes or contact the system administrator.',
          };
        var totalSum = response.rows;
        let total_loan_amount = 0;
        let total_disbur_amt = 0;
        totalSum.forEach((item, index) => {
          total_loan_amount +=
            item.sanction_amount !== null
              ? parseFloat(item.sanction_amount)
              : 0;
          total_disbur_amt +=
            item.net_disbur_amt !== null ? parseFloat(item.net_disbur_amt) : 0;
        });
        total_loan_amount = parseFloat(total_loan_amount).toFixed(2);
        total_disbur_amt = parseFloat(total_disbur_amt).toFixed(2);
        let resData = [];
        if (response && lrfindres.length) {
          response.rows.forEach((birow) => {
            lrfindres.forEach((lrrow) => {
              if (birow.loan_id === lrrow.loan_id) {
                Object.assign(birow, lrrow);
                resData.push(birow);
              }
            });
          });
        }
        return reqUtils.json(req, res, next, 200, {
          rows: response,
          count: response.count,
          total_loan_amount,
          total_disbur_amt,
          success: true,
        });
        //in case of any errors in ekyc, send loan bucket without it
        var defaultItems = () => {
          reqUtils.json(req, res, next, 200, {
            rows: resData,
            count: response.count,
          });
        };
        if (process.env.DISABLE_EKYC_STORE) {
          return defaultItems();
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.put(
    '/api/dues_and_intrest_configuration',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    [
      check('fees')
        .notEmpty()
        .withMessage('fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid fees'),
      check('subvention_fees')
        .notEmpty()
        .withMessage('subvention_fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid subvention_fees'),
      check('processing_fees')
        .notEmpty()
        .withMessage('processing_fees is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid processing_fees'),
      check('usage_fee')
        .notEmpty()
        .withMessage('usage_fee is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA|RA|RP)$/)
        .withMessage('Please enter valid usage_fee'),
      check('upfront_interest')
        .notEmpty()
        .withMessage('upfront_interest is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(UP|UA)$/)
        .withMessage('Please enter valid upfront_interest'),
      check('int_value')
        .notEmpty()
        .withMessage('int_value is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(A|P)$/)
        .withMessage('Please enter valid int_value'),
      check('interest_free_days')
        .notEmpty()
        .withMessage('interest_free_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid interest_free_days')
        .isNumeric()
        .withMessage('interest_free_days should be numeric'),
      check('exclude_interest_till_grace_period')
        .notEmpty()
        .withMessage('exclude_interest_till_grace_period is required'),
      check('tenure_in_days')
        .notEmpty()
        .withMessage('tenure_in_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid tenure_in_days')
        .isNumeric()
        .withMessage('tenure_in_days should be numeric'),
      check('grace_period')
        .notEmpty()
        .withMessage('grace_period is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid grace_period')
        .isNumeric()
        .withMessage('grace_period should be numeric'),
      check('overdue_charges_per_day')
        .notEmpty()
        .withMessage('overdue_charges_per_day is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(RA|RP)$/)
        .withMessage('Please enter valid overdue_charges_per_day'),
      check('penal_interest')
        .notEmpty()
        .withMessage('penal_interest is required')
        .matches(/^(\d{1,8})(.\d{1,4})?(RA|RP)$/)
        .withMessage('Please enter valid penal_interest'),
      check('overdue_days')
        .notEmpty()
        .withMessage('overdue_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid overdue_days')
        .isNumeric()
        .withMessage('overdue_days should be numeric'),
      check('penal_interest_days')
        .notEmpty()
        .withMessage('penal_interest_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid penal_interest_days')
        .isNumeric()
        .withMessage('penal_interest_days should be numeric'),
      check('upfront_interest_days')
        .notEmpty()
        .withMessage('upfront_interest_days is required')
        .isLength({
          min: 1,
          max: 30,
        })
        .withMessage('Please enter valid upfront_interest_days')
        .isNumeric()
        .withMessage('upfront_interest_days should be numeric'),
      check('loan_id')
        .notEmpty()
        .withMessage(
          'EX_LOAN_086 Loan ID must be specified. Kindly ensure that a valid value is being passed.',
        ),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
            success: false,
          });
        let intrestDpdLogData = {
          user_id: req.user._id,
          user_name: req.user.username,
          added_date: moment().toLocaleString(),
          company_id: req.company._id,
          product_id: req.product._id,
          destination: 'borrower',
          fees: req.body.fees,
          subvention_fees: req.body.subvention_fees,
          processing_fees: req.body.processing_fees,
          usage_fee: req.body.usage_fee,
          upfront_interest: req.body.upfront_interest,
          int_value: req.body.int_value,
          interest_free_days: req.body.interest_free_days,
          exclude_interest_till_grace_period:
            req.body.exclude_interest_till_grace_period,
          tenure_in_days: req.body.tenure_in_days,
          grace_period: req.body.grace_period,
          overdue_charges_per_day: req.body.overdue_charges_per_day,
          penal_interest: req.body.penal_interest,
          overdue_days: req.body.overdue_days,
          penal_interest_days: req.body.penal_interest_days,
        };
        const logres = await intrestDpdConfigRevision.addLog(intrestDpdLogData);
        if (!logres)
          throw {
            message:
              'EX_LOAN_087 Failed to add revision log. Kindly contact system administrator.',
            success: false,
          };
        const borrowerDuesResp =
          await BorrowerinfoCommon.updateDuesAndIntrestConfiguration(
            req.body,
            req.body.loan_id,
          );
        if (!borrowerDuesResp)
          throw {
            message:
              'EX_LOAN_088 Failed to update successfully. Kindly contact system administrator.',
            success: false,
          };
        return reqUtils.json(req, res, next, 200, {
          message: 'Borrower dues data updated Successfully',
          success: true,
        });
      } catch (error) {
        return res.status(400).send({
          error,
        });
      }
    },
  );

  app.post('/api/get_borrowerinfo_dues', async (req, res) => {
    try {
      const borrowerResp = await BorrowerinfoCommon.findOneWithKLID(
        req.body.loan_id,
      );
      if (!borrowerResp)
        throw {
          message: 'No Record found in borrower info',
        };
      return res.send(borrowerResp);
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  });

  app.put(
    '/api/update_borrowerinfo',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const biReqData = req.body;
        const reqData = [biReqData];
        //find the custom template path of requested template type
        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'loan',
        );
        if (!loanTemplate)
          throw {
            message: 'No records found for loan template',
          };
        //fetch the custom template json data from s3 by path
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        if (!resultJson)
          throw {
            message: 'Error fetching json from s3',
          };
        //validate the incoming template data with customized template data
        const result = await validate.validateDataWithTemplate(
          resultJson,
          reqData,
        );
        if (!result)
          throw {
            message: 'Error while validating data with template',
          };
        if (result.unknownColumns.length)
          throw {
            message: 'Few columns are unknown',
            data: {
              unknownColumns: result.unknownColumns,
            },
          };
        if (result.missingColumns.length)
          throw {
            message: 'Few columns are missing',
            data: {
              missingColumns: result.missingColumns,
            },
          };
        if (result.errorRows.length)
          throw {
            message: 'Few fields have invalid data',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
          };
        if (result.validatedRows.length == reqData.length) {
          const Objkeys = resultJson
            .filter((item) => {
              return item.checked;
            })
            .map((obj) => {
              return obj.field;
            });
          // Fetch the same borrower info to be updated from BI schema
          const response = await BorrowerinfoCommon.findOneWithKBI(
            biReqData.borrower_id,
          );
          if (!response)
            throw {
              message: 'Error while finding Borrower Info.',
            };
          if (response) {
            const borrowerInfo = JSON.parse(JSON.stringify(response));
            Objkeys.forEach((key) => {
              if (borrowerInfo[key]) {
                borrowerInfo[key] = biReqData[key];
              }
            });

            const loanId = borrowerInfo?.loan_id;
            const loan_app_id = (borrowerInfo.updated_at = moment().format(
              'YYYY-MM-DD HH:mm:ss',
            ));
            delete borrowerInfo._id;
            delete borrowerInfo.created_at;
            delete borrowerInfo.loan_id;
            delete borrowerInfo.loan_app_id;
            delete borrowerInfo.partner_loan_app_id;
            delete borrowerInfo.borrower_id;
            delete borrowerInfo.company_id;
            delete borrowerInfo.product_id;
            delete borrowerInfo.partner_loan_id;
            delete borrowerInfo.partner_borrower_id;

            updateResp = await BorrowerinfoCommon.updateBI(
              borrowerInfo,
              loanId,
            );

            if (!updateResp) throw { message: 'Error while updating BI data.' };
            if (updateResp) {
              return res.json({
                message: 'Borrower info updated successfully',
                borrowerInfo,
              });
            }
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.patch(
    '/api/loan_nach/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.validateLoanPatchData,

    async (req, res) => {
      try {
        const { loan_id } = req.params;
        const data = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });

        //Validate if loan exist by loan_id
        const loanData = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;

        //Update necessary data
        const borrowerInfo = await BorrowerinfoCommon.updateBI(data, loan_id);
        if (borrowerInfo)
          res.send({
            success: true,
            message: 'Loan updated successfully',
          });
        else
          throw {
            success: false,
            message: 'Failed to update loan details',
          };
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/get-customer-id/:loanId',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try{
        const loanAppId= req.params.loanId;
        const data = await LoanRequestSchema.findByLId(loanAppId);
        const customerId = data.cust_id;

        res.status(200).send(customerId);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  )

  app.patch('/api/mark_repo', 
  [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
  
  async (req, res) => {
    try {
      const data = req.body;
      const query = {
        loan_id: data.loan_id,
      };
      const isRepoDetails = {
        is_repoed: data.is_repoed,
      };
      await BorrowerinfoCommon.findOneAndUpdate(query, isRepoDetails);
      return res.status(200).send({
        message: 'Repo status updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  })
};

async function configureCoLenderLoans(req) {
  const colenderAsgmntId = req.body[0]?.co_lender_assignment_id;
  if (!colenderAsgmntId) {
    throw {
      message: 'Colender assignment ID field is missing',
    };
  }
  //Check if co_lender assignment id already exists
  const isColenderAssignmentIdExists =
    await BorrowerinfoCommon.isColenderAssignmentIdExists(colenderAsgmntId);
  if (isColenderAssignmentIdExists) {
    throw {
      message: 'Colender assignment ID already exists',
    };
  }
  //Fetching Colender Assignment Details
  const colenderAssignmentDetails =
    await ColenderAssignment.findColenderAssignmentDetails(
      colenderAsgmntId,
      req.body[0]?.loan_app_id,
    );
  if (!colenderAssignmentDetails) {
    throw {
      message: 'Exception: Invalid Assignment Id',
    };
  }

  const colenderId = colenderAssignmentDetails?.co_lender_id;
  if (!colenderId) {
    throw {
      message: 'Colender ID field is missing',
    };
  }

  // Fetching Colender Profile Details
  const colenderProfileDetails =
    await ColenderProfile.findColenderProfileDetails(colenderId);
  const colenderName = colenderProfileDetails[0]?.co_lender_shortcode;
  if (!colenderName) {
    throw {
      message: 'Co-lender Profile details not found for assigned co_lender',
    };
  }

  const colenderStatus = colenderProfileDetails[0]?.status;
  if (!colenderStatus) {
    throw {
      message: 'Co-lender Profile status not found for assigned co_lender',
    };
  }
  if (colenderStatus === 0) {
    throw {
      message: 'Co-lender is Inactive',
    };
  }
  if (
    colenderStatus === 1 &&
    !process.env.NON_COLENDER_NAMES.includes(colenderName)
  ) {
    req.result.validatedRows[0].co_lend_flag = 'Y';
    req.result.validatedRows[0].co_lender_id = colenderId;
  } else {
    req.result.validatedRows[0].co_lend_flag = 'N';
    req.result.validatedRows[0].co_lender_id = colenderId;
  }
}

async function callBureauValidation(req, res, lmsPostData) {
  if (req.product.bureau_partner_name && req.product.bureau_check) {
    // Check required scenarios and make call to the bureau api
    const bureauServiceCallResp = await kycServices.BureauServiceCall(
      req,
      res,
      lmsPostData,
    );

    return bureauServiceCallResp;
  }
}

async function ckycAndPanValidation(lmsPostData, req, res) {
  const loanReqData = {
    ...lmsPostData,
  };
  var ckycDownload = '';
  var panKYCResp = '';
  //check for the perform_kyc flag in the product
  if (req.product.ckyc_search) {
    //check for mandatory dob and pan in payload
    if (!loanReqData.appl_pan || !loanReqData.dob)
      throw { success: false, message: 'appl_pan and dob in mandatory.' };
    //Make call to ckyc search helper function
    const ckycSearchResponse = await kycServices.CKYCSearch(
      req,
      res,
      loanReqData,
    );
    if (ckycSearchResponse.success) {
      //make call to the ckyc_download api
      loanReqData.ckyc_id = ckycSearchResponse.ckyc_id;
      ckycDownload = await kycServices.CKYCDownload(req, res, loanReqData);
    } else {
      //make call to the pan kyc api
      panKYCResp = await kycServices.PanKYC(req, res, loanReqData);
    }
  }
  return { ckycDownload, loanReqData, panKYCResp };
}

async function callNameMatchingAPI(ckycDownload, req, loanReqData, panKYCResp) {
  var nameMatchResValue = {
    name_match_conf: 0,
  };
  const ckycFullName =
    ckycDownload.data?.data?.PID_DATA?.PERSONAL_DETAILS?.FULLNAME;
  if (ckycFullName) {
    nameMatchResValue = await kycServices.NameMatchWithCKYC(
      req,
      ckycFullName,
      loanReqData,
    );
  }

  // name matching api call with pan kyc api
  const panName = panKYCResp.data?.data?.result?.name;
  if (nameMatchResValue.name_match_conf < 0.6 && panName) {
    nameMatchResValue = await kycServices.NameMatchWithPAN(
      req,
      panName,
      loanReqData,
    );
  }
  return nameMatchResValue;
}

async function callPinCodeMatchingAPI(ckycDownload, req, loanReqData) {
  const corresPin =
    ckycDownload.data?.data?.PID_DATA?.PERSONAL_DETAILS?.CORRES_PIN;
  const permPin = ckycDownload.data?.data?.PID_DATA?.PERSONAL_DETAILS?.PERM_PIN;
  if (ckycDownload.data) {
    pinMatchRes = await kycServices.PinMatchWithCKYC(
      req,
      corresPin,
      permPin,
      loanReqData,
    );
  }
}

async function callOKYCAPI(ckycDownload, nameMatchResValue, loanReqData, req) {
  if (
    !ckycDownload.data?.success === true ||
    nameMatchResValue.success === false
  ) {
    OKYCResp = await kycServices.OKYC(loanReqData, req.company.name);
  }
}

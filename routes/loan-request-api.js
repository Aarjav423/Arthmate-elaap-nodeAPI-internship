bodyParser = require('body-parser');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequest = require('../models/loan-request-schema.js');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const validate = require('../util/validate-req-body');
const jwt = require('../util/jwt');
const AccessLog = require('../util/accessLog');
const cacheUtils = require('../util/cache');
let reqUtils = require('../util/req.js');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const middlewares = require('../utils/middlewares.js');
const LoanActivities = require('../models/loan-activities-schema.js');
const Product =require('../models/product-schema.js');
const thirdPartyHelper = require('../util/thirdPartyHelper');
const kycServices = require('../utils/kyc-services.js');
const { generateCustomerId, addCustomerTagAndLoanAppId } = require('../util/customLoanIdHelper');
const {
  trackWizzService,
} = require('../utils/track-wizz-service/track-wizz-service');
const DocumentMappingSchema = require('../models/document-mappings-schema.js');
const LoanDocumentSchema = require('../models/loandocument-common-schema');
const leadHelper = require('../util/lead');
const AssignmentSchema = require('../models/co-lender-assignment-schema');
const ColenderProfile = require('../models/co-lender-profile-schema.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //get loan request template
  app.get(
    '/api/loanrequest/get_loan_request_template',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const loanTemplates = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'lead',
        );
        if (!loanTemplates)
          throw {
            message: 'No records found',
          };
        const loanTemplateJson = await s3helper.fetchJsonFromS3(
          loanTemplates.path.substring(loanTemplates.path.indexOf('templates')),
        );
        if (!loanTemplateJson)
          throw {
            message: 'Error while fetching template from s3',
          };
        const loanRequest = helper.generateLrTemplate(loanTemplateJson);
        res.send(loanRequest);
        next();
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  app.get(
    '/api/lead/:company_id/:product_id/:from_date/:to_date/:page/:limit/:str/:status',
    [
      jwt.verifyTokenSkipCIDPID,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
    ],
    async (req, res) => {
      try {
        const {
          company_id,
          product_id,
          from_date,
          to_date,
          str,
          book_entity_id,
          page,
          limit,
          status,
        } = req.params;
        const {is_msme}=req.query;
        if (req.authData.skipCIDPID &&  is_msme!== '' &&
        is_msme !== null &&
        is_msme !== 'null' &&
        is_msme !== undefined) {
          const singleLeadRecords = await LoanRequest.findOneGlobalSearch(
            req.params,
          );
        
          const Products = await Product.getAllMsmeProductsGlobally();
        
          if (!singleLeadRecords && !Products)
          throw {
            success: false,
            message: 'No msme product ',
          };
          const productIds = Array.from(Products).map(prod => prod._id)
        
             let rows = singleLeadRecords.filter(lead => productIds.includes(lead.product_id))
             return res.send({
              rows:rows,
              count : rows.length
             })
          
        }
        

        if (req.authData.skipCIDPID && str) {
          const singleLeadRecord = await LoanRequest.findOneGlobalSearch(
            req.params,
          );         
          if (!singleLeadRecord)
            throw {
              success: false,
              message: 'No records found for loan id or borrower id',
            };
          if (!singleLeadRecord.length)
            throw {
              success: false,
              message: 'No records found',
            };
          return res.send({
            rows: singleLeadRecord,
            count: 1,
          });  
      }

        if (process.env.MAXIMUM_DATE_RANGE) {
          //Calculate the from date and to date diff in days and validate with MAXIMUM_DATE_RANGE
          let fromDate = moment(from_date);
          let toDate = moment(to_date);
          let days = toDate.diff(fromDate, 'days');
          if (days > process.env.MAXIMUM_DATE_RANGE) {
            throw {
              success: false,
              message: `from_date and to_date should be within ${process.env.MAXIMUM_DATE_RANGE} days`,
            };
          }
        }

        const lrList = await LoanRequestSchema.getAllByFilter({
          company_id,
          product_id,
          from_date,
          to_date,
          str,
          book_entity_id,
          page,
          limit: Number(limit),
          status,
        });
        // const activityLog = await LoanRequestSchema.getLeadActivity();
        const leadData = await Promise.all(
          lrList?.rows.map(async (lr) => {
            let lead;
            lead = JSON.parse(JSON.stringify(lr));
            lead.product_name = req.product.name;
            lead.party_type = req.product.party_type
              ? req.product.party_type
              : 'null';
            lead.aadhaar_type = req.product.aadhaar_type
              ? req.product.aadhaar_type
              : 'null';
            lead.pan_type = req.product.pan_type
              ? req.product.pan_type
              : 'null';
            lead.partner_name = `${req.company.name} (${req.company.code})`;
            return lead;
          }),
        );

        return res.send({
          rows: leadData,
          count: lrList.count,
        });
      } catch (error) {
        console.log('api/lead error', error);
        return res.status(400).send(error);
      }
    },
  );

  //create lead
  app.post(
    '/api/lead',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
      middlewares.parseAndEvaluateArray,
    ],
    async (req, res, next) => {
      try {
        var loanReqData = req.body;
        loanReqData = reqUtils.cleanBody(loanReqData);
        const borrowerData = loanReqData[0].coborrower;
        delete loanReqData[0]["coborrower"];
        const guarantorData = loanReqData[0].guarantor;
        delete loanReqData[0]["guarantor"];
        const loanRequestTemplates = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'lead',
        );

        if (!loanRequestTemplates)
          throw {
            message: 'No records found for loan request templates',
          };

        const resultLoanReqJson = await s3helper.fetchJsonFromS3(
          loanRequestTemplates.path.substring(
            loanRequestTemplates.path.indexOf('templates'),
          ),
          {
            method: 'Get',
          },
        );

        if (!resultLoanReqJson)
          throw {
            message: 'Error fetching json from s3',
          };

        if (borrowerData) {
          for (const coborrower of borrowerData) {
            const fieldNames = Object.keys(coborrower);
            for (const fieldName of fieldNames) {
              const fieldValidation = validate.validateDataWithTemplate(
                resultLoanReqJson.filter(column => column.field === fieldName),
                coborrower[fieldName],
              );

              if (!fieldValidation) {
                throw {
                  message: `Fields are missing in schema`,
                };
              }
            }
          }
        }
        if (guarantorData) {
          for (const guarantor of guarantorData) {
            const fieldNames = Object.keys(guarantor);
            for (const fieldName of fieldNames) {
              const fieldValidation = validate.validateDataWithTemplate(
                resultLoanReqJson.filter(column => column.field === fieldName),
                guarantor[fieldName],
              );

              if (!fieldValidation) {
                throw {
                  message: `Fields are missing in schema`,
                };
              }
            }
          }
        }
        const validData = validate.validateDataWithTemplate(
          resultLoanReqJson,
          loanReqData,
        );
        if (!validData)
          throw {
            message: 'Error while validating data',
          };
        if (validData.unknownColumns.length)
          return reqUtils.json(req, res, next, 400, {
            message: 'Few columns are unknown',
            errorCode: '03',
            data: {
              unknownColumns: validData.unknownColumns,
            },
          });
        if (validData.missingColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Few columns are missing',
            errorCode: '01',
            data: {
              missingColumns: validData.missingColumns,
            },
          });
        if (validData.errorRows.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Few fields have invalid data',
            errorCode: '02',
            data: {
              exactErrorRows: validData.exactErrorColumns,
              errorRows: validData.errorRows,
            },
          });
        if (validData.exactEnumErrorColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: `${validData.exactEnumErrorColumns[0]}`,
            errorCode: '02',
            data: {
              exactEnumErrorColumns: validData.exactEnumErrorColumns,
            },
          });
        const checkState = resultLoanReqJson.filter((column) => {
          return column['field'] === 'state' && column.checked === 'TRUE';
        });

        // Check if state field is manadatory for this product
        if (checkState.length || loanReqData[0].hasOwnProperty('state')) {
          const validateState = await helper.handleValidateStateName(
            req,
            res,
            loanReqData,
          );
          if (validateState?.invalidData) {
            throw {
              message: 'Invalid state names for this partner_loan_app_ids',
              data: validateState,
            };
          }
        }
        loanReqData[0]["coborrower"] = borrowerData;
        loanReqData[0]["guarantor"] = guarantorData;

        //Validate for the coborrowerDetails.
        const validCoBorrowerDetails =
          await leadHelper.validateCoBorrowerDetails(loanReqData);
        if (!validCoBorrowerDetails.success) throw validCoBorrowerDetails;

        const preparedLoanReq = helper.appendLoanIdBwId(
          validData.validatedRows,
          loanReqData,
          req,
          res,
        );

        const loanAppIds = preparedLoanReq.map((item) => {
          return item.loan_app_id;
        });

        const partnerLoanIds = preparedLoanReq.map((item) => {
          return item.partner_loan_app_id;
        });

        const panNumbers = await preparedLoanReq.reduce((data, item) => {
          if (item.appl_pan) data.push(item.appl_pan);
          if (item?.bus_pan) data.push(item.bus_pan);
          if (item?.co_app_pan) data.push(item.co_app_pan);
          if (item?.coborrower) {
            const coborrowerPANs = new Set();
            item.coborrower.forEach((coborrower) => {
              if (coborrower?.cb_pan) {
                if (coborrowerPANs.has(coborrower.cb_pan)) {
                  throw {
                    success: false,
                    message: 'lead with provided pan number already exist',
                  };
                }
                if (data.includes(coborrower?.cb_pan)) {
                  throw {
                    success: false,
                    message: 'lead with provided pan number already exist',
                  };
                }
                data.push(coborrower.cb_pan);
                coborrowerPANs.add(coborrower.cb_pan);
              }
            });
          }
          return data;
        }, []);


        const panAlreadyExist = await LoanRequestSchema.findByPanMulti(
          panNumbers,
          req.company._id,
        );
        if (panAlreadyExist.length) {
          const LoanAppIds = await panAlreadyExist.map((item) => {
            return item.loan_app_id;
          });
          //Check loan_app_id already exist in borrower info table
          const loanAppIdAlreadyExist =
            await BorrowerinfoCommon.findByLoanAppIds(LoanAppIds);
          //Dedupe on PAN and partner_loan_app_id after lead soft delete.
          let activeLeadArray = [];
          panAlreadyExist.forEach((record) => {
            if (record.is_deleted !== 1) {
              activeLeadArray.push(record);
            }
          });
          let condition =
            loanAppIdAlreadyExist[0] !== null
              ? loanAppIdAlreadyExist[0]?.stage !== 999 &&
              activeLeadArray.length
              : activeLeadArray.length;
          if (condition)
            throw {
              success: false,
              message: `Loan application: ${activeLeadArray[0].loan_app_id} with provided PAN already exists`,
            };
        }
        const leadAlreadyExist = await LoanRequestSchema.findKPartnerLoanIds(
          req.company._id,
          partnerLoanIds,
        );
        if (leadAlreadyExist.length)
          throw {
            message: 'Few loans already exists with this partner_loan_app_id.',
            data: leadAlreadyExist,
          };
        if (req.query.validate) {
          return reqUtils.json(req, res, next, 200, {
            success: true,
            validated: true,
            message: 'Fields have valid data',
            data: preparedLoanReq,
          });
        }
        validData.validatedRows.forEach((value, index) => {
          if (moment(value.dob, 'YYYY-MM-DD', true).isValid()) {
            validData.validatedRows[index].dob = moment(value.dob).format(
              'YYYY-MM-DD',
            );
          } else if (moment(value.dob, 'DD-MM-YYYY', true).isValid()) {
            validData.validatedRows[index].dob = value.dob
              .split('-')
              .reverse()
              .join('-');
          }
        });

        /*Create customer ID*/
        const generateCustomerIds = await generateCustomerId(preparedLoanReq);
        const addBulkLoanRequest =
          await LoanRequestSchema.addInBulk(preparedLoanReq);
        if (!addBulkLoanRequest)
          throw {
            message:
              'Error adding new loans with unique loan_app_id, Please retry',
          };
        const borrowerInfoTemplates =
          await LoanTemplatesSchema.findByNameTmplId(
            req.loanSchema.loan_custom_templates_id,
            'loan',
          );
        if (!borrowerInfoTemplates)
          throw {
            message: 'No records found for borrower info template',
          };
        const resultBorroInfoJson = await s3helper.fetchJsonFromS3(
          borrowerInfoTemplates.path.substring(
            borrowerInfoTemplates.path.indexOf('templates'),
          ),
          {
            method: 'Get',
          },
        );
        const preparedbiTmpl = await helper.generatebiTmpl(
          [addBulkLoanRequest],
          resultBorroInfoJson,
        );
        const TagsForCustomers = await addCustomerTagAndLoanAppId(preparedLoanReq, req.product?.party_type);

        //unsc screening call
        if (!req.product.party_type || req.product.party_type == 'Individual' || req.product.party_type == 'Non Individual') {
          preparedLoanReq.forEach(async (lead) => {
            //query for _id of lead with respect to loan app id
            const loanRequestId = await LoanRequestSchema.findByIds(
              lead.loan_app_id,
            );

            const fName = lead.first_name ? lead.first_name.trim() : '';
            const mName = lead.middle_name ? lead.middle_name.trim() : '';
            let lName =
              lead.last_name &&
                !/null|[^A-Za-z\s.]|\.\s\./i.test(
                  lead.last_name.replace(/\s+/g, ' '),
                )
                ? lead.last_name.trim()
                : '';
            if (lead.last_name === '.') {
              lName = '';
            }

            //prepare data request for trackwizz call
            const data_request = {
              requestId: loanRequestId[0]._id,
              parentCompany: process.env.TRACKWIZZ_PARENT_COMPANY,
              firstName: fName,
              middleName: mName,
              lastName: lName,
              customerCategory: process.env.TRACKWIZZ_CUSTOMER_CATEGORY,
              gender:
                lead.gender == 'Male'
                  ? 'M'
                  : lead.gender == 'Female'
                    ? 'F'
                    : '',
              pan: lead.appl_pan ? lead.appl_pan : '',
              dateOfBirth: lead.dob
                ? moment(lead.dob).format('DD-MMM-YYYY')
                : '',
              correspondenceAddressLine1: lead.resi_addr_ln1
                ? lead.resi_addr_ln1
                : '',
              correspondenceAddressLine2: lead.resi_addr_ln2
                ? lead.resi_addr_ln2
                : '',
              correspondenceAddressCity: lead.city ? lead.city : '',
              correspondenceAddressState: lead.state ? lead.state : '',
              correspondenceAddressCountry:
                process.env.TRACKWIZZ_CORRESPONDANCE_ADDRESSCOUNTRY,
              correspondenceAddressPinCode: lead.pincode ? lead.pincode : '',
              permanentAddressLine1: lead.per_addr_ln1 ? lead.per_addr_ln1 : '',
              permanentAddressLine2: lead.per_addr_ln2 ? lead.per_addr_ln2 : '',
              permanentAddressCity: lead.per_city ? lead.per_city : '',
              permanentAddressState: lead.per_state ? lead.per_state : '',
              permanentAddressCountry:
                process.env.TRACKWIZZ_PERMANENT_ADDRESS_COUNTRY,
              permanentAddressPinCode: lead.per_pincode ? lead.per_pincode : '',
              personalMobileNumber: lead.appl_phone ? lead.appl_phone : '',
              personalEmail: lead.email_id ? lead.email_id : '',
              screeningCategory: 'Initial Screening Master',
            };

            ///make call to the trackwizz service
            const track_wizz_resp = await trackWizzService(data_request);

            let screen_result;
            var loanDocumentObject = {};
            //check for screening
            if (track_wizz_resp.success) {
              screen_result = {
                scr_match_result: track_wizz_resp.response.matched,
                scr_match_count: track_wizz_resp.response.alertCount
                  ? track_wizz_resp.response.alertCount
                  : '',
              };
              //check for match type
              const matchType =
                screen_result.scr_match_count > 0
                  ? track_wizz_resp.response.alerts.alert[0].matchType
                  : '';

              if (
                screen_result.scr_match_result == 'Match' &&
                matchType == 'Confirmed'
              ) {
                //update scr_match_result
                screen_result.scr_match_result = matchType;
                const updateData = {
                  is_deleted: 1,
                  delete_date_timestamp: Date.now(),
                  deleted_by: 124,
                  lead_status: 'rejected',
                  status: 'rejected',
                  reason: 'I09',
                };
                // Update loan request
                const deleteLead = await LoanRequestSchema.updateLeadStatus(
                  lead.loan_app_id,
                  updateData,
                );
              } else if (
                screen_result.scr_match_result == 'Match' &&
                matchType == 'Probable'
              ) {
                //update scr_match_result
                screen_result.scr_match_result =
                  track_wizz_resp.response.alerts.alert[0].matchType;

                const key = `loandocument/${JSON.parse(JSON.stringify(req.company)).code
                  ? JSON.parse(JSON.stringify(req.company)).code
                  : 'BK'
                  }/${JSON.parse(JSON.stringify(req.product)).name.replace(
                    /\s/g,
                    '',
                  )}/${Date.now()}/${lead.loan_app_id}/${124}.txt`;

                var s3Url = await s3helper.uploadFileToS3(
                  track_wizz_resp.response.reportData,
                  key,
                );
                const documentMappings = await DocumentMappingSchema.getAll();
                let documentMapping = {};
                for await (let ele of documentMappings) {
                  documentMapping[ele.doc_code] = ele.doc_type;
                }
                //update loan documents
                loanDocumentObject = {
                  company_id: lead.company_id,
                  loan_app_id: lead.loan_app_id,
                  partner_loan_app_id: lead.partner_loan_app_id,
                  file_url: s3Url.Location,
                  partner_borrower_id: lead.partner_borrower_id,
                  borrower_id: lead.borrower_id,
                  doc_stage: 'pre_approval',
                  file_type: documentMapping.documentMapping[124],
                  code: 124,
                };

                await LoanDocumentSchema.addNew(loanDocumentObject);
              }
            } else {
              //update scr_match_result
              screen_result={
                scr_match_result:"Error"
              }
            }
            //update scr_match_result in loanrequest
            await LoanRequestSchema.updateByLAid(
              screen_result,
              lead.loan_app_id,
            );
          });
        }

        return reqUtils.json(req, res, next, 200, {
          success: true,
          message: 'Lead generated successfully',
          data: {
            preparedbiTmpl,
          },
        });
      } catch (error) {
        console.log(error);
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  //update loanrequest
  app.put(
    '/api/lead',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        var loanReqData = req.body;
        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'lead',
        );
        if (!loanTemplate)
          throw {
            message: 'No records found for lead templates',
          };

        const loanReqJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        if (!loanReqJson)
          throw {
            success: false,
            message: 'Error fetching json from s3',
          };
        loanReqData = reqUtils.cleanBody(loanReqData);
        const result = await validate.validateDataWithTemplate(
          loanReqJson,
          loanReqData,
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
        if (result.validatedRows.length == loanReqData.length) {
          const partnerLoanAppIds = result.validatedRows.map((item) => {
            return item.partner_loan_app_id;
          });

          const loanAlreadyExist =
            await BorrowerinfoCommon.findByPartnerLoanAppIds(partnerLoanAppIds);
          if (loanAlreadyExist.length && loanAlreadyExist[0] !== null) {
            throw {
              message: "As loan already exist can't edit lead.",
              data: loanAlreadyExist,
            };
          }

          result.validatedRows.forEach((value, index) => {
            if (moment(value.dob, 'YYYY-MM-DD', true).isValid()) {
              result.validatedRows[index].dob = moment(value.dob).format(
                'YYYY-MM-DD',
              );
            } else if (moment(value.dob, 'DD-MM-YYYY', true).isValid()) {
              result.validatedRows[index].dob = value.dob
                .split('-')
                .reverse()
                .join('-');
            }
            result.validatedRows[index].aadhar_card_num = result.validatedRows[
              index
            ].hasOwnProperty('aadhar_card_num')
              ? result.validatedRows[index].aadhar_card_num.replace(
                /.(?=.{4,}$)/g,
                '*',
              )
              : '';
            result.validatedRows[index].addr_id_num =
              result.validatedRows[index].hasOwnProperty('addr_id_num') &&
                result.validatedRows[index].addr_id_num.match(/^\d{12}$/)
                ? result.validatedRows[index].addr_id_num.replace(
                  /.(?=.{4,}$)/g,
                  '*',
                )
                : result.validatedRows[index].hasOwnProperty('addr_id_num')
                  ? result.validatedRows[index].addr_id_num
                  : '';
          });

          const updateLoanReq = await LoanRequestSchema.updateBulk(
            result.validatedRows,
          );
          if (!updateLoanReq)
            throw {
              message: 'Error while updating lead data',
            };
          result.validatedRows.forEach(async (item, index) => {
            if (index === result.validatedRows.length - 1) {
              res.send({
                message: `Successfully updated ${result.validatedRows.length} rows`,
              });
              next();
            }
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );

  // app.post("/api/get_loanrequest_details", async (req, res) => {
  // try {
  // const loanRequestDetails = await LoanRequestSchema.checkloanId(
  // req.body.loan_app_id
  // );
  // if (!loanRequestDetails)
  // throw { message: "No record found in loan request" };
  // return res.send(loanRequestDetails);
  // } catch (error) {
  // return res.status(400).send(error);
  // }
  // });

  app.get(
    '/api/lead/:loan_app_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        let type = req.query.type || "loan_app_id";
        let leadDetails;
        if (type === "partner_loan_app_id") {
          leadDetails = await LoanRequestSchema.findByPartnerLoanId(
            req.params.loan_app_id
          );
        } else {
          leadDetails = await LoanRequestSchema.findByLId(
            req.params.loan_app_id,
          );
        }
        if (!leadDetails) {
          throw {
            success: false,
            message: 'No record found in lead table against the provided loan_app_id or partner_loan_app_id',
          };
        }
        return res.send(leadDetails);
      } catch (error) {
        return res.status(400).send(error);
      }
    }
  );

  app.post(
    '/api/find_duplicate_cases',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyProduct, jwt.verifyCompany],
    [
      check('loan_app_id')
        .notEmpty()
        .withMessage('loan id is required')
        .isNumeric()
        .withMessage('loan id accept only number.'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const reqData = req.body;
        const RespBorro = await BorrowerinfoCommon.findOneWithKLID(
          reqData.loan_app_id,
        );
        if (!RespBorro)
          throw {
            message: 'This loan id does not exist.',
          };
        if (RespBorro.company_id !== req.company.id)
          throw {
            message: 'Loan id is not associated with this company.',
          };
        if (RespBorro.product_id !== req.product.id)
          throw {
            message: 'loan id is not associated with this product.',
          };
        const appl_pan =
          typeof reqData.pan_id !== 'undefined' ? reqData.pan_id : '';
        const appl_phone =
          typeof reqData.mobile_number !== 'undefined'
            ? reqData.mobile_number
            : '';
        if (appl_pan === '' && appl_phone === '')
          throw {
            message: 'please send pan id or mobile no',
          };
        const condition =
          appl_pan !== '' && appl_phone !== ''
            ? {
              appl_pan: appl_pan,
              appl_phone: appl_phone,
            }
            : appl_pan !== ''
              ? {
                appl_pan: appl_pan,
              }
              : appl_phone !== ''
                ? {
                  appl_phone: appl_phone,
                }
                : {};
        const loanReqResp =
          await LoanRequestSchema.findByPanandMobile(condition);
        if (!loanReqResp)
          throw {
            message: 'No record found in loan request',
          };
        const bookingLoanIds = loanReqResp.map((item) => {
          return String(item.loan_app_id);
        });
        const borrowerResponse =
          await BorrowerinfoCommon.findKLIByIds(bookingLoanIds);
        borrowerResponse.forEach((items) => {
          const index = loanReqResp.findIndex(
            (ele) => ele.loan_app_id == items.loan_app_id,
          );
          loanReqResp[index].status = items.status;
          loanReqResp[index].product_name = items.product_name;
          loanReqResp[index].company_name = items.company_name;
        });
        return reqUtils.json(req, res, next, 200, response);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/filter_by_pan',
    [jwt.verifyToken, jwt.verifyUser],
    [
      check('pan_id')
        .notEmpty()
        .withMessage('Pan id is required')
        .isLength({
          min: 10,
          max: 10,
        })
        .withMessage('Please enter valid Pan id')
        .matches(/^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/)
        .withMessage('Please enter valid pan id'),
    ],
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const reqData = req.body;
        const where = {};
        where.appl_pan = reqData.pan_id;
        const loanReqByPan = await LoanRequestSchema.findByPanandMobile(where);
        if (!loanReqByPan)
          throw {
            message: 'No record found in loan request',
          };
        const loanIds = loanReqByPan.map((item) => {
          return String(item.booking_loan_app_id);
        });
        const borrowInfo = await BorrowerinfoCommon.findKLIByIds(loanIds);
        if (!borrowInfo)
          throw {
            message:
              'something went wrong while fetching data from borrower info',
          };
        let resData = [];
        borrowInfo.forEach((birow) => {
          loanReqByPan.forEach((lrrow) => {
            if (birow.loan_app_id === lrrow.loan_app_id) {
              Object.assign(birow, lrrow);
              resData.push(birow);
            }
          });
          return reqUtils.json(req, res, next, 200, resData);
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/downloadleadrecords',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        if (String(req.company._id) !== String(data.company_id))
          throw {
            message: 'Lead id is not associated with company',
          };
        if (String(req.product._id) !== String(data.product_id))
          throw {
            message: 'Lead id is not associated with product',
          };
        const isPagination = data.hasOwnProperty('pagination');

        let leads = await LoanRequestSchema.getAllByFilterExport(data);

        if (!leads || !leads.length)
          throw {
            message: 'No records found.',
          };
        return res.send(leads);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/lead/activity-log/:loan_app_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const result = await LoanActivities.findByLAPId(req.params.loan_app_id);
        let activityJson = {};
        let iteration = 0;
        let count = 0;
        const getJsonsFromS3 = await result.map(async (record) => {
          if (
            record?.api_type === 'BRE' &&
            record?.request_type === 'response'
          ) {
            const getJson = await s3helper.fetchJsonFromS3(
              record?.url.substring(record.url.indexOf('BRE')),
            );
            activityJson.breJson = getJson;
            count = count + 1;
          }
          if (
            record?.api_type === 'LMS_LEAD' &&
            record?.request_type === 'response'
          ) {
            const getJson = await s3helper.fetchJsonFromS3(
              record?.url.substring(record.url.indexOf('LMS_LEAD')),
            );
            activityJson.leadJson = getJson;
            count = count + 1;
          }
          if (
            record?.api_type === 'LMS_LOAN' &&
            record?.request_type === 'response'
          ) {
            const getJson = await s3helper.fetchJsonFromS3(
              record?.url.substring(record.url.indexOf('LMS_LOAN')),
            );
            activityJson.loanJson = getJson;
            count = count + 1;
          }
          if (
            record?.api_type === 'send_enhanced_review' &&
            record?.request_type === 'request'
          ) {
            const getJson = await s3helper.fetchJsonFromS3(
              record?.url.substring(record.url.indexOf('send_enhanced_review')),
            );
            activityJson.reviewJson = getJson;
            count = count + 1;
          }
          iteration = iteration + 1;
          if (count === 4 || iteration === result.length) {
            return res.send(activityJson);
          }
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/lead/details/:loan_app_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const responseData = await LoanRequestSchema.findIfExists(
          req.params.loan_app_id,
        );
        if (!responseData)
          throw {
            message: 'No records found',
          };
        if (req.company._id !== responseData.company_id)
          throw {
            message: 'loan_app_id is not associated with company',
          };
        if (req.product._id !== responseData.product_id)
          throw {
            message: 'loan_app_id is not associated with product',
          };
        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          req.loanSchema.loan_custom_templates_id,
          'lead',
        );
        if (!loanTemplate)
          throw {
            message: 'No records found',
          };
        //fetch the custom template json data from s3 by path
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        let fieldDepartmentMapper = {};
        resultJson
          .filter(
            (i) =>
              i.checked.toLowerCase() === 'true' ||
              (i.hasOwnProperty('displayOnUI') &&
                i.displayOnUI.toLowerCase() === 'true' &&
                responseData[i.field] !== '' &&
                responseData[i.field] !== null &&
                responseData[i.field] !== 'null' &&
                responseData[i.field] !== 'undefined' &&
                responseData[i.field] !== undefined),
          )
          .forEach((item) => {
            if (!fieldDepartmentMapper[item.dept]) {
              fieldDepartmentMapper[item.dept] = {};
              fieldDepartmentMapper[item.dept]['fields'] = [];
            }
            fieldDepartmentMapper[item.dept].fields.push(item.field);
          });
        const coLenderAssignmentDetails =
          await AssignmentSchema.findByLoanAppId(req.params.loan_app_id);
        const colenderId = coLenderAssignmentDetails?.co_lender_id;
        const colenderAssignmentId =
          coLenderAssignmentDetails?.co_lender_assignment_id;
        const colenderProfileDetails =
          await ColenderProfile.findByColenderId(colenderId);
        const colenderFullName = colenderProfileDetails?.co_lender_name;
        const colenderShortCode = colenderProfileDetails?.co_lender_shortcode;

        const updatedResponseData = Object.assign({}, responseData._doc, {
          co_lender_shortcode: colenderShortCode,
          co_lender_assignment_id: colenderAssignmentId,
          co_lender_full_name: colenderFullName,
        });
        fieldDepartmentMapper['Co-Lender Details'] = {
          fields: [
            'co_lender_shortcode',
            'co_lender_assignment_id',
            'co_lender_full_name',
          ],
        };

        return res.send({
          data: updatedResponseData,
          resultJson,
          fieldDepartmentMapper,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // Lead soft delete API
  app.put(
    '/api/lead-soft-delete/:loan_app_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_app_id } = req.params;
        // Check lead exist by loan_app_id
        const leadExist = await LoanRequestSchema.findIfExists(loan_app_id);
        if (!leadExist)
          throw {
            success: false,
            message: 'No data found against provided loan_app_id.',
          };

        //validate company_id from req with company_id from loan request data
        if (req.company._id !== leadExist.company_id)
          throw {
            success: false,
            message: 'company_id mismatch in authorization',
          };
        //validate product_id from req with product_id from loan request data
        if (req.product._id !== leadExist.product_id)
          throw {
            success: false,
            message: 'product_id mismatch in authorization',
          };

        const loanType = req.product.allow_loc ? 'Line' : 'Loan';
        // Check if loan exist in borrower info common by loan_app_id
        const loanExistByLAID = await BorrowerinfoCommon.findByLId(loan_app_id);
        // If exist throw error.
        if (loanExistByLAID)
          throw {
            success: false,
            message: `Exception: You can’t delete the lead request, it has an associated ${loanType}`,
          };
        // If loan not exist update data in loan request schema.
        if (!loanExistByLAID) {
          const updateData = {
            is_deleted: 1,
            delete_date_timestamp: Date.now(),
            deleted_by: req.user._id,
            status: 'rejected',
            lead_status: 'rejected',
            partner_loan_app_id: `${leadExist.partner_loan_app_id
              }-D${moment().format('DDMMYYYYHHMMSS')}`,
          };
          // Update loan request
          const deleteLead = await LoanRequestSchema.updateLeadStatus(
            loan_app_id,
            updateData,
          );
          if (!deleteLead)
            throw { success: false, message: 'Error while deleting lead.' };
          return res
            .status(200)
            .send({ success: true, message: 'Lead deleted successfully.' });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

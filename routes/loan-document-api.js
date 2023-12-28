bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AccessLog = require('../util/accessLog');
const loanDocumentUtils = require('../util/loandocument');
const BorrowerInfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const loanDocumentCommonSchema = require('../models/loandocument-common-schema.js');
const PLloanDocument = require('../models/pl-loandocument-schema.js');
const CLloanDocument = require('../models/cl-loandocument-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const LoanSchemaModel = require('../models/loanschema-schema.js');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const loanDocTemplateSchema = require('../models/loandoc-template-schema.js');
const CompanySchema = require('../models/company-schema');
const LoanTypeSchema = require('../models/loan-default-types-schema.js');
const CustomerSchema = require('../models/customer-schema.js');
const Compliance = require('../models/compliance-schema');
let reqUtils = require('../util/req.js');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const PartnerNotificationSchema = require('../models/partner-notification-details.js');
const SubscribeEventSchema = require('../models/subscribe_event.js');
const DocumentMappingSchema = require('../models/document-mappings-schema.js');
const {
  convertImageToPDF,
  convertTextToPDF,
  convertPDFToBase64,
} = require('../util/pdfFunc');
const { failResponse } = require('../utils/responses');
var FileSystem = require('fs');
var path = require('path');
const LoanDocumentMappingSchema = require('../models/document-mappings-schema.js');
const AWSHelper = require('./third-party-apis/utils/aws-s3-helper');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/loandocument/:loan_id/:fileType',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    async (req, res, next) => {
      try {
        const filetype = req.params.hasOwnProperty('fileType')
          ? req.params.fileType
          : false;
        const loan_id = req.params.loan_id;
        if (filetype === false)
          throw {
            message: 'Please pass the file type',
            loan_id: loan_id,
          };
        const borrowerReponse =
          await BorrowerInfoCommonSchema.findOneWithKLID(loan_id);
        if (!borrowerReponse)
          throw {
            message: 'loan id does not exist.',
          };
        if (req.company._id !== borrowerReponse.company_id)
          throw {
            message: 'loan id is not associated with company.',
          };
        // common Document Check
        const response = await loanDocumentCommonSchema.findByKLIDAndDocType(
          loan_id,
          filetype,
        );
        if (
          (!response &&
            req.product.name.toLocaleLowerCase().indexOf('cl') > -1) ||
          req.product.name.toLocaleLowerCase().indexOf('line') > -1
        ) {
          // CL Uncommon Document Check
          const clresponse = await CLloanDocument.findCLByKLIDAndDocType(
            loan_id,
            filetype,
          );
          if (!clresponse)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          if (clresponse[filetype] == null)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          const resultJson = await s3helper.fetchJsonFromS3(
            clresponse[filetype],
            {
              method: 'Get',
            },
          );
          if (!resultJson)
            throw {
              message: `Error fetching json from s3`,
              loan_id: loan_id,
            };
          return reqUtils.json(req, res, next, 200, {
            success: true,
            message: `Loan ${filetype} fetch successfully`,
            data: resultJson,
            loan_id: loan_id,
          });
        } else if (
          !response &&
          req.product.name.toLocaleLowerCase().indexOf('pl') > -1
        ) {
          // PL Uncommon Document Check
          const plresponse = await PLloanDocument.findPLByKLIDAndDocType(
            loan_id,
            filetype,
          );
          if (!plresponse)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          if (plresponse[filetype] == null)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          const resultJson = await s3helper.fetchJsonFromS3(
            plresponse[filetype],
            {
              method: 'Get',
            },
          );
          if (!resultJson)
            throw {
              message: `Error fetching json from s3`,
              loan_id: loan_id,
            };
          return reqUtils.json(req, res, next, 200, {
            success: true,
            message: `Loan ${filetype} fetch successfully`,
            data: resultJson,
            loan_id: loan_id,
          });
        } else {
          if (!response)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          if (response[filetype] == null)
            throw {
              message: `${filetype} document file is not uploaded`,
              loan_id: loan_id,
            };
          const resultJson = await s3helper.fetchJsonFromS3(
            response[filetype],
            {
              method: 'Get',
            },
          );
          if (!resultJson)
            throw {
              message: `Error fetching json from s3`,
              loan_id: loan_id,
            };
          return reqUtils.json(req, res, next, 200, {
            success: true,
            message: `Loan ${filetype} fetch successfully`,
            data: resultJson,
            loan_id: loan_id,
          });
        }
      } catch (error) {
        return res.status(400).send({
          error,
        });
      }
    },
  );

  app.post(
    '/api/loandocument/:_loanid',
    [AccessLog.maintainAccessLog],
    async (req, res) => {
      try {
        const loan_app_id = req.body.loan_app_id;
        const borrower_id = req.body.borrower_id;
        const resultLoanRquest = await LoanRequestSchema.findByKLBId(
          loan_app_id,
          borrower_id,
        );
        if (!resultLoanRquest)
          throw {
            message: 'No records found loan request',
          };
        const resultLoanSchema = await LoanSchemaModel.findById(
          resultLoanRquest.loan_schema_id,
        );
        if (!resultLoanSchema)
          throw {
            message: 'No records found loan schema',
          };
        const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
          resultLoanSchema.loan_custom_templates_id,
          'loandocument',
        );
        if (!loanTemplate)
          throw {
            message: 'No records found loan template',
          };
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.path.substring(loanTemplate.path.indexOf('templates')),
        );
        if (!resultJson)
          throw {
            message: 'Error fetching json from s3',
          };
        const finalResult = resultJson.filter((column) => {
          return column.checked === 'TRUE';
        });
        const response = await CompanySchema.getCompanyCode(
          resultLoanRquest.company_id,
        );
        if (!response)
          throw {
            message: 'Something went wrong',
          };
        let userData = {};
        userData.company_code = response;
        userData.product_id = resultLoanRquest.product_id;
        userData.company_id = resultLoanRquest.company_id;
        userData.loan_schema_id = resultLoanRquest.loan_schema_id;
        userData.loan_id = resultLoanRquest.loan_id;
        userData.borrower_id = resultLoanRquest.borrower_id;
        userData.partner_loan_id = resultLoanRquest.partner_loan_id;
        userData.partner_borrower_id = resultLoanRquest.partner_borrower_id;
        return res.send({
          data: finalResult,
          userData: userData,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loandocument',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    [
      check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
      check('code').notEmpty().withMessage('code is required'),
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const data = req.body;
        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, data.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;
        const file = req?.files && req?.files[0];

        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const documentMappings = await DocumentMappingSchema.getAll();
        let documentMapping = {};
        for await (let ele of documentMappings) {
          documentMapping[ele.doc_code] = ele.doc_type;
        }
        const startUploadingDoc = async () => {
          const uploadDocumentData =
            await loanDocumentUtils.continueUploadDocument(req, data);

          if (process.env.LOAN_DOC_KILL_SWITCH === 'false') {
            const _subscribedEvent = await SubscribeEventSchema.findBy_PID_KEY(
              `loan_document_${req.body?.code}`,
              req.product?._id,
            );
            if (_subscribedEvent) {
              const uploadedLoanDoc =
                await loanDocumentCommonSchema.findByCodeAndLoanAppID(
                  req.body?.code,
                  req.body?.loan_app_id,
                );
              const s3FileUrl = uploadedLoanDoc.file_url;
              const signedUrl = await AWSHelper.getGenericSignedUrl(s3FileUrl);
              // partner notification details db logging
              const _payload = {
                loan_app_id: req.body?.loan_app_id,
                doc_code: req.body?.code,
                signed_url: signedUrl,
              };

              //upload request data to s3 and store it in partner_notification_details table
              const fname =
                Math.floor(10000 + Math.random() * 99999) + '_callback_req';
              const requestKey = `CALLBACK-REQUEST-BODY/${req.company._id}/${
                req.product._id
              }/${fname}/${Date.now()}.txt`;
              const uploadWebhookRequestToS3 = await s3helper.uploadFileToS3(
                _payload,
                requestKey,
              );
              const partnerNotification =
                await PartnerNotificationSchema.recordLoanDocumentRequestData({
                  company_id: req.company?._id,
                  product_id: req.product?._id,
                  request_s3_url: uploadWebhookRequestToS3.Location,
                  stage: 0,
                  loan_app_id: req.body?.loan_app_id,
                  remarks: 'partner notification details created',
                  key: `loan_document_${req.body?.code}`,
                });
              // if doc_code is 106 (udhyam) then initiate urc_parsing_data in loanrequests
              if (data.code === '106' && partnerNotification) {
                const existingLead = await LoanRequestSchema.findByLId(
                  req.body.loan_app_id,
                );
                existingLead.urc_parsing_data = '';
                existingLead.urc_parsing_status = 'initiated';
                await LoanRequestSchema.updateCamDetails(
                  req.body.loan_app_id,
                  existingLead,
                );
              }
            }
          }
          return reqUtils.json(req, res, next, 200, {
            uploadDocumentData,
          });
        };
        if (data?.code === '130') {
          if (file) data.file = file;
          const fileType = data.file['originalname'];
          const fileExtension = fileType.split('.').pop();
          data.extension = fileExtension;
          if (data.file['size'] > 10e6)
            throw {
              success: false,
              message: `File size should not be greater than 8 MB`,
            };

          if (
            fileExtension != 'xlsx' &&
            fileExtension != 'xls' &&
            fileExtension != 'csv'
          ) {
            throw {
              success: false,
              message: `Only xlsx or csv files are allowed for this file code`,
            };
          }
          // Upload file to S3
          // Get url from S3
          // Make entry in db with S3 url
          const uploadFile = await loanDocumentUtils.continueUploadDirectFile(
            req,
            data,
          );
          if (!uploadFile)
            throw {
              success: false,
              message: `Error uploading file to S3`,
            };
          return reqUtils.json(req, res, next, 200, {
            uploadFile,
          });
        }

        if (file) {
          const fileType = file['originalname'];
          const fileExtension = fileType.split('.').pop();
          if (file['size'] > 10e6) {
            return failResponse(
              req,
              res,
              {},
              'File size should not be greater than 8 MB',
            );
          }
          if (['pdf', 'png', 'jpeg', 'txt', 'jpg'].includes(fileExtension)) {
            if (
              ['jpeg', 'png', 'jpg'].includes(fileExtension) &&
              ['aadhar_card', 'aadhaar_card_back', 'pan_card'].includes(
                documentMapping[req.body.code],
              )
            ) {
              const stream = await convertImageToPDF(req, res, file);
              const u8 = new Uint8Array(file.buffer);
              const b64 = Buffer.from(u8).toString('base64');
              req.body.base64pdfencodedfile = b64;
              if (
                req.product &&
                req.product.party_type &&
                req.product.party_type === 'Individual'
              ) {
                if (documentMapping[req.body.code] === 'pan_card') {
                  const pan_data = {
                    pan_received: 'Y',
                    company_id: req.company._id,
                    product_id: req.product._id,
                    loan_id: req.product.loan_id,
                    loan_app_id: req.body.loan_app_id,
                  };
                  const findKycChecklistData =
                    await Compliance.findBySingleLoanAppId(
                      req.body.loan_app_id,
                    );
                  if (!findKycChecklistData) {
                    const addKycCheckList = await Compliance.addNew(pan_data);
                    if (!addKycCheckList) {
                      throw {
                        message: 'Error while adding the document',
                        success: false,
                      };
                    }
                  } else {
                    const panReceieved =
                      await Compliance.updatePanReceivedByLoanId(
                        pan_data.loan_id,
                        'Y',
                      );
                    if (!panReceieved) {
                      throw {
                        message: 'Error while adding the document',
                        success: false,
                      };
                    }
                  }
                } else if (documentMapping[req.body.code] === 'aadhar_card') {
                  const aadhaar_data = {
                    aadhaar_received: 'Y',
                    company_id: req.company._id,
                    product_id: req.product._id,
                    loan_id: req.product.loan_id,
                    loan_app_id: req.body.loan_app_id,
                  };
                  const findKycChecklistData =
                    await Compliance.findBySingleLoanAppId(
                      req.body.loan_app_id,
                    );
                  if (!findKycChecklistData) {
                    const addKycCheckList =
                      await Compliance.addNew(aadhaar_data);
                    if (!addKycCheckList) {
                      throw {
                        message: 'Error while adding the document',
                        success: false,
                      };
                    }
                  } else {
                    const wholeAadharReceived =
                      await Compliance.updateAadhaarReceivedByLoanId(
                        aadhaar_data.loan_id,
                        'Y',
                      );
                    if (!wholeAadharReceived) {
                      throw {
                        message: 'Error while adding the document',
                        success: false,
                      };
                    }
                  }
                }
                getDataFromStream(stream);
              } else {
                getDataFromStream(stream);
              }
            } else if (fileExtension === 'txt') {
              const stream = await convertTextToPDF(req, res, file);
              getDataFromStream(stream);
            } else if (fileExtension === 'pdf') {
              const pdfString = await convertPDFToBase64(req, res, file);
              data.base64pdfencodedfile = pdfString;
              req.body.base64pdfencodedfile = pdfString;
              startUploadingDoc();
            }
          } else {
            return failResponse(
              req,
              res,
              {},
              'Only pdf, png, jpeg, jpg, txt files are allowed',
            );
          }
        }

        if (
          documentMapping[req.body?.code] === 'pan_card' &&
          req.product?.party_type === 'Individual' &&
          data?.base64pdfencodedfile
        ) {
          const pan_data = {
            pan_received: 'Y',
            company_id: req.company._id,
            product_id: req.product._id,
            loan_id: req.product.loan_id,
            loan_app_id: req.body.loan_app_id,
          };
          const findKycChecklistData = await Compliance.findBySingleLoanAppId(
            req.body.loan_app_id,
          );
          if (!findKycChecklistData) {
            const addKycCheckList = await Compliance.addNew(pan_data);
            if (!addKycCheckList) {
              throw {
                message: 'Error while adding the document',
                success: false,
              };
            }
          } else {
            const panReceieved = await Compliance.updatePanReceivedByLoanId(
              req.body.loan_app_id,
              'Y',
            );
            if (!panReceieved) {
              throw {
                message: 'Error while adding the document',
                success: false,
              };
            }
          }
        }
        if (
          documentMapping[req.body?.code] === 'aadhar_card' &&
          req.product?.party_type === 'Individual' &&
          data?.base64pdfencodedfile
        ) {
          const aadhaar_data = {
            aadhaar_received: 'Y',
            company_id: req.company._id,
            product_id: req.product._id,
            loan_id: req.product.loan_id,
            loan_app_id: req.body.loan_app_id,
          };
          const findKycChecklistData = await Compliance.findBySingleLoanAppId(
            req.body.loan_app_id,
          );
          if (!findKycChecklistData) {
            const addKycCheckList = await Compliance.addNew(aadhaar_data);
            if (!addKycCheckList) {
              throw {
                message: 'Error while adding the document',
                success: false,
              };
            }
          } else {
            const wholeAadharReceived =
              await Compliance.updateAadhaarReceivedByLoanId(
                req.body.loan_app_id,
                'Y',
              );
            if (!wholeAadharReceived) {
              throw {
                message: 'Error while adding the document',
                success: false,
              };
            }
          }
        }
        if (data?.base64pdfencodedfile && !file) {
          startUploadingDoc();
        }
      } catch (error) {
        console.log('loandocument api error :', error);
        return res.status(400).send(error);
      }
    },
  );

  //post api for drawdown document
  app.post(
    '/api/drawdown-document',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
    ],
    [
      check('loan_app_id').notEmpty().withMessage('loan_app_id is required'),
      check('doc').notEmpty().withMessage('code is required'),
      check('drawdown_request_id')
        .notEmpty()
        .withMessage('drawdown_request_id is required'),
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const data = req.body;
        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, data.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;
        const file = req?.files && req?.files[0];
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            success: false,
            message: errors.errors[0]['msg'],
          };
        const limit = data.doc.length;
        var uploadDocumentData = [];
        var checkarray = [];
        for (j in data.doc) {
          if (checkarray.includes(data.doc[j].code)) {
            throw {
              success: false,
              message: 'documents can not be duplicate',
            };
          }
          checkarray.push(data.doc[j].code);
        }
        for (i in data.doc) {
          const dataObj = { ...data.doc[i] };
          dataObj['partner_loan_app_id'] = data.partner_loan_app_id;
          dataObj['loan_app_id'] = data.loan_app_id;
          dataObj['drawdown_request_id'] = data['drawdown_request_id'];
          dataObj['borrower_id'] = data['borrower_id'];
          const startUploadingDoc = async () => {
            const uploadDocumentDatas =
              await loanDocumentUtils.continueUploadDrawdownDocument(
                req,
                dataObj,
              );
            uploadDocumentData.push(uploadDocumentDatas);
            if (limit == uploadDocumentData.length) {
              if (process.env.LOAN_DOC_KILL_SWITCH === 'false') {
                const _subscribedEvent =
                  await SubscribeEventSchema.findBy_PID_KEY(
                    `loan_document_${req.body?.code}`,
                    req.product?._id,
                  );
                if (_subscribedEvent) {
                  const uploadedLoanDoc =
                    await loanDocumentCommonSchema.findByCodeAndLoanAppID(
                      req.body?.code,
                      req.body?.loan_app_id,
                    );
                  const s3FileUrl = uploadedLoanDoc.file_url;
                  const signedUrl =
                    await AWSHelper.getGenericSignedUrl(s3FileUrl);
                  const _payload = {
                    loan_app_id: req.body?.loan_app_id,
                    doc_code: req.body?.code,
                    signed_url: signedUrl,
                  };
                  //upload request data to s3 and store it in partner_notification_details table
                  const fname =
                    Math.floor(10000 + Math.random() * 99999) + '_callback_req';
                  const requestKey = `CALLBACK-REQUEST-BODY/${
                    req.company._id
                  }/${req.product._id}/${fname}/${Date.now()}.txt`;
                  const uploadWebhookRequestToS3 =
                    await s3helper.uploadFileToS3(_payload, requestKey);

                  // partner notification details db logging
                  await PartnerNotificationSchema.recordLoanDocumentRequestData(
                    {
                      company_id: req.company?._id,
                      product_id: req.product?._id,
                      request_s3_url: uploadWebhookRequestToS3.Location,
                      stage: 0,
                      loan_app_id: req.body?.loan_app_id,
                      remarks: 'partner notification details created',
                      key: `loan_document_${req.body?.code}`,
                    },
                  );
                }
              }
              return reqUtils.json(req, res, next, 200, {
                uploadDocumentData,
              });
            }
          };
          if (
            dataObj?.base64pdfencodedfile !== null &&
            dataObj?.base64pdfencodedfile !== '' &&
            !file
          ) {
            startUploadingDoc();
          }
          const getDataFromStream = async (writeStream) => {
            data.base64pdfencodedfile = writeStream;
            if (dataObj.base64pdfencodedfile) {
              startUploadingDoc();
            }
          };
          if (file) {
            const fileType = file['originalname'];
            const fileExtension = fileType.split('.').pop();
            if (file['size'] > 10e6)
              return failResponse(
                req,
                res,
                {},
                'File size should not be greater than 8 MB',
              );
            if (
              fileExtension != 'pdf' &&
              fileExtension != 'png' &&
              fileExtension !== 'jpeg' &&
              fileExtension !== 'txt' &&
              fileExtension !== 'jpg'
            ) {
              fileExtension;
              return failResponse(
                req,
                res,
                {},
                'Only pdf, png, jpeg, jpg, txt file is allowed',
              );
            }
            if (
              fileExtension === 'jpeg' ||
              fileExtension === 'png' ||
              fileExtension === 'jpg'
            ) {
              const stream = await convertImageToPDF(req, res, file);
              getDataFromStream(stream);
            }
            if (fileExtension === 'txt') {
              const stream = await convertTextToPDF(req, res, file);
              getDataFromStream(stream);
            }
            if (fileExtension === 'pdf') {
              const pdfString = await convertPDFToBase64(req, res, file);
              data.base64pdfencodedfile = pdfString;
              startUploadingDoc();
            }
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //get api for drawdowndoc
  app.post(
    '/api/drawdown-docs',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        //find the custom template path of requested template type
        const loanTemplate = await loanDocTemplateSchema.findByCondition({
          company_id: req.company._id,
          product_id: req.product._id,
        });
        if (!loanTemplate)
          throw {
            message: 'Error fetching loan document template',
          };
        //fetch the custom template json data from s3 by path
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.template_url.substring(
            loanTemplate.template_url.indexOf('loandocument'),
          ),
        );
        if (!resultJson)
          throw {
            message: 'Error fetching json from s3',
          };
        //Fetch uploaded documents against loan_app_id and optional doc_stage
        const uploadedDocs =
          await loanDocumentCommonSchema.findUploadedDrawdownDocsByStage(
            req.body.loan_app_id,
            req.body.doc_stage,
          );
        let resjson = {};
        let arr = [];
        let objs = [];
        uploadedDocs.forEach((item) => {
          arr.push(item.drawdown_request_id);
          const obj = {
            name: item.file_type,
            code: item.code,
            value: item.file_url,
            drawdown_request_id: item.drawdown_request_id,
          };
          objs.push(obj);
        });
        resjson['drawdown_request_id'] = [...new Set(arr)];
        resjson['data'] = objs;
        return res.status(200).send(resjson);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/loan_docs',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        //find the custom template path of requested template type
        const loanTemplate = await loanDocTemplateSchema.findByCondition({
          company_id: req.company._id,
          product_id: req.product._id,
        });
        if (!loanTemplate)
          throw {
            message: 'Error fetching loan document template',
          };
        //fetch the custom template json data from s3 by path
        const resultJson = await s3helper.fetchJsonFromS3(
          loanTemplate.template_url.substring(
            loanTemplate.template_url.indexOf('loandocument'),
          ),
        );
        if (!resultJson)
          throw {
            message: 'Error fetching json from s3',
          };
        //Fetch uploaded documents against loan_app_id and optional doc_stage
        const uploadedDocs =
          await loanDocumentCommonSchema.findUploadedDocsByStage(
            req.body.loan_app_id,
            req.body.doc_stage,
          );

        let resData = [];
        resultJson.forEach((item) => {
          const matchedDocByCode = uploadedDocs.filter(
            (doc) => doc.code === item.code,
          );
          const obj = {
            name: item.title,
            field: item.field,
            value: matchedDocByCode.length ? matchedDocByCode[0].file_url : '',
            checked: item.checked,
            code: item.code,
          };

          if (
            req.authData.type === 'dash-api' &&
            req.user.roleMatrixData.indexOf('tag_loan_documents_paswd_read') >
              -1
          )
            obj['doc_key'] = matchedDocByCode.length
              ? matchedDocByCode[0]?.doc_key || ''
              : '';

          resData.push(obj);
        });
        return res.status(200).send(resData);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/loandocument/:loan_app_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const loan_app_id = req.params.loan_app_id;
        const borrowerReponse =
          await BorrowerInfoCommonSchema.findByLId(loan_app_id);
        if (!borrowerReponse)
          throw {
            message: 'loan app id does not exist.',
            loan_app_id: loan_app_id,
          };
        // common loan Documents Check
        const response =
          await loanDocumentCommonSchema.findByLoanAppID(loan_app_id);
        if (!response)
          throw {
            message:
              'Loan documents are not uploaded against provided loan_app_id',
            loan_app_id: loan_app_id,
          };

        return res.status(200).send({
          success: true,
          message: 'Loan documents fetched successfully',
          docResponse: response,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //view_loan_document
  app.post(
    '/api/view_loan_document',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const data = req.body;
        const document = await s3helper.fetchDocumentFromS3(data.awsurl);
        return res.send(document);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/view-customer-doc',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const data = req.body;
        const document = await s3helper.fetchDocumentFromS3(data.awsurl);
        return res.send(document);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get('/api/loan-document-mapping', async (req, res) => {
    try {
      docArray = await LoanDocumentMappingSchema.getAll();
      return res.send(docArray);
    } catch (error) {
      return res.status(400).send(error);
    }
  });
  
  app.get(
    '/api/user-loan-document/:customer_id',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res, next) => {
      try {
        const customer_id = req.params.customer_id;
        const customerResponse = await CustomerSchema.find({cust_id: customer_id});
        if(!customerResponse || customerResponse.length==0){
                throw{
                    message: 'customer does not exist.',
                    customer_id: customer_id
			    }
		}
		const where = {};
		where.appl_pan = customerResponse[0].pan;
		where.is_deleted = { $ne: 1 };
        const loanReqByPan = await LoanRequestSchema.find(where);
        if (!loanReqByPan || loanReqByPan.length==0){
                throw {
                    message: 'No record found in loan request',
                }
		}    
        const loanAppIds = loanReqByPan.map((item) => {
          return item.loan_app_id;
        });
        // common loan Documents Check
        const response =
          await loanDocumentCommonSchema.findRecentDocumentByLoanAppID(loanAppIds);
        if (!response || response.length==0){
                throw {
                    message:
                         'Loan documents are not uploaded',
                }
		}
        return res.status(200).send({
          success: true,
          message: 'Loan documents fetched successfully',
          docResponse: response,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

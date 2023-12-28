const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const helper = require('../util/helper');
const s3helper = require('../util/s3helper');
const jwt = require('../util/jwt');
const loanDocumentCommonSchema = require('../models/loandocument-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const BorrowerInfoCommonSchema = require('../models/borrowerinfo-common-schema.js');
const AadharMaskingQueue = require('../models/aadhar-masking-queue-schema.js');
const Compliance = require('../models/compliance-schema.js');
const DocumentMappingSchema = require('../models/document-mappings-schema.js');

const { default: axios } = require('axios');
const { data } = require('../maps/borrowerinfo.js');

var uploadDocumentToS3 = async (data, key, req) => {
  try {
    let filePath = '';
    if (!data.file_url) {
      const uploadedFilePath = await s3helper.uploadFileToS3(
        data['base64pdfencodedfile'],
        key,
      );
      if (!uploadedFilePath)
        return {
          message: 'Error uploading file',
        };
      filePath = uploadedFilePath.Location;
    }
    const documentMappings = await DocumentMappingSchema.getAll();
    let documentMapping = {};
    for await (let ele of documentMappings) {
      documentMapping[ele.doc_code] = ele.doc_type;
    }
    const docdata = (()=> {
      if (data.code === '213' && Number(data.doc_index) >= 0) {
        return {
          loan_app_id: data.loan_app_id,
          borrower_id: data.borrower_id,
          partner_loan_app_id: data.partner_loan_app_id,
          partner_borrower_id: data.partner_borrower_id,
          doc_stage: data.doc_stage,
          file_url: data.file_url ? data.file_url : filePath,
          company_id: req.company._id,
          code: data.code,
          file_type: data.file_type,
          doc_key: req.body?.doc_key || '',
          additional_file_url: [data.file_url ? data.file_url : filePath],
        };
      }
      return ({
        loan_app_id: data.loan_app_id,
        borrower_id: data.borrower_id,
        partner_loan_app_id: data.partner_loan_app_id,
        partner_borrower_id: data.partner_borrower_id,
        doc_stage: data.doc_stage,
        file_url: data.file_url ? data.file_url : filePath,
        company_id: req.company._id,
        code: data.code,
        file_type: data.file_type,
        doc_key: req.body?.doc_key || '',
      })
    })();
    //find whether loan_id and borrower id exists in loandocument common table
    const loanDocSchemaRes = await loanDocumentCommonSchema.findIfExists(
      data.loan_app_id,
      data.doc_stage,
      data.file_type,
      data.borrower_id
    );
    if (loanDocSchemaRes === null) {
      //insert the ids and doc url if ids does not exists in loandocument common table
      const addLoanDocSchema = await loanDocumentCommonSchema.addNew(docdata);
      if (!addLoanDocSchema)
        return {
          message: 'Error while adding loan document',
        };
      //send final success response
      if (data.fileType == 'aadhar_card' || data.fileType == 'address_proof') {
        const AadharQueueSucces = await AadharMaskingQueue.addNew({
          loan_app_id: data.loan_app_id,
          url: filePath,
        });
        if (!AadharQueueSucces)
          return {
            message: 'Error adding file in aadhar mask queue',
          };
        return {
          document_id: addLoanDocSchema._id,
          message: 'Loan document uploaded successfully',
        };
      } else {
        if (documentMapping[data.code] == 'selfie') {
          let selfieData = {
            company_id: req.company._id,
            product_id: req.product._id,
            loan_app_id: data.loan_app_id,
            selfie_received: 'Y',
          };
          updateSelfie = await Compliance.updateSelfie(
            data.loan_app_id,
            selfieData,
          );
        }

        return {
          document_id: addLoanDocSchema._id,
          message: 'Loan document uploaded successfully',
        };
      }
    } else {
      //update the record and insert doc url if ids exists in loandocument common table
      const updatedData = (()=>{
        if (data.code === '213' && Number(data.doc_index) >= 0) {
          const additional_file_url = loanDocSchemaRes.additional_file_url;
          if (additional_file_url[data.doc_index]) {
            additional_file_url[data.doc_index] = data.file_url ? data.file_url : filePath;
          } else {
            additional_file_url.push(data.file_url ? data.file_url : filePath);
          } 
          if (data.doc_index === 0) {
            return {
              file_url: data.file_url ? data.file_url : filePath,
              company_id: req.company._id,
              doc_key: req.body?.doc_key || '',
              additional_file_url: additional_file_url,
            };
          } else {
            return({
              company_id: req.company._id,
              doc_key: req.body?.doc_key || '',
              additional_file_url: additional_file_url
            })
          }
        }
        return {
          file_url: data.file_url ? data.file_url : filePath,
          company_id: req.company._id,
          doc_key: req.body?.doc_key || '',
        };
      })()

      const updateLoanDocSchema = await loanDocumentCommonSchema.updateExisting(
        updatedData,
        loanDocSchemaRes._id,
        data.loan_app_id,
        data.borrower_id,
        data.doc_stage,
        data.key,
      );
      if (!updateLoanDocSchema)
        return {
          message: 'Error uploading file',
        };
      if (data.fileType == 'aadhar_card' || data.fileType == 'address_proof') {
        const AadharQueue = await AadharMaskingQueue.addNew({
          loan_app_id: data.loan_app_id,
          url: filePath,
        });
        if (!AadharQueue)
          return {
            message: 'Error adding file in aadhar mask queue',
          };
        return {
          document_id: updateLoanDocSchema._id,
          message: 'Loan document uploaded successfully',
        };
      } else {
        if (documentMapping[data.code] == 'selfie') {
          let selfieData = {
            company_id: req.company._id,
            product_id: req.product._id,
            loan_app_id: data.loan_app_id,
            selfie_received: 'Y',
          };
          updateSelfie = await Compliance.updateSelfie(
            data.loan_app_id,
            selfieData,
          );
        }
        return {
          document_id: updateLoanDocSchema._id,
          message: 'Loan document uploaded successfully',
        };
      }
    }
  } catch (error) {
    return {
      error,
    };
  }
};
var uploadDirectFileToS3 = async (data, key, req) => {
  try {
    let filePath = '';
    // Upload file to S3
    const fileToUpload = req.authData.type !== 'api' ? data : data.file;
    const uploadedFilePath = await s3helper.uploadDirectFileToS3(
      data.file,
      key,
      data.code,
      req.authData.type,
    );
    if (!uploadedFilePath)
      return {
        message: 'Error uploading file',
      };
    filePath = uploadedFilePath.Location;
    const docdata = {
      loan_app_id: data.loan_app_id,
      borrower_id: data.borrower_id,
      partner_loan_app_id: data.partner_loan_app_id,
      partner_borrower_id: data.partner_borrower_id,
      doc_stage: data.doc_stage,
      file_url: filePath,
      company_id: req.company._id,
      code: data.code,
      file_type: data.file_type,
    };
    //find whether loan_id and borrower id exists in loandocument common table
    const loanDocSchemaRes = await loanDocumentCommonSchema.findIfExists(
      data.loan_app_id,
      data.doc_stage,
      data.file_type,
    );
    if (!loanDocSchemaRes) {
      //insert the ids and doc url if ids does not exists in loandocument common table
      const addLoanDocSchema = await loanDocumentCommonSchema.addNew(docdata);
      if (!addLoanDocSchema)
        return {
          message: 'Error while adding loan document',
        };
      return {
        document_id: addLoanDocSchema._id,
        message: 'Loan document uploaded successfully',
      };
    } else {
      //update the record and insert doc url if ids exists in loandocument common table
      const updateLoanDocSchema = await loanDocumentCommonSchema.updateExisting(
        {
          file_url: filePath,
          company_id: req.company._id,
        },
        loanDocSchemaRes._id,
        data.loan_app_id,
        data.borrower_id,
        data.doc_stage,
      );
      if (!updateLoanDocSchema)
        return {
          message: 'Error uploading file',
        };
      return {
        document_id: updateLoanDocSchema._id,
        message: 'Loan document uploaded successfully',
      };
    }
  } catch (error) {
    console.log('error uploading file', error);
    return {
      error,
    };
  }
};
//for draw down
var uploadDrawdownDocumentToS3 = async (data, key, req) => {
  try {
    let filePath = '';
    if (!data.file_url) {
      const uploadedFilePath = await s3helper.uploadFileToS3(
        data['base64pdfencodedfile'],
        key,
      );
      if (!uploadedFilePath)
        throw {
          message: 'Error uploading file',
        };
      filePath = uploadedFilePath.Location;
    }
    const docdata = {
      loan_app_id: data.loan_app_id,
      borrower_id: data.borrower_id,
      partner_loan_app_id: data.partner_loan_app_id,
      partner_borrower_id: data.partner_borrower_id,
      doc_stage: data.doc_stage,
      file_url: data.file_url ? data.file_url : filePath,
      company_id: req.company._id,
      code: data.code,
      file_type: data.file_type,
      drawdown_request_id: data.drawdown_request_id,
      key: data.key,
    };
    //insert the ids and doc url if ids does not exists in loandocument common table
    const exists = await loanDocumentCommonSchema.findByUIDAndDoc(
      data.drawdown_request_id,
      data.code,
    );
    if (!exists) {
      const addLoanDocSchema = await loanDocumentCommonSchema.addNew(docdata);
      if (!addLoanDocSchema)
        throw {
          message: 'Error while adding loan document',
        };
      //send final success response
      return {
        document_id: addLoanDocSchema._id,
        message: 'Loan document uploaded successfully',
      };
    } else {
      const updateLoanDocSchema = await loanDocumentCommonSchema.updateExisting(
        {
          file_url: data.file_url ? data.file_url : filePath,
          company_id: req.company._id,
        },
        exists._id,
        data.loan_app_id,
        data.borrower_id,
        data.doc_stage,
      );
      if (!updateLoanDocSchema)
        throw {
          message: 'Error uploading file',
        };
      return {
        document_id: updateLoanDocSchema._id,
        message: 'Loan document updated successfully',
      };
    }
  } catch (error) {
    return {
      error,
    };
  }
};

var continueUploadDocument = async (req, data) => {
  try {
    const documentMappings = await DocumentMappingSchema.getAll();
    let documentMapping = {};
    for await (let ele of documentMappings) {
      documentMapping[ele.doc_code] = ele.doc_type;
    }
    data.file_type = documentMapping[data.code];
    if (!data.file_type)
      throw {
        message: 'Invalid document code',
      };
    if (!data.file_url && !data.base64pdfencodedfile)
      throw {
        message: 'base64pdfencodedfile or file_url is required',
      };
    const resultLoan = await LoanRequestSchema.findByLId(data.loan_app_id);
    if (!resultLoan)
      throw {
        message: 'loan application id does not exists.',
      };
    const reqData = req.body;

    const resultBi = await BorrowerInfoCommonSchema.findByLId(data.loan_app_id);
    if (resultBi) {
      if (req.product.allowMiscDocAfterDisbursal && resultBi.stage > 3)
        return 'Loan status is post disburse hence cannot upload document now.';
      data.doc_stage =
        resultBi.stage === 0
          ? 'pre_approval'
          : resultBi.stage === 4
          ? 'post_disbursal'
          : 'post_approval';
    } else if (!resultBi || resultBi === null) {
      data.doc_stage = 'pre_approval';
    }
    const key = `loandocument/${
      req.company ? req.company.code : 'BK'
    }/${req.product.name.replace(/\s/g, '')}/${Date.now()}/${
      data.loan_app_id
    }/${documentMapping[data.code]}.txt`;
    //find the custom template path of requested template type
    const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
      req.loanSchema.loan_custom_templates_id,
      'loandocument',
    );
    if (!loanTemplate) return 'Error while finding loan template';
    //fetch the custom template json data from s3 by path
    const resultJson = await s3helper.fetchJsonFromS3(loanTemplate.path, {
      method: 'Get',
    });
    if (!resultJson)
      throw {
        message: 'Error fetching json from s3',
      };
    if (req.query.validate)
      return res.json({
        success: true,
        validated: true,
        message: 'Fields have valid data',
      });
    //upload the document to s3 after valiadation

    data.borrower_id = data.borrower_id ?? resultLoan.borrower_id;
    data.partner_loan_app_id = resultLoan.partner_loan_app_id;
    data.partner_borrower_id = resultLoan.partner_borrower_id;

    const docUpload = await uploadDocumentToS3(data, key, req);
    if (!docUpload) return 'Error while uploading document';
    return docUpload;
  } catch (error) {
    return {
      error,
    };
  }
};

var continueUploadDrawdownDocument = async (req, data) => {
  try {
    const documentMappings = await DocumentMappingSchema.getAll();
    let documentMapping = {};
    for await (let ele of documentMappings) {
      documentMapping[ele.doc_code] = ele.doc_type;
    }
    data.file_type = documentMapping[data.code];
    if (!data.file_type)
      throw {
        message: 'Invalid document code',
      };
    if (!data.file_url && !data.base64pdfencodedfile)
      throw {
        message: 'base64pdfencodedfile or file_url is required',
      };
    const resultLoan = await LoanRequestSchema.findByLId(data.loan_app_id);
    if (!resultLoan)
      throw {
        message: 'loan application id does not exists.',
      };
    const resultBi = await BorrowerInfoCommonSchema.findByLId(data.loan_app_id);
    if (resultBi) {
      data.doc_stage = 'draw_down_document';
    } else if (!resultBi || resultBi === null) {
      data.doc_stage = 'draw_down_document';
    }
    const key = `loandocument/${
      req.company ? req.company.code : 'BK'
    }/${req.product.name.replace(/\s/g, '')}/${Date.now()}/${
      data.loan_app_id
    }/${documentMapping[data.code]}.txt`;
    //find the custom template path of requested template type
    const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
      req.loanSchema.loan_custom_templates_id,
      'loandocument',
    );
    if (!loanTemplate) return 'Error while finding loan template';
    //fetch the custom template json data from s3 by path
    const resultJson = await s3helper.fetchJsonFromS3(loanTemplate.path, {
      method: 'Get',
    });
    if (!resultJson) return 'Error fetching json from s3';
    if (req.query.validate)
      return res.json({
        success: true,
        validated: true,
        message: 'Fields have valid data',
      });
    //upload the document to s3 after valiadation
    data.borrower_id = resultLoan.borrower_id;
    data.partner_loan_app_id = resultLoan.partner_loan_app_id;
    data.partner_borrower_id = resultLoan.partner_borrower_id;
    const docUpload = await uploadDrawdownDocumentToS3(data, key, req);
    if (!docUpload) return 'Error while uploading document';
    return docUpload;
  } catch (error) {
    return {
      error,
    };
  }
};

var continueUploadDirectFile = async (req, data) => {
  try {
    const documentMappings = await DocumentMappingSchema.getAll();
    let documentMapping = {};
    for await (let ele of documentMappings) {
      documentMapping[ele.doc_code] = ele.doc_type;
    }
    data.file_type = documentMapping[data.code];
    if (!data.file_type)
      throw {
        message: 'Invalid document code',
      };
    if (!data.file)
      throw {
        message: 'file is required',
      };
    const resultLoan = await LoanRequestSchema.findByLId(data.loan_app_id);
    if (!resultLoan)
      throw {
        message: 'loan application id does not exists.',
      };
    const resultBi = await BorrowerInfoCommonSchema.findByLId(data.loan_app_id);
    if (resultBi) {
      if (req.product.allowMiscDocAfterDisbursal && resultBi.stage > 3)
        return 'Loan status is post disburse hence cannot upload document now.';
      data.doc_stage =
        resultBi.stage === 0
          ? 'pre_approval'
          : resultBi.stage === 4
          ? 'post_disbursal'
          : 'post_approval';
    } else if (!resultBi || resultBi === null) {
      data.doc_stage = 'pre_approval';
    }
    const key = `loandocument/${
      req.company ? req.company.code : 'BK'
    }/${req.product.name.replace(/\s/g, '')}/${Date.now()}/${
      data.loan_app_id
    }/${documentMapping[data.code]}.${data.extension}`;
    //find the custom template path of requested template type
    const loanTemplate = await LoanTemplatesSchema.findByNameTmplId(
      req.loanSchema.loan_custom_templates_id,
      'loandocument',
    );
    if (!loanTemplate) return 'Error while finding loan template';
    //fetch the custom template json data from s3 by path
    const resultJson = await s3helper.fetchJsonFromS3(loanTemplate.path, {
      method: 'Get',
    });
    if (!resultJson) return 'Error fetching json from s3';
    if (req.query.validate)
      return res.json({
        success: true,
        validated: true,
        message: 'Fields have valid data',
      });
    //upload the document to s3 after valiadation
    data.borrower_id = resultLoan.borrower_id;
    data.partner_loan_app_id = resultLoan.partner_loan_app_id;
    data.partner_borrower_id = resultLoan.partner_borrower_id;
    const docUpload = await uploadDirectFileToS3(data, key, req);
    if (!docUpload) return 'Error while uploading document';
    return docUpload;
  } catch (error) {
    return {
      error,
    };
  }
};

const sendUdhyamRegistrationCertificateToOCR = async (req, res, next) => {
  const existingLead = await LoanRequestSchema.findByLId(req.body.loan_app_id);
  const payload = {
    loan_app_id: req.body.loan_app_id,
    document_type: '106',
    data: req.body.base64pdfencodedfile,
  };
  axios
    .post(
      `${process.env.CAMS_BASE_URL}${process.env.CAMS_PARSER_URL}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'access-token': process.env.CAMS_JWT_TOKEN,
        },
      },
    )
    .then(async (response) => {
      console.log('successfully sent doc to cam parser', response.data);
      existingLead.urc_parsing_data = '';
      existingLead.urc_parsing_status = 'initiated';
      const dataUpdate = await LoanRequestSchema.updateCamDetails(
        req.body.loan_app_id,
        existingLead,
      );
    })
    .catch((error) => {
      console.log('Error sending doc to cam parser');
      return res.status(400).json({
        message: error.response.data.message,
      });
    });
};

module.exports = {
  continueUploadDocument,
  continueUploadDrawdownDocument,
  continueUploadDirectFile,
  sendUdhyamRegistrationCertificateToOCR,
};

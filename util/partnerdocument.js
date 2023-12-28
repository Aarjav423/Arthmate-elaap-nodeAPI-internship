const s3helper = require('../util/s3helper');
const partnerDocumentSchema = require('../models/partner-document-schema.js');
const loanedits = require('./loanedits');
const { default: axios } = require('axios');
const DocumentMappingSchema = require('../models/document-mappings-schema.js');

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
    const docdata = {
      file_url: data.file_url ? data.file_url : filePath,
      company_id: req.company._id,
      code: data.code,
      file_type: data.file_type,
      doc_key: req.body?.doc_key || '',
    };
    //find whether company_id and code exists in partnerdocument table
    const partnerDocSchemaRes = await partnerDocumentSchema.findIfExists(
      data.file_type,
      data.code,
      req.company._id,
    );
    if (!partnerDocSchemaRes || partnerDocSchemaRes === null) {
      //insert the ids and doc url if ids does not exists in partnerdocument table
      const addPartnerDocSchema = await partnerDocumentSchema.addNew(docdata);
      if (!addPartnerDocSchema)
        return {
          message: 'Error while adding partner document',
        };
      return {
        document_id: addPartnerDocSchema._id,
        message: 'Document uploaded successfully',
      };
    } else {
      //update the record and insert doc url if ids exists in partnerdocument table
      const updatePartnerDocSchema = await partnerDocumentSchema.updateExisting(
        req.company._id,
        data.code,
        {
          file_url: data.file_url ? data.file_url : filePath,
          company_id: req.company._id,
          doc_key: req.body?.doc_key || '',
        },
      );
      if (!updatePartnerDocSchema)
        return {
          message: 'Error uploading file',
        };
      return {
        document_id: updatePartnerDocSchema._id,
        message: 'Document uploaded successfully',
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
    const key = `partnerdocument/${
      req.company ? req.company.code : 'BK'
    }/${Date.now()}/${documentMapping[data.code]}.txt`;
    const docUpload = await uploadDocumentToS3(data, key, req);
    if (!docUpload) return 'Error while uploading document';
    return docUpload;
  } catch (error) {
    return {
      error,
    };
  }
};

module.exports = {
  continueUploadDocument,
};

bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const AccessLog = require('../util/accessLog');
const partnerDocumentUtils = require('../util/partnerdocument');
const s3helper = require('../util/s3helper');
const partnerDocumentSchema = require('../models/partner-document-schema.js');
let reqUtils = require('../util/req.js');
const jwt = require('../util/jwt');
const {
  convertImageToPDF,
  convertTextToPDF,
  convertPDFToBase64,
} = require('../util/pdfFunc');
const { failResponse } = require('../utils/responses');
const { re } = require('mathjs');
module.exports = (app, connection) => {
  app.use(bodyParser.json());
  const startUploadingDoc = async (req, res, next, data) => {
    const uploadDocumentData =
      await partnerDocumentUtils.continueUploadDocument(req, data);
    return reqUtils.json(req, res, next, 200, {
      uploadDocumentData,
    });
  };
  // API to get partnerDocument
  app.get(
    '/api/partner-document/:company_id',
    [jwt.verifyToken, jwt.verifyCompany],
    [AccessLog.maintainAccessLog],
    async (req, res, next) => {
      try {
        if (req.params.company_id != req.company._id)
          throw {
            success: false,
            message: 'Company not matching in token',
          };
        const documents = await partnerDocumentSchema.findAllRecord({
          company_id: req.params.company_id,
        });
        return reqUtils.json(req, res, next, 200, { data: documents });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  //API to view_partnerDocument
  app.post(
    '/api/view-partner-document',
    [jwt.verifyToken, jwt.verifyCompany],
    async (req, res) => {
      try {
        const document = await s3helper.fetchDocumentFromS3BySeparator(
          req.body.awsurl,
          'partnerdocument',
        );

        return res.send(document);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  // API to upload partnerDocument
  app.post(
    '/api/partner-document',
    [jwt.verifyToken, jwt.verifyCompany],
    [AccessLog.maintainAccessLog],
    async (req, res, next) => {
      try {
        let data = req.body;
        const file = req?.files && req?.files[0];
        const { code } = req.body;
        if (
          !code ||
          code === '' ||
          code === null ||
          code === 'null' ||
          code === undefined ||
          code === 'undefined'
        )
          throw { success: false, message: 'code is required' };
        const getDataFromStream = async (writeStream) => {
          data.base64pdfencodedfile = writeStream;
          if (data.base64pdfencodedfile) {
            startUploadingDoc(req, res, next, data);
          }
        };
        if (
          data?.base64pdfencodedfile !== null &&
          data?.base64pdfencodedfile !== '' &&
          !file
        ) {
          startUploadingDoc(req, res, next, data);
        } else if (file) {
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
            req.body.base64pdfencodedfile = pdfString;
            startUploadingDoc(req, res, next, data);
          }
        } else {
          throw {
            success: false,
            message:
              'Either file or base64pdfencodedfile is required in order to upload the document',
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

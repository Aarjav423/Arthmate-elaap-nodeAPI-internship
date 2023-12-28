'use strict';
const fs = require('fs');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const fetch = require('node-fetch');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const serReqResLog = require('../models/service-req-res-log-schema');
const s3bucket = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const cache = require('memory-cache');
const CACHE_EXPIRE = 60 * 60 * 1000;

const uploadXmlDataToS3Bucket = async (
  companyCode,
  retype,
  item,
  serviceName,
) => {
  try {
    var params = {
      Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
      Key: `${
        companyCode ? companyCode : 'ARTM'
      }/services/${companyCode}/${serviceName}/${Date.now()}/${retype}.txt`,
      Body: JSON.stringify(item),
    };
    const promise = new Promise(function (resolve, reject) {
      try {
        s3bucket.upload(params, function (err, uploadedFile) {
          if (err) {
            reject(err);
          } else {
            resolve(uploadedFile);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
    return promise;
  } catch (error) {}
};

const uploadPayuXmlDataToS3Bucket = (
  companyCode,
  retype,
  item,
  serviceName,
  callback,
) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `${
      companyCode ? companyCode : 'BOOKING'
    }/payu/${companyCode}/${serviceName}/${Date.now()}/${retype}.txt`,
    Body: JSON.stringify(item),
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const uploadHTMLDataToS3Bucket = (
  companyCode,
  retype,
  item,
  serviceName,
  callback,
) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `${
      companyCode ? companyCode : 'BOOKING'
    }/services/${companyCode}/${serviceName}/${Date.now()}/${retype}.html`,
    Body: item,
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const uploadPdfFileToS3Bucket = (company_id, fileName, callback) => {
  const fileContent = fs.readFileSync(
    path.join(__dirname, `../utils/pdf/${fileName}`),
  );
  var date = new Date();
  var day = date.getDate();
  var month = date.getMonth();
  var year = date.getFullYear();
  var dates = day + '-' + month + '-' + year;
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `${dates}/${company_id}/${fileName}`,
    Body: fileContent,
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const uploadTemplateToS3Single = (data, item, callback) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `${data.company_id ? data.company_id : 'BOOKING'}/templates/${
      data.template_type
    }/${data.loan_type_id}/${item}.json`,
    Body: JSON.stringify(item),
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const uploadCompanyDocs = (company_id, item, doc_type, doc_name, callback) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: `companydocs/${company_id}/${doc_type}/${Date.now()}/${doc_name}.txt`,
    Body: JSON.stringify(item),
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, uploadedFile);
    }
  });
};

const uploadTemplatesToS3Multi = (data) => {
  const promise = new Promise(function (resolve, reject) {
    try {
      const templatesObj = Object.keys(data.templates);
      const respFilesPath = [];
      var uploadedFilesObjbyPath = {};
      templatesObj.map((item) => {
        const template = JSON.stringify(data.templates[item]);
        const company_code =
          data.template_type === 'custom'
            ? `${data.company_code}/${Date.now()}`
            : 'SAAS';
        var params = {
          Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
          Key: `templates/${company_code}/${data.template_type}/${data.loan_type_id}/${item}.json`,
          Body: template,
        };
        s3bucket.upload(params, (err, uploadedFile) => {
          respFilesPath.push(uploadedFile.Location);
          if (respFilesPath.length == templatesObj.length) {
            templatesObj.forEach((tmpl) => {
              const pathByTmpl = respFilesPath.filter((path) => {
                return path.indexOf(`${tmpl}.json`) > -1;
              });
              uploadedFilesObjbyPath[tmpl] = pathByTmpl[0];
            });
            resolve(uploadedFilesObjbyPath);
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const fetchJsonFromS3 = async (s3url) => {
  try {
    if (s3url != null) {
      const docData = await fetchDataFromS3(s3url);
      var contents = docData.toString('utf-8');
      return JSON.parse(contents);
    }
  } catch (error) {
    return error;
  }
};

const fetchXMLFromS3 = async (s3url) => {
  try {
    if (s3url != null) {
      const docData = await fetchDataFromS3(s3url);
      var contents = docData.toString('utf-8');
      const xmlContents = contents.replace(/[\\n\"]/gm, '');
      return xmlContents;
    }
  } catch (error) {
    return error;
  }
};

const uploadKycToS3Single = (key, item, callback) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: key,
    Body: JSON.stringify(item),
  };
  s3bucket.upload(params, function (err, uploadedFile) {
    if (err) {
      callback(err, null);
    }
    if (uploadedFile) {
      callback(null, uploadedFile);
    }
  });
};

const uploadFileToS3 = (item, key) => {
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: key,
    Body: JSON.stringify(item),
  };
  const promise = new Promise(function (resolve, reject) {
    try {
      s3bucket.upload(params, function (err, uploadedFile) {
        if (err) {
          reject(err);
        } else {
          resolve(uploadedFile);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const uploadFileToS3WithBucket = (item, key, bucket) => {
  var params = {
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(item),
  };
  const promise = new Promise(function (resolve, reject) {
    try {
      s3bucket.upload(params, function (err, uploadedFile) {
        if (err) {
          reject(err);
        } else {
          resolve(uploadedFile);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const asyncFetchJsonFromS3 = (url, options) => {
  return new Promise(function (resolve, reject) {
    if (url != null) {
      fetch(url, options)
        .then((res) => res.json())
        .then(resolve)
        .catch((err) => {
          return reject({
            success: false,
            message: 'Invalid url.',
          });
        });
    } else {
      reject({
        success: false,
        message: 'bad url',
      });
    }
  });
};

const convertImgBase64ToPdfBase64 = (base64, cb) => {
  let name = Date.now();
  var pngFileName = `./${name}.png`;
  var base64Data = base64;
  fs.writeFile(pngFileName, base64Data, 'base64', function (err) {
    if (err) return cb(true, null);
    const doc = new PDFDocument({
      size: 'A4',
    });
    doc.image(pngFileName, {
      fit: [500, 400],
      align: 'center',
      valign: 'center',
    });
    doc
      .pipe(fs.createWriteStream(`./${name}.pdf`))
      .on('finish', function (err) {
        fs.unlink(`./${name}.png`, (errUnlinkHtml) => {
          if (errUnlinkHtml) return cb(true, null);
        });
        pdf2base64(`./${name}.pdf`)
          .then((pdfResp) => {
            fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
              if (errUnlinkHtml) return cb(true, null);
              return cb(null, pdfResp);
            });
          })
          .catch((error) => {
            fs.unlink(`./${name}.pdf`, (errUnlinkHtml) => {
              if (errUnlinkHtml) return cb(true, null);
            });
            return cb(true, null);
          });
      });
    doc.end();
  });
};

const uploadLoanDoc = (data, req) => {
  let submitdata = {
    base64pdfencodedfile: data.base64pdfencodedfile,
    fileType: data.fileType,
    loan_id: data.loan_id,
    borrower_id: data.borrower_id,
    partner_loan_id: data.partner_loan_id,
    partner_borrower_id: data.partner_borrower_id,
  };
  var basePath = 'http://localhost:' + process.env.PORT;
  var loanDocumentUrl = `${basePath}/api/loandocument`;
  axios
    .post(loanDocumentUrl, submitdata, {
      headers: {
        Authorization: req.headers['authorization'],
        company_code: req.headers['company_code'],
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    .then((response) => {
      return true;
    })
    .catch((err) => {
      return false;
    });
};

const nonstrictValidateDataWithTemplate = (template, data) => {
  let errorRows = [];
  let validatedRows = [];
  let unknownColumns = [];
  let missingColumns = [];
  let exactErrorColumns = [];
  //Check if any column is missing compared to the templated upload against this schema
  missingColumns = template.filter((column, index) => {
    return (
      column.checked == 'TRUE' && data[0].hasOwnProperty(column.field) == false
    );
  });
  if (missingColumns.length)
    return {
      missingColumns,
      errorRows,
      validatedRows,
      unknownColumns,
      exactErrorColumns,
    };
  //Check if all fields required are provided
  //And do the validation
  data.forEach((row, index) => {
    let columnError = null;
    let exactColumnError = {};
    Object.keys(row)
      .filter((key) => key != '')
      .forEach((column) => {
        const checker = template.filter((check) => {
          return check.field == column;
        });
        if (checker.length) {
          const value =
            !row[column] || row[column] === undefined || row[column] === null
              ? ''
              : row[column];
          validateData(checker[0].type, value, (validation) => {
            if (checker[0].checked === 'TRUE' && validation === false) {
              row[column] = checker[0].validationmsg;
              columnError = row;
              exactColumnError[column] = checker[0].validationmsg;
            } else if (
              checker[0].checked === 'FALSE' &&
              validation === false &&
              value !== ''
            ) {
              row[column] = checker[0].validationmsg;
              columnError = row;
              exactColumnError[column] = checker[0].validationmsg;
            }
          });
        }
      });
    if (columnError) {
      errorRows.push(columnError);
      exactErrorColumns.push(exactColumnError);
    }
    if (!columnError) validatedRows.push(row);
  });
  return {
    missingColumns,
    errorRows,
    validatedRows,
    unknownColumns,
    exactErrorColumns,
  };
};

const fetchDataFromS3 = async (url) => {
  try {
    var params = {
      Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
      Key: url,
    };
    const dataFromS3 = await s3bucket.getObject(params).promise();
    return dataFromS3.Body;
  } catch (error) {
    return error;
  }
};

const fetchDataFromColenderS3 = async (url, bucketName) => {
  try {
    var params = {
      Bucket: bucketName,
      Key: url,
    };
    const dataFromS3 = await s3bucket.getObject(params).promise();
    return dataFromS3.Body;
  } catch (error) {
    return error;
  }
};

const readColenderFileFromS3 = async (url, bucketName) => {
  var params = {
    Bucket: bucketName,
    Key: url,
  };
  var fileStream = await s3bucket.getObject(params).createReadStream();
  return fileStream;
};

const fetchDocumentFromS3 = async (s3Url) => {
  try {
    const url = s3Url.substring(s3Url.indexOf('loandocument'));
    const docData = await fetchDataFromS3(unescape(url));
    var contents = docData.toString('utf-8');
    return contents;
  } catch (error) {
    return error;
  }
};

const fetchDocumentFromS3BySeparator = async (s3Url, separator) => {
  try {
    const url = s3Url.substring(s3Url.indexOf(separator));
    const docData = await fetchDataFromS3(url);
    var contents = docData.toString('utf-8');
    return contents;
  } catch (error) {
    return error;
  }
};

const readFileFromS3 = async (key) => {
  try {
    var params = {
      Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
      Key: key,
    };
    const dataFromS3 = await s3bucket.getObject(params).promise();
    return dataFromS3.Body;
  } catch (error) {
    console.log('readFileFromS3 error', error);
    return error;
  }
};

const storeRequestToS3 = async (req, res, next) => {
  try {
    const apiName = req.apiName;
    var logData = {
      company_id: req.company && req.company._id ? req.company._id : null,
      company_code: req.company && req.company.code ? req.company.code : null,
      vendor_name: req.vendor_name,
      service_id: '',
      api_name: apiName,
      raw_data: '',
      response_type: '',
      request_type: '',
      timestamp: Date.now(),
      request_id: `${req.company.code}-${apiName}-${Date.now()}`,
      document_uploaded_s3: '',
      api_response_type: 'JSON',
      api_response_status: '',
    };
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const keyRequestLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload request data on s3
    let s3LogResult = await uploadFileToS3(req.body, keyRequestLog);
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    }
    logData.document_uploaded_s3 = 1;
    logData.response_type = 'success';
    logData.api_response_status = '';
    logData.raw_data = s3LogResult.Location;
    logData.request_type = 'request';
    //insert request data s3 upload response to database
    let localLogResult = await serReqResLog.addNew(logData);
    req.logData = logData;
    req.reqS3Url = s3LogResult.Location;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const storeResponseToS3 = async (req, res, next) => {
  try {
    let logData = req.logData;
    let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const keyResponseLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    const s3LogResult = await uploadFileToS3(
      req.responseData.data,
      keyResponseLog,
    );
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    } else {
      logData.document_uploaded_s3 = 1;
      logData.response_type = 'success';
    }
    logData.raw_data = await s3LogResult.Location;
    logData.request_type = 'response';
    if (req.responseData.status === '200') {
      logData.api_response_status = 'SUCCESS';
    } else {
      logData.api_response_status = 'FAIL';
    }
    //insert response data s3 upload response to database
    await serReqResLog.addNew(logData);
    req.resS3Url = s3LogResult.Location;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const storeRequestDataToS3 = async (req) => {
  try {
    const apiName = req.apiName;
    var logData = {
      company_id: req.company && req.company._id ? req.company._id : null,
      company_code: req.company && req.company.code ? req.company.code : null,
      company_name: req.company && req.company.name ? req.company.name : null,
      vendor_name: req.vendor_name,
      service_id: '',
      api_name: apiName,
      raw_data: '',
      response_type: '',
      request_type: '',
      timestamp: Date.now(),
      request_id: `${req.company.code}-${apiName}-${Date.now()}`,
      document_uploaded_s3: '',
      api_response_type: 'JSON',
      api_response_status: '',
    };
    let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
    const keyRequestLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    //upload request data on s3
    let s3LogResult = await uploadFileToS3(req.body, keyRequestLog);
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    }
    logData.document_uploaded_s3 = 1;
    logData.response_type = 'success';
    logData.api_response_status = '';
    logData.raw_data = s3LogResult.Location;
    logData.request_type = 'request';
    //insert request data s3 upload response to database
    let localLogResult = await serReqResLog.addNew(logData);
    req.logData = logData;
    req.reqS3Url = s3LogResult.Location;
    return true;
  } catch (error) {
    return error;
  }
};

const storeResponseDataToS3 = async (req, data) => {
  try {
    let logData = req.logData;
    let filename = Math.floor(10000 + Math.random() * 99999) + '_res';
    const keyResponseLog = `${logData.api_name}/${logData.vendor_name}/${logData.company_id}/${filename}/${logData.timestamp}.txt`;
    const s3LogResult = await uploadFileToS3(data, keyResponseLog);
    if (!s3LogResult) {
      (logData.document_uploaded_s3 = 0), (logData.response_type = 'error');
    } else {
      logData.document_uploaded_s3 = 1;
      logData.response_type = 'success';
    }
    logData.raw_data = await s3LogResult.Location;
    logData.request_type = 'response';
    if (data.status === '200') {
      logData.api_response_status = 'SUCCESS';
    } else {
      logData.api_response_status = 'FAIL';
    }
    //insert response data s3 upload response to database
    await serReqResLog.addNew(logData);
    req.resS3Url = s3LogResult.Location;
    return true;
  } catch (error) {
    return error;
  }
};

const fetchDataFromS3ByURL = async (url) => {
  try {
    const regex = /https:\/\/([^\.]+)\.s3/;
    const result = url.match(regex);
    const bucketName = result[1];
    if (!result) {
      throw {
        success: false,
        Messgae: 'Bucket name not found',
      };
    }
    const regexUrl = /com\/([^\.]+)\//;
    const output = url.match(regexUrl);
    const urlIndex = output[1];
    var params = {
      Bucket: bucketName,
      Key: url.substring(url.indexOf(urlIndex)),
    };
    const dataFromS3 = await s3bucket.getObject(params).promise();
    return dataFromS3.Body;
  } catch (error) {
    return error;
  }
};

const uploadDirectFileToS3 = (file, key, code, type) => {
  console.log('type >>>>>>>>>>>>', type);
  console.log('file ============', file);
  const buffer = Buffer.from(JSON.stringify(file), 'binary');
  var params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/vnd.ms-excel',
  };
  const promise = new Promise(function (resolve, reject) {
    try {
      s3bucket.upload(params, function (err, uploadedFile) {
        if (err) {
          reject(err);
        } else {
          resolve(uploadedFile);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const putFileIntoS3 = (key, buffer, contentType) => {
  let params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };
  return s3bucket.upload(params).promise();
};

const deleteS3Object = async (s3Url) =>  {
  try {

    const parts = s3Url.split('/');
    const objectKey =  parts.slice(3).join('/');
    
    const params = {
      Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
      Key: objectKey,
    };
    await s3bucket.deleteObject(params).promise();
    console.log(`Object deleted: ${s3Url}`);
  } catch (error) {
    console.error(`Error deleting object from S3: ${error.message}`);
  }
}

const deleteS3Objects = async (s3Urls) => {
  try {
    const objectKeys = s3Urls.map((s3Url) => {
      const parts = s3Url.split('/');
      return { Key: parts.slice(3).join('/') };
    });

    const params = {
      Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
      Delete: { Objects: objectKeys },
    };

    await s3bucket.deleteObjects(params).promise();
    console.log(`Objects deleted in bulk.`);
  } catch (error) {
    console.error(`Error deleting objects from S3: ${error.message}`);
  }
};
module.exports = {
  uploadXmlDataToS3Bucket,
  uploadPayuXmlDataToS3Bucket,
  uploadHTMLDataToS3Bucket,
  uploadPdfFileToS3Bucket,
  uploadTemplateToS3Single,
  fetchDataFromColenderS3,
  uploadCompanyDocs,
  fetchJsonFromS3,
  fetchXMLFromS3,
  uploadKycToS3Single,
  uploadFileToS3,
  readColenderFileFromS3,
  uploadFileToS3WithBucket,
  convertImgBase64ToPdfBase64,
  uploadLoanDoc,
  nonstrictValidateDataWithTemplate,
  uploadTemplatesToS3Multi,
  asyncFetchJsonFromS3,
  fetchDocumentFromS3,
  fetchDocumentFromS3BySeparator,
  fetchDataFromS3,
  readFileFromS3,
  storeRequestToS3,
  storeResponseToS3,
  storeRequestDataToS3,
  storeResponseDataToS3,
  fetchDataFromS3ByURL,
  uploadDirectFileToS3,
  putFileIntoS3,
  deleteS3Object,
  deleteS3Objects
};

'use strict';
const AWS = require('aws-sdk');
const s3bucket = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: 'ap-south-1',
  Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
});

const nachs3bucket = new AWS.S3({
  accessKeyId: process.env.AWS_NACH_ACCESS_KEY,
  secretAccessKey: process.env.AWS_NACH_SECRET_ACCESS_KEY,
  region: 'ap-south-1'
});

const s3Configuration = (filename, bucketName, accessKey, secretKey, region, expirationTime) => {
  const amazonIndex = filename.indexOf('amazonaws.com');
  let trimmedUrl = '';
  if (amazonIndex !== -1) {
    trimmedUrl = filename.slice(amazonIndex + 'amazonaws.com/'.length);
  }

  const s3 = new AWS.S3({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    signatureVersion: 'v4',
    region: region,
  });

  const params = {
    Bucket: bucketName,
    Key: trimmedUrl,
    Expires: Number(expirationTime),
  };

  return {s3, params};
};

const uploadPdfFileToS3 = (pdf, filename) => {
  // upload PDF file to S3 bucket
  const params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: filename,
    Body: pdf,
  };
  const promise = new Promise(function (resolve, reject) {
    try {
      s3bucket.upload(params, function (err, uploadedFile) {
        if (err) {
          reject(err);
        } else {
          resolve(uploadedFile.Location);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

const getSignedUrl = async (filename) => {
  const params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: filename,
    Expires: 60 * 5,
  };
  try {
    const url = await new Promise((resolve, reject) => {
      s3bucket.getSignedUrl('getObject', params, (err, url) => {
        err ? reject(err) : resolve(url);
      });
    });
    return url;
  } catch (err) {
    if (err) {
      throw err;
    }
  }
};

const getGenericSignedUrl = async (filename) => {
  const amazonIndex = filename.indexOf('amazonaws.com');
  let trimmedUrl = '';
  if (amazonIndex !== -1) {
    trimmedUrl = filename.slice(amazonIndex + 'amazonaws.com/'.length);
  }
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'ap-south-1',
  });

  const params = {
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
    Key: trimmedUrl,
    Expires: Number(process.env.DOCUMENT_EXPIRATION_TIME),
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (err) {
    throw err;
  }
};

const getSignedUrlForCoLending = async (filename) => {
  const s3Config=s3Configuration(filename, process.env.AWS_CO_LENDING_LOAN_TEMPLATE_BUCKET, process.env.AWS_CO_LENDING_ACCESS_KEY, process.env.AWS_CO_LENDING_SECRET_ACCESS_KEY, process.env.AWS_CO_LENDING_REGION, 5*60);

  try {
    const url = await s3Config.s3.getSignedUrlPromise('getObject', s3Config.params);
    return url;
  } catch (err) {
    throw err;
  }
};

const uploadLogsToS3 = (item, key) => {
  const obj = {
    ...item,
  };
  obj.objRef = obj;

  const jsonString = JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (key === 'objRef') {
        return '[Circular]';
      }
    }
    return value;
  });

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

const uploadBase64ToS3 = (item, key) => {
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

const putFileIntoS3 = (key, buffer, contentType) => {
  let params = {
    Bucket: process.env.AWS_NACH_TEMPLATE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };
  return nachs3bucket.upload(params).promise();
};

const getSignedUrlForNach = async (s3Url, filename) => {
  const amazonIndex = s3Url.indexOf('amazonaws.com');
  let trimmedUrl = '';
  if (amazonIndex !== -1) {
    trimmedUrl = s3Url.slice(amazonIndex + 'amazonaws.com/'.length);
  }
  let params = {
    Bucket: process.env.AWS_NACH_TEMPLATE_BUCKET,
    Key: trimmedUrl,
    Expires: 5*60,
    ResponseContentDisposition: `attachment; filename=${filename}`
  };
  try {
    const url = await nachs3bucket.getSignedUrlPromise('getObject', params);
    return url;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  s3Configuration,
  uploadPdfFileToS3,
  getSignedUrl,
  uploadBase64ToS3,
  uploadLogsToS3,
  getGenericSignedUrl,
  getSignedUrlForCoLending,
  putFileIntoS3,
  getSignedUrlForNach,
};

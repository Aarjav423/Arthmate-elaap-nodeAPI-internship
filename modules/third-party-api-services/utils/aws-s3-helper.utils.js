'use strict';
const AWS = require('aws-sdk');
const { s3Configuration, uploadLogsToS3 } = require("../../../routes/third-party-apis/utils/aws-s3-helper");
const s3bucket = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'ap-south-1',
    Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
});

const updateReqResLogFile = async (data, key) => {
    try {
        const s3Url = key;
        const regexUrl = /com\/([^\.]+)\//;
        const output = s3Url.match(regexUrl);
        const urlIndex = output[1];
        const newKey = s3Url.substring(s3Url.indexOf(urlIndex));
        const logData = String(JSON.stringify(data));

        // update request data on S3
        return await uploadLogsToS3(logData, newKey);
    } catch (error) {
        throw error;
    }
};


const uploadExcelToS3 = async (item, key) => {
    const excelData = { ...item }
    var params = {
        Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
        Key: key,
        Body: excelData.data
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
}

const uploadreqresLog = (item, key) => {
    const obj = {
        ...item,
    };
    obj.objRef = obj;
    const jsonString = stringifyCircularSafe(item);
    var params = {
        Bucket: process.env.AWS_LOAN_TEMPLATE_BUCKET,
        Key: key,
        Body: jsonString,
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

function stringifyCircularSafe(item) {
    const seen = new WeakSet();

    return JSON.stringify(item, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    });
}

const getSignedUrl = async (s3Url, expiryTime) => {
    const s3Config = s3Configuration(s3Url, process.env.AWS_LOAN_TEMPLATE_BUCKET, process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY, 'ap-south-1', expiryTime);

    try {
        const url = await s3Config.s3.getSignedUrlPromise('getObject', s3Config.params);
        return url;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    uploadreqresLog,
    uploadExcelToS3,
    getSignedUrl,
    updateReqResLogFile,
}
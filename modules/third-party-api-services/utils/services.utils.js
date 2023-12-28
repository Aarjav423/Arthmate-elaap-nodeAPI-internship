const fs = require('fs');
const s3helper = require("../../../util/s3helper")

async function fetchDataFromS3(resultUrl) {
    const s3_url = resultUrl;
    const regexUrl = /com\/([^\.]+)\//;
    const output = s3_url.match(regexUrl);
    const urlIndex = output[1];
    const key = s3_url.substring(s3_url.indexOf(urlIndex));
    const resultJson = await s3helper.fetchJsonFromS3(key);
    return resultJson;
}

async function createAndStorePDF(base64Data, outputFilePath) {
    const pdfData = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(outputFilePath, pdfData);
}

module.exports = {
    fetchDataFromS3,
    createAndStorePDF,
}
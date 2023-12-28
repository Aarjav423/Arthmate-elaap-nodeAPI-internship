const axios = require('axios')
const { uploadreqresLog, uploadExcelToS3, getSignedUrl, fetchDataFromS3 } = require('../utils')
const webhookData = require('../models/webhook-schema.model.js');

async function downloadAndLogJson(url) {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'ClientID': process.env.SCOREME_CLIENT_ID,
            'ClientSecret': process.env.SCOREME_CLIENT_SECRET
        }
    };
    const apiResp = await axios.request(config);
    return apiResp;
}

async function downloadAndLogExcel(url) {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'ClientID': process.env.SCOREME_CLIENT_ID,
            'ClientSecret': process.env.SCOREME_CLIENT_SECRET
        },
        responseType: 'stream'
    };
    const apiResp = await axios.request(config);
    return apiResp;
}

async function scoreMeDocDownloader(data, fileKey) {
    try {
        const fileNameKey = fileKey;
        const jsonApiResp = await downloadAndLogJson(data.json_url);
        const excelApiResp = await downloadAndLogExcel(data.excel_url);
        const jsonReqKey = `${fileNameKey}.json`;
        const xlsReqKey = `${fileNameKey}.xlsx`;

        //upload request data on s3
        const jsonNewS3URL = await uploadreqresLog(jsonApiResp.data, jsonReqKey);
        const excelNewS3URL = await uploadExcelToS3(excelApiResp, xlsReqKey);

        const finalDataToS3 = {
            json_url: jsonNewS3URL.Location,
            excel_url: excelNewS3URL.Location
        }
        const finalKeyValue = `${fileNameKey}.txt`;
        const finalDataUpload = await uploadreqresLog(finalDataToS3, finalKeyValue);
        
        const serviceReq = await webhookData.findBySRI(data.ref_id);
        if (!serviceReq) throw {
            message: 'SCOREME BSA report not found for entered request id',
            errorType: 999,
        };

        return await webhookData.updateWebhookDocDownload(data.ref_id, finalDataUpload.Location)
    } catch (error) {
        console.log("Error in SCOREME Downloader:",error)
    }
}

async function handleDocumentDownloaded(result) {
    try {
        const expiryTime = Number(process.env.SCOREME_DOCUMENTS_EXPIRATION_TIME);
        const resultUrl = result.downloaded_data;
        const outputData = await fetchDataFromS3(resultUrl);
        const json_url = outputData.json_url;
        const excel_url = outputData.excel_url;
        const signedJsonUrl = await getSignedUrl(json_url, expiryTime);
        const signedExcelUrl = await getSignedUrl(excel_url, expiryTime);
        const finalOutput = {
            signed_json_url: signedJsonUrl,
            signed_excel_url: signedExcelUrl,
        };
        return finalOutput;
    } catch (error) {
        console.log("Error in SCOREME Doc Download:",error)
    }
}

module.exports = {
    scoreMeDocDownloader,
    handleDocumentDownloaded,
}
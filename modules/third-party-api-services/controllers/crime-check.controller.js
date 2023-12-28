const { reqresLog, s3Logging, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const axios = require('axios');
const QueryString = require('qs');
const webhookModel = require('../models/webhook-schema.model.js');
const httpStatus = require('http-status');
const serviceReqResLog = require("../../../models/service-req-res-log-schema.js")
const { getSignedUrl, updateReqResLogFile } = require('../utils')
const { putFileIntoS3, fetchJsonFromS3 } = require('../../../util/s3helper')

async function crimeCheckAddReport(req, res) {
    const apiName = 'CRIME-CHECK-ADD-REPORT';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: process.env.CRIME_CHECK_VENDOR,
        api_name: apiName,
        service_id: process.env.SERVICE_CRIME_CHECK_REGISTRATION_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    req.logData = {
        ...serviceDetails,
    };

    try {
        await templateValidation.validateTemplateData(
            req.service.file_s3_path,
            req.body,
        );

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        const postData = {
            companyName: req.body.company_name,
            companyType: req.body.company_type,
            cinNumber: req.body.cin_number,
            callbackUrl: process.env.CRIME_CHECK_CALLBACK_URL,
            reportMode: "realTimeHighAccuracy",
        }
        const apiUrl = process.env.CRIME_CHECK_URL;

        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${process.env.CRIME_CHECK_AUTH_KEY}`,
            }
        };

        const logDataToS3 = {
            user_data: req.body,
            data_for_crime_check: postData
        }

        const reqResLogRec = await serviceReqResLog.findByIdAndAPIName(requestId, apiName);
        const logUrl = reqResLogRec.raw_data;
        
        // Update the logData with new Data
        await updateReqResLogFile(logDataToS3, logUrl)

        const apiResp = await axios.post(apiUrl, QueryString.stringify(postData), config);

        await reqresLog(apiResp.data, req, 'response');

        const insertResult = await webhookModel.create({
            request_id: requestId,
            service_request_id: apiResp.data.requestId,
            is_webhook_received: false,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            company_id: req.company._id,
            company_code : req.company.code,
        });
        
        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: apiResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

async function crimeCheckAddReportCallback(req, res) {
    let requestId;
    const apiName = 'CRIME-CHECK-ADD-REPORT-WEBHOOK';
    const apiReq = req;
    const serviceDetails = {
        vendor_name: process.env.CRIME_CHECK_VENDOR,
        api_name: apiName,
        request_type: 'response',
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    apiReq.logData = {
        ...serviceDetails,
    };

    try {
        if (req.headers.authorization !== process.env.CRIME_CHECK_WEBHOOK_TOKEN) {
            throw {
                message: 'Invalid Token',
                errorType: 999,
            };
        }

        const reqData = JSON.parse(req.body.data);

        const request_id = reqData.requestId;
        if(!request_id) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Please enter request id',
            });
        }
        const serviceReq = await webhookModel.findBySRI(request_id);
        
        if(!serviceReq) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Crime check report not found for entered request id',
            });
        }

        apiReq.company = {
            _id: serviceReq.company_id,
            code: serviceReq.company_code,
        }
        requestId = `${apiReq.company.code}-${apiName}-${Date.now()}`;
        serviceDetails.request_id = requestId;
        serviceDetails.id_number = serviceReq.service_request_id;

        apiReq.logData = {
            ...serviceDetails,
        };

        const responseFromS3 = await s3Logging(reqData, apiReq, 'request');


        if (responseFromS3) {
            await webhookModel.updateWebhookJson(request_id, responseFromS3.Location);
        }

        res.status(200).send({
            request_id: requestId,
            success: true,
            message: "Webhook response received successfully"
        });

        const downloaderData = {
            request_id: request_id,
        }
        crimeCheckReportDownloader(apiReq, downloaderData);

    } catch (error) {
        if(requestId) {
            error.request_id = requestId;
        }
        await errorLog(error, apiReq, res);
    }
}

async function getCrimeCheckReport (req, res) {
    const request_id = req.params.requestId;
    const apiName = 'GET-CRIME-CHECK-REPORT';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const apiReq = req;

    const serviceDetails = {
        vendor_name: process.env.CRIME_CHECK_VENDOR,
        api_name: apiName,
        service_id: process.env.SERVICE_DOWNLOAD_CRIME_REPORT_REGISTRATION_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    req.logData = {
        ...serviceDetails,
    };

    try {
        if(!request_id) {
            throw {
                message: "Please enter request id",
                errorType: 999,
            }
        }
        await reqresLog(request_id, req, 'request');

        const result = await webhookModel.findByRI(request_id);
        if (!result) {
            throw {
                message: "No data found for entered request id",
                errorType: 999,
            }
        }

        if (result.status == 'COMPLETED') {
            const downloaderData = {
                request_id: result.service_request_id,
            }
            const downloaderResponse = await crimeCheckReportDownloader(apiReq, downloaderData);

            if (!downloaderResponse) {
                await webhookModel.updateDocDownloadFailed(result.service_request_id);
            }
        }
        
        const latestResult = await webhookModel.findByRI(request_id);
        
        if (latestResult.status == 'PENDING') {
            return res.status(200).send({
                request_id: requestId,
                status: 'pending',
                success: false,
                message: 'Status is still pending',
            });
        }
        else if (latestResult.status == 'DOWNLOAD-FAILED') {
            return res.status(200).send({
                request_id: requestId,
                status: 'completed',
                success: false,
                message: 'Download failed',
            });
        }
        else {
            const s3Url = latestResult.downloaded_data;
            const amazonIndex = s3Url.indexOf('amazonaws.com');
            const trimmedUrl = s3Url.slice(amazonIndex + 'amazonaws.com/'.length);
            
            const finalRes = await fetchJsonFromS3(trimmedUrl);

            if(finalRes?.downloadLink) {
                const expiryTime = Number(process.env.CRIME_CHECK_PDF_EXPIRATION_TIME);
                const signedUrl = await getSignedUrl(finalRes.downloadLink, expiryTime);
                finalRes.downloadLink = signedUrl;
            }

            return res.status(200).send({
                request_id: requestId,
                status: "completed",
                success: true,
                message: 'Data fetched successfully',
                data: finalRes,
            });
        }
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

const crimeCheckReportDownloader = async (req, data) => {
    const apiName = 'CRIME-CHECK-REPORT-DOWNLOADER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: process.env.CRIME_CHECK_VENDOR,
        api_name: apiName,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    
    req.logData = {
        ...serviceDetails,
    };

    try {
        const request_id = data.request_id;
        const apiKey = process.env.DOWNLOAD_CRIME_REPORT_API_KEY;
        const apiUrl = `${process.env.DOWNLOAD_CRIME_REPORT_URL}/${request_id}/${apiKey}`;

        await reqresLog(data, req, 'request');

        const crimeReportResp = await axios.get(apiUrl);

        await reqresLog(crimeReportResp.data, req, 'response');

        if(crimeReportResp?.data?.downloadLink) {
            const response = await axios.get(crimeReportResp.data.downloadLink, { responseType: 'arraybuffer' });
            const pdfData =response.data;
            
            let pdfFilename = Math.floor(10000 + Math.random() * 99999) + '_req';
            const pdfKey = `${req.logData.api_name}/${req.logData.vendor_name}/${req.company._id}/${data.request_id}/${pdfFilename}/${Date.now()}.pdf`;
            
            const pdfResponse = await putFileIntoS3(pdfKey, pdfData, 'application/pdf');
            crimeReportResp.data.downloadLink = pdfResponse.Location;
        }

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const key = `${req.logData.api_name}/${req.logData.vendor_name}/${req.company._id}/${data.request_id}/${filename}/${Date.now()}.json`;
        const s3Data = JSON.stringify(crimeReportResp.data);

        const response = await putFileIntoS3(key, s3Data, 'application/json');

        if(response) {
          await webhookModel.updateWebhookDocDownload(data.request_id, response.Location);
        }
        return true;
    } catch (error) {
        error.request_id = requestId;
        req.logData.api_status_code = 500;

        await reqresLog(error, req, 'error');
        return false;
    }
}

module.exports = {
    crimeCheckAddReport,
    crimeCheckAddReportCallback,
    getCrimeCheckReport,
};
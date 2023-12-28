const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { riskPostConfig, getSignedUrl } = require("../utils")
const axios = require('axios');
const webhookModel = require('../models/webhook-schema.model.js');
const serviceReqResLog = require("../../../models/service-req-res-log-schema.js")
const { putFileIntoS3 } = require('../../../util/s3helper')

async function pdfAnalyser(req, res) {
    const apiName = 'PDF-ANALYSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        service_id: process.env.SERVICE_PDF_ANALYSER_ID,
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

        const postData = {
            request_id: requestId,
            loan_app_id: req.body.loan_app_id,
            pan: req.body.pan,
            doc_code: req.body.doc_code,
            signed_url: req.body.signed_url
        }

        const pdfAnalyserUrl = process.env.RISK_URL + process.env.PDF_ANALYSER_URL;
        const config = riskPostConfig(pdfAnalyserUrl, process.env.RISK_PDF_GET_PDF_ANALYSER_AUTH_KEY, postData);

        await reqresLog(req.body, req, 'request');

        const pdfAnalyserResp = await axios.request(config);

        await reqresLog(pdfAnalyserResp.data, req, 'response');

        const webhookData = {
            request_id: requestId,
            service_request_id: requestId,
            is_webhook_received: false,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            doc_code: req.body.doc_code,
            company_id: req.company._id,
            company_code : req.company.code,
        }

        await webhookModel.addData(webhookData);

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: pdfAnalyserResp.data,
        })
    } catch (error) {
        error.request_id = requestId;
        if(error?.response?.config) {
            error.response.config.this_is_error = error?.response?.data;
        }
        await errorLog(error, req, res);
    }
}

async function pdfAnalyserWebhook(req, res) {
    let requestId;
    const apiName = 'PDF-ANALYSER-WEBHOOK';
    const apiReq = req;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        request_type: 'response',
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    apiReq.logData = {
        ...serviceDetails,
    };
    try {
        if (req.headers.authorization !== process.env.RISK_WEBHOOK_TOKEN) {
            throw {
                message: 'Invalid Token',
                errorType: 999,
            };
        }
        
        const request_id = req.body.request_id;
        if(!request_id) {
            throw {
                message: 'Please enter request id',
                errorType: 999,
            };
        }
        const serviceReq = await webhookModel.findBySRI(request_id);

        if(!serviceReq) {
            throw {
                message: 'Pdf analyser report not found for entered request id',
                errorType: 999,
            };
        }

        apiReq.company = {
            _id: serviceReq.company_id,
            code: serviceReq.company_code,
        }
        requestId = `${apiReq.company.code}-${apiName}-${Date.now()}`;
        serviceDetails.request_id = requestId;

        apiReq.logData = {
            ...serviceDetails,
        };

        await reqresLog(req.body, apiReq, 'request');

        const reqResLogData = await serviceReqResLog.findByIdAndAPIName(requestId, apiName);
        
        if (reqResLogData) {
            await webhookModel.updateWebhookJson(request_id, reqResLogData.raw_data);
        }

        res.status(200).send({
            request_id: requestId,
            success: true,
            message : "Webhook received successfully"
        });

        const downloaderData = {
            request_id: request_id,
            doc_type_code: serviceReq.doc_code,
        }
        pdfAnalyserJsonDownloader(apiReq, downloaderData);
    } catch (error) {
        if(requestId) {
            error.request_id = requestId;
        }
        await errorLog(error, apiReq, res);
    }
}

async function getPdfAnalyser(req, res) {
    const request_id = req.params.requestId;
    const apiName = 'GET-PDF-ANALYSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const apiReq = req;

    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        service_id: process.env.SERVICE_GET_PDF_ANALYSER_ID,
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
                doc_type_code: result.doc_code,
            }
            const downloaderResponse = await pdfAnalyserJsonDownloader(apiReq, downloaderData);

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
            const expiryTime = Number(process.env.GET_PDF_ANALYSER_EXPIRATION_TIME);
            const finalRes = await getSignedUrl(latestResult.downloaded_data, expiryTime);

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

const pdfAnalyserJsonDownloader = async (req, data) => {
    const apiName = 'PDF-ANALYSER-JSON-DOWNLOADER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    
    req.logData = {
        ...serviceDetails,
    };
  
    try {
        const postData = {
            request_id: data.request_id,
            doc_type_code: data.doc_type_code
        }
    
        await reqresLog(postData, req, 'request');

        const getPdfAnalyserUrl = process.env.RISK_URL + process.env.GET_PDF_ANALYSER_URL;
        const config = riskPostConfig(getPdfAnalyserUrl, process.env.RISK_PDF_GET_PDF_ANALYSER_AUTH_KEY, postData);
    
        const getPdfAnalyserResp = await axios.request(config);

        await reqresLog(getPdfAnalyserResp.data, req, 'response');

        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
        const key = `${req.logData.api_name}/${req.logData.vendor_name}/${req.company._id}/${data.request_id}/${filename}/${Date.now()}.json`;
        const s3Data = JSON.stringify(getPdfAnalyserResp.data);

        const response = await putFileIntoS3(key, s3Data, 'application/json');

        if(response) {
          await webhookModel.updateWebhookDocDownload(data.request_id, response.Location);
        }
        return true;
    } catch (error) {
        error.request_id = requestId;
        req.logData.api_status_code = 500;

        if(error?.response?.config) {
            error.response.config.this_is_error = error?.response?.data;
        }
        await reqresLog(error, req, 'error');
        return false;
    }
}

module.exports = {
    pdfAnalyser,
    pdfAnalyserWebhook,
    getPdfAnalyser,
};
const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { riskPostConfig } = require("../utils")
const axios = require('axios');

async function jsonAnalyser(req, res) {
    const apiName = 'JSON-ANALYSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        service_id: process.env.SERVICE_JSON_ANALYSER_ID,
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
            request_id: req.body.request_id,
            loan_app_id: req.body.loan_app_id,
            pan: req.body.pan,
            doc_type_code: req.body.doc_type_code,
            data: req.body.data
        }

        const jsonAnalyserUrl = process.env.RISK_URL + process.env.JSON_ANALYSER_URL;
        const config = riskPostConfig(jsonAnalyserUrl, process.env.RISK_JSON_ANALYSER_AUTH_KEY, postData);

        await reqresLog(req.body, req, 'request');

        const jsonAnalyserResp = await axios.request(config);

        await reqresLog(jsonAnalyserResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: jsonAnalyserResp.data,
        })
    } catch (error) {
        error.request_id = requestId;
        if (error?.response?.config) {
            error.response.config.this_is_error = error?.response?.data;
        }
        await errorLog(error, req, res);
    }
}

module.exports = {
    jsonAnalyser
};
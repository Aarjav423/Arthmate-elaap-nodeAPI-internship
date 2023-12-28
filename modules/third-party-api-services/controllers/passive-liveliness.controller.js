const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { karzaPostConfig } = require("../utils")
const axios = require('axios');

async function passiveLivelinessCheck(req, res) {
    const apiName = 'PASSIVE-LIVELINESS-CHECK';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'KARZA',
        api_name: apiName,
        service_id: process.env.SERVICE_PASSIVE_LIVELINESS_ID,
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

        const passiveLivelinessData = {
            fileBase64: req.body.file_b64
        }

        // PASSIVE LIVELINESS URL and headers
        const passiveLivelinessUrl = process.env.KARZA_URL+"v3/liveness-detection";

        const config = karzaPostConfig(passiveLivelinessUrl, process.env.KARZA_API_KEY, passiveLivelinessData);

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch Passive Liveliness data
        const passiveLivelinessResp = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(passiveLivelinessResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: passiveLivelinessResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    passiveLivelinessCheck
};
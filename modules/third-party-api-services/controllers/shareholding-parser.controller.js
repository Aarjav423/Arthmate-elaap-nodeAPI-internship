const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { pushpakPostConfig } = require("../utils")
const axios = require('axios');

async function shareholdingParserCheck(req, res) {
    const apiName = 'SHAREHOLDING-PARSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'PUSHPAK',
        api_name: apiName,
        service_id: process.env.SERVICE_SHAREHOLDING_PARSER_ID,
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

        const shareholdingData = {
            file_b64: req.body.file_b64
        }

        // URL and headers
        const shareholdingPushpakUrl = process.env.PUSHPAK_ARTHMATE_URL+"api/v1/shareholding-recognizer";

        const config = pushpakPostConfig(shareholdingPushpakUrl, `Basic ${process.env.PUSHPAK_AUTH_KEY_V2}`, shareholdingData);

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch data
        const shareholdingResp = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(shareholdingResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: shareholdingResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    shareholdingParserCheck
};
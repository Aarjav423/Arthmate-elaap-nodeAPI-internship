const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { pushpakPostConfig } = require("../utils")
const axios = require('axios');

async function gstParser(req, res) {

    const apiName = 'PSPK-GST-PARSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    const serviceDetails = {
        vendor_name: 'PUSHPAK',
        api_name: apiName,
        service_id: process.env.SERVICE_GST_PARSER_ID,
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

        const payload = {
            file_b64: req.body.file_b64
        }

        // GST-PARSER URL and headers
        const gstParserPushpakUrl = process.env.PUSHPAK_GST_PARSER_URL;

        const config = pushpakPostConfig(gstParserPushpakUrl, `Basic ${process.env.PUSHPAK_GST_PARSER_AUTH}`, payload);

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch data
        const response = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(response.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: response.data,
        });
    } catch (error) {
        switch (error.response?.status) {
            case 413:
              error.errorStatus = 413;
              error.message = 'File type not supported';
              break;
            case 422:
              error.errorStatus = 422;
              error.message = 'Validation failed';
              break;
          }
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    gstParser,
}
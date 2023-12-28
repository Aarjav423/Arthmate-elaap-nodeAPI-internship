const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators/index.js')
const axios = require('axios');
const { karzaPostConfig } = require("../utils")

async function mcaDetailsPull(req, res) {
    const apiName = 'KZ-MCA-DETAILS';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    const serviceDetails = {
        vendor_name: 'KARZA',
        api_name: apiName,
        service_id: process.env.SERVICE_KZ_MCA_DETAILS_ID,
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

        //Karza url
        const url = process.env.KZ_MCA_DETAILS_URL;

        const karzaData = {
            id: req.body.entity_id,
        }
        req.logData.id_number = req.body.entity_id;

        const config = karzaPostConfig(url, process.env.KSCAN_API_KEY, karzaData);

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch Company data        
        const response = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(response.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            result: response.data,
            success: 'true',
        });
    } catch (error) {
        error.request_id = req.request_id;
        await errorLog(error, req, res);
    }
}

module.exports = {
    mcaDetailsPull
}
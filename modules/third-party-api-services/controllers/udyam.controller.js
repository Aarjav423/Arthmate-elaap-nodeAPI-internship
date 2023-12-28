const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { karzaPostConfig } = require("../utils")
const axios = require('axios');

async function udyamRegistrationCheck(req, res) {
    const apiName = 'UDYAM-REGISTRATION-CHECK';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'KARZA',
        api_name: apiName,
        service_id: process.env.SERVICE_UDYAM_REGISTRATION_ID,
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

        const udhyamData = {
            udyamRegistrationNo: req.body.udyam_reg_no,
            isPDFRequired: "Y",
            getEnterpriseDetails: "Y",
            consent: req.body.consent
        }

        // UDYAM URL and headers
        const udhyamUrl = process.env.KARZA_URL+"v3/udyam/auth";

        const config = karzaPostConfig(udhyamUrl, process.env.KARZA_API_KEY, udhyamData);

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch udyam data
        const udyamResp = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(udyamResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: udyamResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    udyamRegistrationCheck
};
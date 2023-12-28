const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const axios = require('axios');

async function hitColenderSelectorApi(req, res) {
    const apiName = 'MSME-COLEND-SELECTOR';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        service_id: process.env.MSME_COLENDER_SELECTOR_SERVICE_ID,
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

        // form request body
        const payload = {
            loan_app_id: req.body.loan_app_id,
            pan: req.body.pan,
            company_id: parseInt(req.body.company_id),
            loan_amount: parseFloat(req.body.loan_amount),
            loan_tenure: parseFloat(req.body.loan_tenure),
            interest_rate: parseFloat(req.body.interest_rate),
            product_id: parseInt(req.body.product_id),
            product_type_code: req.body.product_type_code,
        }
        
        const config = {
            url: process.env.MSME_SELECTOR_API_URL,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [process.env.MSME_SELECTOR_API_KEY]: process.env.MSME_SELECTOR_API_KEY_VALUE,
            },
            data: JSON.parse(JSON.stringify(payload))
        }

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        const selectorApiResp = await axios.request(config);

        // Upload response to AWS S3
        await reqresLog(selectorApiResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: selectorApiResp.data
        })
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    hitColenderSelectorApi,
};
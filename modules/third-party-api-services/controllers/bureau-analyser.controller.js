const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const { riskPostConfig } = require("../utils")
const axios = require('axios');

async function bureauAnalyser(req, res) {
    const apiName = 'BUREAU-ANALYSER';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'ARTHMATE',
        api_name: apiName,
        service_id: process.env.SERVICE_BUREAU_ANALYSER_ID,
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
      
        const bureauType = req.body.bureau_type.toLowerCase();

        if (!process.env.BUREAU_TYPE_CODE.includes(bureauType))
          throw {
            message: 'bureau_type is not valid',
            errorType: 999,
          };

        const postData = {
            request_id: requestId,
            loan_app_id: req.body.loan_app_id,
            pan: req.body.pan,
            bureau_type: bureauType,
            data: req.body.data
        }

        const bureauAnalyserUrl = process.env.RISK_URL + process.env.BUREAU_ANALYSER_URL;
        const config = riskPostConfig(bureauAnalyserUrl, process.env.RISK_BUREAU_AUTH_KEY, postData);

        await reqresLog(req.body, req, 'request');

        const bureauAnalyserResp = await axios.request(config);

        await reqresLog(bureauAnalyserResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            data: bureauAnalyserResp.data,
        })
    } catch (error) {
        error.request_id = requestId;
        if(error?.response?.config) {
            error.response.config.this_is_error = error?.response?.data;
        }
        await errorLog(error, req, res);
    }
}

module.exports = {
  bureauAnalyser,
};
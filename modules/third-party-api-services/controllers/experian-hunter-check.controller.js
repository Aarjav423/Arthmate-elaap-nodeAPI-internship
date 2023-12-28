const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const webhookModel = require('../models/webhook-schema.model.js');
const axios = require('axios');

const vendorName = "EXPERIAN"

async function experianHunterCheck(req, res) {
    const apiName = 'HUNTER-CHECK';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_EXPERIAN_HUNTER_CHECK_ID,
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
        req.logData.id_number = req.body.udyam_reg_no;

        const apiUrl = process.env.HUNTER_CHECK_URL;

        const hunterPostData = {
            "request_id": requestId,
            "company_name": req.body.business_name,
            "company_type": req.body.company_type,
            "company_registration_number": req.body.udyam_reg_no,
            "building_name": req.body.com_addr_ln1,
            "street": req.body.com_addr_ln2,
            "street2": req.body.com_addr_ln2,
            "company_city": req.body.com_city,
            "company_state": req.body.com_state,
            "company_pincode": req.body.com_pincode,
            "applicants": req.body.applicants
        }

        const logDataToS3 = {
            user_data: req.body,
            data_for_hunter: hunterPostData
        }

        // Upload request to AWS S3
        await reqresLog(logDataToS3, req, 'request');

        const apiResp = await axios.request({
            url: apiUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: hunterPostData
        });

        // Upload response to AWS S3
        await reqresLog(apiResp.data, req, 'response');
        const webhookData = {
            request_id: requestId,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            company_id: req.company._id,
            company_code : req.company.code,
        }
        await webhookModel.addData(webhookData);

        return res.status(200).send({
            request_id: requestId,
            success: true,
            result: apiResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        if (error?.response?.status === 400) {
            error.errorStatus = 400;
            error.message = error.response.data.errors
        }
        await errorLog(error, req, res);
    }
}

async function experianHunterCheckAction(req, res) {
    const apiName = 'HUNTER-CHECK-ACTION';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_EXPERIAN_HUNTER_CHECK_ACTION_ID,
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
        const data = req.body;
        const logCheck = await webhookModel.findByLoanandReqId(data.request_id, data.loan_app_id);
        if (!logCheck) {
            throw {
                errorType: 999,
                message: "No record found for this request id and loan app id combination"
            }
        }

        const apiUrl = process.env.HUNTER_CHECK_ACTION_URL;

        const hunterActionPostData = {
            "request_id": data.request_id,
            "status": data.status,
            "reject_reason": data.reject_reason
        }

        const logDataToS3 = {
            user_data: data,
            data_for_hunter_action: hunterActionPostData
        }

        // Upload request to AWS S3
        await reqresLog(logDataToS3, req, 'request');

        const apiResp = await axios.request({
            url: apiUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: hunterActionPostData
        });

        // Upload response to AWS S3
        await reqresLog(apiResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            result: apiResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        if (error?.response?.status === 400) {
            error.errorStatus = 400;
            error.message = error.response.data.errors
        }
        await errorLog(error, req, res);
    }
}

module.exports = {
    experianHunterCheck,
    experianHunterCheckAction
};
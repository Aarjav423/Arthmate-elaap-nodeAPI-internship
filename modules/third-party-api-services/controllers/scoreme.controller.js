const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const axios = require('axios');
const webhookData = require('../models/webhook-schema.model.js');
const serviceReqResLog = require("../../../models/service-req-res-log-schema.js");
const { fetchDataFromS3, createAndStorePDF, updateReqResLogFile } = require('../utils');
const { scoreMeDocDownloader, handleDocumentDownloaded } = require('../services');
const scoreme_account_type = ["savings", "current"]
const scoreme_entity_type = ["company", "partnership", "sole_proprietorship", "individual", "trust"]

const vendorName = "SCOREME"

async function scoreMeBsa(req, res) {
    const apiName = 'SCOREME-BSA';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_SCOREME_BSA_ID,
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
        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        const apiUrl = process.env.SCOREME_BASE_URL + 'bsa/external/uploadbankstatement';
        const form = new FormData();
        const results = [];

        const tempFolderPath = process.env.SCOREME_TEMP_FOLDER_PATH;

        const files = req.body.files_S3_urls;
        if (files.length > process.env.SCOREME_S3_FILES_LENGTH) {
            throw {
                errorType: 999,
                message: `files_S3_urls length should be less than equal to ${process.env.SCOREME_S3_FILES_LENGTH}`
            }
        }
        const filePassword = req.body.files_password;
        const filePasswordMap = {};

        for (let i = 0; i < files.length; i++) {
            const url = files[i];
            const base64Data = await fetchDataFromS3(url);
            let accountNumber = req.body.account_number || '';
            const finalfileName = accountNumber !== '' ? `${accountNumber}_` : '';
            const fileName = `${finalfileName}bank_statement_${i + 1}.pdf`;
            const outputFilePath = path.join(tempFolderPath, fileName);
            await createAndStorePDF(base64Data, outputFilePath);
            results.push(outputFilePath);

            if (filePassword) {
                filePasswordMap[fileName] = filePassword;
            }
        }

        // Loop to append files to the form
        for (let i = 0; i < results.length; i++) {
            const outputFilePath = results[i];

            // Append the file to the form with the original file name
            form.append('file', fs.createReadStream(outputFilePath), {
                filename: path.basename(outputFilePath),
            });
        }

        const monthly_drawing_power_limit = [{
            "month": "",
            "year": "",
            "amount": ""
        }];

        const form_data = {
            entityName: req.body.entity_name,
            pan: req.body.pan || "",
            entityType: req.body.entity_type.toLowerCase(),
            bankCode: req.body.bank_code,
            accountType: req.body.account_type.toLowerCase(),
            accountNumber: req.body.account_number,
            sanctionLimit: "500000",
            monthlyDrawingPowerLimit: monthly_drawing_power_limit,
            relatedPartyKeywords: req.body.related_party_keywords || "",
            filePassword: filePasswordMap,
            userapplicationid: process.env.SCOREME_USERAPPLICATION_ID,
            userName: process.env.SCOREME_USERNAME,
        };

        if (!scoreme_account_type.includes(form_data.accountType)) {
            throw {
                errorType: 999,
                message: `account_type should be from ${scoreme_account_type}`
            }
        }
        if (!scoreme_entity_type.includes(form_data.entityType)) {
            throw {
                errorType: 999,
                message: `entity_type should be from ${scoreme_entity_type}`
            }
        }
        if (form_data.entityType !== "individual" && form_data.accountType === "savings") {
            throw {
                errorType: 999,
                message: `Invalid combination of Account type and entity type`
            }
        }

        const logDataToS3 = {
            user_data: req.body,
            form_data_for_scoreme: form_data
        }
        form.append('data', JSON.stringify(form_data));

        const reqResLogRec = await serviceReqResLog.findByIdAndAPIName(requestId, apiName);
        const logUrl = reqResLogRec.raw_data;
        // Update the logData with new Data
        await updateReqResLogFile(logDataToS3, logUrl)

        const customHeaders = {
            clientId: process.env.SCOREME_CLIENT_ID,
            clientSecret: process.env.SCOREME_CLIENT_SECRET,
            ...form.getHeaders(),
        };

        // Send the multipart/form-data request to ScoreMe
        const apiResp = await axios.post(apiUrl, form, {
            headers: customHeaders
        })

        // Start Deleting the file from Folder
        for (let i = 0; i < results.length; i++) {
            const outputFilePath = results[i];
            fs.unlinkSync(outputFilePath);
        }

        // Upload response to AWS S3
        await reqresLog(apiResp.data, req, 'response');

        // Insert entry in WebHook collection
        const insertResult = await webhookData.create({
            request_id: requestId,
            service_request_id: apiResp.data.data.referenceId,
            is_webhook_received: false,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            company_id: req.company._id,
            company_code: req.company.code,
        });

        return res.status(200).send({
            request_id: requestId,
            success: true,
            result: apiResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        if (error?.response?.status === 406) {
            error.errorStatus = 500;
            error.message = 'Please contact the administrator'
            error.response.config.errorData = error.response.data
        }
        await errorLog(error, req, res);
    }
}

async function scoreMeBsaV2(req, res) {
    const apiName = 'SCOREME-BSA-V2';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_SCOREME_BSA_V2_ID,
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
        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        const apiUrl = process.env.SCOREME_BASE_V2_URL;
        const form = new FormData();
        const results = [];

        const tempFolderPath = process.env.SCOREME_TEMP_FOLDER_PATH;

        const files = req.body.files_S3_urls;
        if (files.length > process.env.SCOREME_S3_FILES_LENGTH) {
            throw {
                errorType: 999,
                message: `files_S3_urls length should be less than equal to ${process.env.SCOREME_S3_FILES_LENGTH}`
            }
        }
        const filePassword = req.body.files_password;
        const filePasswordMap = {};
        const loanAppIdFileName = req.body.loan_app_id ? `${req.body.loan_app_id}_` : '';

        for (let i = 0; i < files.length; i++) {
            const url = files[i];
            const base64Data = await fetchDataFromS3(url);
            const fileName = `${loanAppIdFileName}bank_statement_${i + 1}.pdf`;
            const outputFilePath = path.join(tempFolderPath, fileName);
            await createAndStorePDF(base64Data, outputFilePath);
            results.push(outputFilePath);

            if (filePassword) {
                filePasswordMap[fileName] = filePassword;
            }
        }

        // Loop to append files to the form
        for (let i = 0; i < results.length; i++) {
            const outputFilePath = results[i];

            // Append the file to the form with the original file name
            form.append('file', fs.createReadStream(outputFilePath), {
                filename: path.basename(outputFilePath),
            });
        }

        const form_data = {
            filePassword: filePasswordMap,
        };

        const logDataToS3 = {
            user_data: req.body,
            form_data_for_scoreme: form_data,
        }
        form.append('data', JSON.stringify(form_data));

        const reqResLogRec = await serviceReqResLog.findByIdAndAPIName(requestId, apiName);
        const logUrl = reqResLogRec.raw_data;
        // Update the logData with new Data
        await updateReqResLogFile(logDataToS3, logUrl)

        const customHeaders = {
            clientId: process.env.SCOREME_CLIENT_ID,
            clientSecret: process.env.SCOREME_CLIENT_SECRET,
            ...form.getHeaders(),
        };

        // Send the multipart/form-data request to ScoreMe
        const apiResp = await axios.post(apiUrl, form, {
            headers: customHeaders
        })

        // Start Deleting the file from Folder
        for (let i = 0; i < results.length; i++) {
            const outputFilePath = results[i];
            fs.unlinkSync(outputFilePath);
        }

        // Upload response to AWS S3
        await reqresLog(apiResp.data, req, 'response');

        // if response code starts with "SRS" then it was success otherwise issue with file
        if ( ! apiResp.data?.responseCode?.startsWith("SRS")) {
            throw {
                errorType: 999,
                message: apiResp.data?.responseMessage || "Issue in the uploaded document",
            }
        }

        // Insert entry in WebHook collection
        const insertResult = await webhookData.create({
            request_id: requestId,
            service_request_id: apiResp.data.data.referenceId,
            is_webhook_received: false,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            company_id: req.company._id,
            company_code: req.company.code,
        });

        return res.status(200).send({
            request_id: requestId,
            success: true,
            result: apiResp.data,
        });
    } catch (error) {
        error.request_id = requestId;
        if (error?.response?.status === 406) {
            error.errorStatus = 500;
            error.message = 'Please contact the administrator'
            error.response.config.errorData = error.response.data
        }
        await errorLog(error, req, res);
    }
}

async function scoreMeBsaWebhook(req, res) {
    const apiName = 'SCOREME-BSA-WEBHOOK';
    const apiReq = req;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        request_type: 'response',
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    apiReq.logData = {
        ...serviceDetails,
    };
    const ref_id = req.body.data.referenceId;
    const hookData = {
        json_url: req.body.data.jsonUrl,
        excel_url: req.body.data.excelUrl,
        ref_id
    }

    try {
        if (!ref_id) throw {
            message: 'Please enter reference Id',
            errorType: 999,
        };
        const serviceReq = await webhookData.findBySRI(ref_id);

        if (!serviceReq) throw {
            message: 'SCOREME BSA report not found for entered request id',
            errorType: 999,
        };
        apiReq.company = {
            _id: serviceReq.company_id,
            code: serviceReq.company_code,
        }
        const requestId = `${apiReq.company.code}-${apiName}-${Date.now()}`;
        apiReq.logData.request_id = requestId;
        apiReq.logData.id_number = ref_id;

        // Upload request to AWS S3
        await reqresLog(req.body, apiReq, 'request');

        const reqResLogRec = await serviceReqResLog.findByIdAndAPIName(requestId, apiName);

        const responseData = {
            request_id: requestId,
            success: true,
            message: "Webhook response received successfully"
        }
        if (req.body.responseCode === 'SRC001') {
            if (reqResLogRec) {
                await webhookData.updateWebhookJson(ref_id, reqResLogRec.raw_data);
            }

            res.status(200).send(responseData);
            let filename = Math.floor(10000 + Math.random() * 99999) + '_req';
            const uploadFileKey = `${apiReq.logData.api_name}/${apiReq.logData.vendor_name}/${apiReq.company._id}/${ref_id}/${filename}/${Date.now()}`;
            scoreMeDocDownloader(hookData, uploadFileKey)
        } else {
            if (reqResLogRec) {
                await webhookData.updateWebhookResponseFailed(ref_id, reqResLogRec.raw_data);
            }
            return res.status(200).send(responseData);
        }
    } catch (error) {
        await errorLog(error, apiReq, res);
    }
}

async function scoreMeBsaReport(req, res) {
    const apiName = 'SCOREME-BSA-REPORT';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_SCOREME_BSA_REPORT_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    req.logData = {
        ...serviceDetails,
    };

    try {
        if (!req.params.request_id) {
            throw {
                errorType: 999,
                message: 'Please enter request_id'
            };
        }
        const result = await webhookData.findByRI(req.params.request_id);
        if (!result) {
            throw {
                errorType: 999,
                message: "No data found for entered request id"
            };
        }

        let finalRes;
        // checking the status and performing the required function
        if (result.status == 'DOCUMENT-DOWNLOADED') {
            finalRes = await handleDocumentDownloaded(result);
        }
        else if (result.status == 'COMPLETED') {
            const apiName = 'SCOREME-BSA-WEBHOOK';
            const resultData = await fetchDataFromS3(result.webhook_response);
            const ref_id = resultData.data.referenceId;
            const filename = Math.floor(10000 + Math.random() * 99999) + '_req';
            const uploadFileKey = `${apiName}/${vendorName}/${req.company._id}/${ref_id}/${filename}/${Date.now()}`;
            const hookData = {
                json_url: resultData.data.jsonUrl,
                excel_url: resultData.data.excelUrl,
                ref_id
            };

            await scoreMeDocDownloader(hookData, uploadFileKey);

            // Refresh result after document download
            const newResult = await webhookData.findByRI(req.params.request_id);

            finalRes = await handleDocumentDownloaded(newResult);
        }

        // reverting the proper response
        if (result.status == 'PENDING') {
            return res.status(200).send({
                request_id: requestId,
                status: "pending",
                success: false,
                message: 'Status is still pending!',
            });
        } else if (result.status == 'DOWNLOAD-FAILED') {
            return res.status(200).send({
                request_id: requestId,
                status: 'completed',
                success: false,
                message: 'Download failed',
            });
        } else {
            return res.status(200).send({
                request_id: requestId,
                status: "completed",
                success: true,
                data: finalRes,
                message: 'Reports fetched successfully!',
            });
        }
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

async function getScoreMeBsaReport(req, res) {
    const apiName = 'GET-SCOREME-BSA-REPORT';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: vendorName,
        api_name: apiName,
        service_id: process.env.SERVICE_GET_SCOREME_BSA_REPORT_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };
    req.logData = {
        ...serviceDetails,
    };

    try {
        if (!req.params.request_id) {
            throw {
                errorType: 999,
                message: 'Please enter request_id'
            };
        }
        const result = await webhookData.findByRI(req.params.request_id);
        if (!result) {
            throw {
                errorType: 999,
                message: "No data found for entered request id"
            };
        }

        //SCOREME reference ID
        const referenceId = result.service_request_id;

        //SCOREME GET URL
        const getScoreMeBSAUrl = process.env.SCOREME_GET_URL + referenceId;

        const customHeaders = {
            headers: {
                clientId: process.env.SCOREME_CLIENT_ID,
                clientSecret: process.env.SCOREME_CLIENT_SECRET,
            }
        };

        // Upload response to AWS S3
        await reqresLog(getScoreMeBSAUrl, req, 'request');

        const apiResp = await axios.get(getScoreMeBSAUrl, customHeaders)

        // Upload response to AWS S3
        await reqresLog(apiResp.data, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            success: true,
            result: apiResp.data,
        });

    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    scoreMeBsa,
    scoreMeBsaWebhook,
    scoreMeBsaReport,
    getScoreMeBsaReport,
    scoreMeBsaV2,
};
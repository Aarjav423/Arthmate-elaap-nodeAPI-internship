const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators/index.js')
const axios = require('axios');
const webhookModel = require('../models/webhook-schema.model.js');
const { putFileIntoS3, fetchJsonFromS3 } = require('../../../util/s3helper');
const { getSignedUrl } = require('../utils')

/**
 * Creates an E-Sign request by calling the Leegality API.
 * Validates the template data and sends the request to Leegality for e-signature processing.
 * Logs the request and response data to AWS S3.
 * Adds data to webhook_details with a status of PENDING.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} - Returns a response indicating the result of the E-Sign request creation.
 */
async function createESignRequest(req, res) {
    // Generate a unique requestId for logging purposes
    const apiName = 'LEEGALITY-E-SIGN-REQUEST';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    // Details for logging
    const serviceDetails = {
        vendor_name: 'LEEGALITY',
        api_name: apiName,
        service_id: process.env.SERVICE_ESIGN_CREATE_REQUEST_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    // Log the service details
    req.logData = {
        ...serviceDetails,
    };

    try {
        // Validate template data using the provided file path and request body
        await templateValidation.validateTemplateData(
            req.service.file_s3_path,
            req.body,
        );

        // Prepare the payload for the Leegality API request
        const payload = {
            profileId: req.body.template_id,
            file: {
                fields: req.body.fields
            },
            invitees: req.body.invitees
        }

        // Configure the Leegality API request
        const config = {
            url: process.env.LEGALITY_CREATE_ESIGN_URL,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [process.env.LEGALITY_API_AUTH_KEY]: process.env.LEGALITY_API_AUTH_VALUE,
            },
            data: JSON.parse(JSON.stringify(payload))
        }

        // Upload the request data to AWS S3
        await reqresLog(req.body, req, 'request');

        // Hit the Leegality API to create an e-sign request     
        const response = await axios.request(config);

        // Upload the response data to AWS S3
        await reqresLog(response.data, req, 'response');

        // Add data to webhook_details with a status of PENDING
        const insertResult = await webhookModel.create({
            request_id: requestId,
            service_request_id: response.data.data.documentId,
            is_webhook_received: false,
            loan_app_id: req.body.loan_app_id,
            api_name: apiName,
            company_id: req.company._id,
            company_code: req.company.code,
        });

        // Send the response to the client
        return res.status(200).send({
            request_id: requestId,
            result: response.data,
            success: true,
        });
    } catch (error) {
        // Handle errors and log the details
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

/**
 * Retrieves the E-Sign request status by checking the webhook_details record.
 * If the record is in a PENDING state, the Leegality GET API is called to
 * verify if all signers have completed the signing process.
 * If all signers have completed the signing, the file is uploaded to the S3 bucket.
 * The S3 URL is saved in webhook_details, and the status is marked as 'DOCUMENT-DOWNLOADED'.
 * If not all signers have completed the signing, the status is returned as PENDING.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} - Returns a response indicating the E-Sign request status.
 */
async function getESignRequestStatus(req, res) {
    // Extract the requestId from the route parameters
    const paramsRequestId = req.params.requestId;
    const apiName= "E-SIGN-REQUEST-STATUS"
    let requestId;
    try {
        // Validate if request id is provided
        if (!paramsRequestId) {
            throw {
                message: "Please enter request id",
                errorType: 999,
            }
        }

        // Retrieve webhook details for the provided request id
        const webhookDetails = await webhookModel.findByRI(paramsRequestId);

        // If no data found for the entered request id, throw an error
        if (!webhookDetails) {
            throw {
                message: "No data found for entered request id",
                errorType: 999,
            }
        }
        req.company = {
            _id: webhookDetails.company_id,
            code: webhookDetails.company_code,
        }
        requestId = `${req.company.code}-${apiName}-${Date.now()}`;

        // If the status is 'DOCUMENT-DOWNLOADED', return the document URL
        if (webhookDetails.status == 'DOCUMENT-DOWNLOADED') {
            const signeds3Url = await getSignedS3Url( webhookDetails.downloaded_data);
            return res.status(200).send({
                request_id: requestId,
                status: "completed",
                success: true,
                message: 'Data fetched successfully',
                data: {
                    document_url: signeds3Url,
                },
            });
        }

        // If the status is 'PENDING', proceed to check Leegality status
        if (webhookDetails.status == 'PENDING') {
            // Set the request body for Leegality status API call
            req.body = {
                document_id: webhookDetails.service_request_id,
            }

            // Call Leegality status API
            const statusApiResponse = await callLeegalityStatusApi(req);
           
            // Download the file if all signers have signeds
            downloadedData = await downloadFileIfAllSigned(statusApiResponse.result, req, requestId);
            
            // Update the S3 URL of the fully signed file in service logs (only if the file is signed)
            if (downloadedData != null && downloadedData) {
                
                webhookDetails.downloaded_data = downloadedData;
                webhookDetails.status = 'DOCUMENT-DOWNLOADED';
                webhookDetails.is_webhook_received = true;
            }

            // Update webhook details in the database
            await webhookModel.updateWebhook(webhookDetails);

            // Retrieve the latest result after the update
            const latestResult = await webhookModel.findByRI(paramsRequestId);
           
            // If the status is 'DOCUMENT-DOWNLOADED', return the document URL
            if (latestResult.status == 'DOCUMENT-DOWNLOADED') {
                const signeds3Url = await getSignedS3Url( webhookDetails.downloaded_data);
                return res.status(200).send({
                    request_id: requestId,
                    status: "completed",
                    success: true,
                    message: 'Data fetched successfully',
                    data: {
                        document_url: signeds3Url,
                    }
                });
            }

            // If the status is 'PENDING', return the status as pending
            if (latestResult.status == 'PENDING') {
                return res.status(200).send({
                    request_id: requestId,
                    status: 'pending',
                    success: false,
                    message: 'Status is still pending',
                });
            }
        }
    } catch (error) {
        return res.status(500).send({
            request_id: requestId,
            message: 'Please contact the administrator',
            success: false
        });
    }
}

/**
* Calls the Leegality API to retrieve the status of an E-Sign request.
*
* @param {Object} req - Express request object containing necessary information.
* @returns {Object} - Returns the response from the Leegality API indicating the status of the E-Sign request.
*/
async function callLeegalityStatusApi(req) {
    // Generate a unique requestId for logging purposes
    const apiName = 'LEEGALITY-E-SIGN-REQUEST-STATUS';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    // Details for logging
    const serviceDetails = {
        vendor_name: 'LEEGALITY',
        api_name: apiName,
        service_id: process.env.SERVICE_REQUEST_STATUS_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    // Log the service details
    req.logData = {
        ...serviceDetails,
    };

    // Configure the Leegality API request to get E-Sign request status
    const config = {
        url: process.env.LEGALITY_CREATE_ESIGN_URL,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            [process.env.LEGALITY_API_AUTH_KEY]: process.env.LEGALITY_API_AUTH_VALUE,
        },
        params: {
            documentId: req.body.document_id
        }
    }

    // Upload the request data to AWS S3
    await reqresLog(req.body, req, 'request');

    // Hit the Leegality API to get the E-Sign request status
    const response = await axios.request(config);

    // Upload the response data to AWS S3
    await reqresLog(response.data, req, 'response');

    // Return the response with requestId, result, and success status
    return {
        request_id: requestId,
        result: response.data,
        success: true,
    };
}

/**
 * Receives callback data from Leegality for E-Signature events.
 * Handles the callback data, updates the webhook details, and triggers additional processing.
 *
 * @param {Object} req - Express request object containing the received data.
 * @param {Object} res - Express response object.
 */
async function getCallbackData(req, res) {
    // Specify the API name for logging purposes
    const apiName = 'LEEGALITY-E-SIGN-CALLBACK';

    // Details for logging
    const serviceDetails = {
        vendor_name: 'LEEGALITY',
        api_name: apiName,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    // Log the service details
    req.logData = {
        ...serviceDetails,
    };

    let requestId;
    try {
        // Extract documentId from the request body
        const documentId = req.body.documentId;

        // Validate if documentId is provided
        if (!documentId) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'Please enter documentId',
            });
        }

        // Retrieve webhook details record using service request id
        const webhookDetails = await webhookModel.findBySRI(documentId);

        // If no record exists, the documentId is invalid
        if (!webhookDetails) {
            return res.status(httpStatus.BAD_REQUEST).send({
                success: false,
                message: 'No e-sign request found for documentId: ' + documentId,
            });
        }

        // Extract company details from webhookDetails and generate a unique requestId for logging
        req.company = {
            _id: webhookDetails.company_id,
            code: webhookDetails.company_code,
        };
        requestId = `${req.company.code}-${apiName}-${Date.now()}`;
        serviceDetails.request_id = requestId;

        // Log the updated service details
        req.logData = {
            ...serviceDetails,
        };

        // Check if webhook_audit is falsy and initialize it as an empty array
        webhookDetails.webhook_audit = webhookDetails.webhook_audit || [];

        // Add an object to the webhook_audit array with the received_at property
        const receivedAtObject = { received_at: new Date() };
        webhookDetails.webhook_audit.push(receivedAtObject);

        let downloadedData;
        try {
            // Set the request body for the Leegality status API call
            req.body = {
                document_id: documentId,
            };
            // Call Leegality status API
            const statusApiResponse = await callLeegalityStatusApi(req);

            // Download the file if all signers have signed
            downloadedData = await downloadFileIfAllSigned(statusApiResponse.result, req, requestId);
        }
        catch (error) {
            // Handle errors during Leegality status API call or file download
        }

        // Update the S3 URL of the fully signed file in service logs (only if the file is signed)
        if (downloadedData!=null && downloadedData) {
                webhookDetails.downloaded_data = downloadedData;
                webhookDetails.status = 'DOCUMENT-DOWNLOADED';
                webhookDetails.is_webhook_received = true;
        }

        // Update webhook details in the database
        await webhookModel.updateWebhook(webhookDetails);

        // Send a success response to the client
        return res.status(200).send({
            request_id: requestId,
            success: true,
            message: "Webhook response received successfully",
        });
    } catch (error) {
        // Handle errors and log the details
        if (requestId) {
            error.request_id = requestId;
        }
        await errorLog(error, req, res);
    }
}

/**
 * Downloads the file from the Leegality API response and uploads it to the S3 bucket
 * if all signers have signed.
 *
 * @param {Object} data - Leegality API response data.
 * @param {Object} req - Express request object.
 * @param {string} requestId - Unique identifier for the request.
 * @returns {string|null} - Returns the S3 URL of the uploaded file if successful, otherwise null.
 */
async function downloadFileIfAllSigned(data, req, requestId) {
    // Extract requests and files data from the Leegality API response
    const requests = data.data.requests;
    const files = data.data.files;

    // Check if all requests are signed
    const allSigned = requests.every(request => request.signed);

    if (allSigned) {
        // Get the value of the first element in the files array
        const fileValue = files[0];

        // Generate a random filename
        let filename = Math.floor(10000 + Math.random() * 99999) + '_req';

        // Construct the S3 key for the uploaded file
        const fileKey = `${req.logData.api_name}/${req.logData.vendor_name}/${req.company._id}/${requestId}/${filename}/${Date.now()}.txt`;

        // Upload the file to the S3 bucket
        const s3UploadResponse = await putFileIntoS3(fileKey, fileValue, 'text/plain');
        // Return the S3 URL of the uploaded file
        return s3UploadResponse.Location;
    } else {
        // If not all signers have signed, return null
        return null;
    }
}

async function getLeegaltityESignRequestStatus(req, res) {
    // Construct a new requestId for logging purposes
    const apiName = 'LEEGALITY-E-SIGN-REQUEST-STATUS';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    // Details for logging
    const serviceDetails = {
        vendor_name: 'LEEGALITY',
        api_name: apiName,
        service_id: process.env.SERVICE_REQUEST_STATUS_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    // Log the service details
    req.logData = {
        ...serviceDetails,
    };

    try {
        // Validate template data using the provided file path and request body
        await templateValidation.validateTemplateData(
            req.service.file_s3_path,
            req.body,
        );

        const response = await callLeegalityStatusApi(req);

        return res.status(200).send(response);
    } catch (error) {
        // Handle errors and log the details
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}


async function getSignedS3Url(s3Url) {
    try {
        const expiryTime = Number(process.env.LEEGALITY_SIGNED_DOC_EXPIRY_TIME);
        return await getSignedUrl(s3Url, expiryTime);
    } catch (error) {
        console.log(error)
    }
    return null;
}


module.exports = {
    createESignRequest,
    getESignRequestStatus,
    getCallbackData,
    getLeegaltityESignRequestStatus
}
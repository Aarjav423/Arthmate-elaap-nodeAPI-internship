const logServices = require("../../../routes/third-party-apis/service/service-logging")

const reqresLog = logServices.serviceLogging

const s3Logging = logServices.s3Logging

async function handleError(error, req, res) {
    const isValidationMsgError = error.errorType === 999;
    const msgString = isValidationMsgError
        ?
        error.message.validationmsg || error.message
        :
        error.errorStatus
            ?
            error.message
            :
            'Please contact the administrator';
    const errorCode = isValidationMsgError
        ?
        400
        :
        error.errorStatus
            ?
            error.errorStatus
            :
            500;

    if (errorCode === 400) {
        req.logData.api_status_code = 400;
        return res.status(400).send({
            request_id: error.request_id,
            message: msgString,
            success: false,
        });
    }
    req.logData.api_status_code = errorCode === error.errorStatus ? error.errorStatus : 500;

    try {
        await reqresLog(error, req, 'error');
    } catch (logError) {
        return res.status(errorCode).send({
            request_id: error.request_id,
            message: msgString,
            success: false,
        });
    }

    return res.status(errorCode).send({
        request_id: error.request_id,
        message: msgString,
        success: false,
    });

}

module.exports = {
    reqresLog,
    s3Logging,
    errorLog: handleError
}
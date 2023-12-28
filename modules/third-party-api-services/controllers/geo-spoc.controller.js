const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const axios = require('axios');

async function checkNegativeAreaUsingAddress(req, res) {
    const apiName = 'CHECK-NEGATIVE-AREA';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'GEO-SPOC',
        api_name: apiName,
        service_id: process.env.SERVICE_GEO_CODE_ID,
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

        // Extract address, city, and pincode from the request body
        const { address, city, pincode } = req.body;

        // GeoCode URL and headers
        const geoCodeUrl = process.env.GEO_CODE_API_URL;

        const config = {
            headers: {
                [process.env.GEO_CODE_API_AUTH_KEY]: process.env.GEO_CODE_API_AUTH_VALUE,
            },
            params: {
                address,
                city,
                pincode
            }
        };

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch GeoCode data
        const geoCodeResp = await axios.get(geoCodeUrl, config);

        // Upload response to AWS S3
        await reqresLog(geoCodeResp.data, req, 'response');

        req.body.longitude = geoCodeResp.data.data.longitude
        req.body.latitude = geoCodeResp.data.data.latitude
        
        if (!req.body.latitude || !req.body.longitude ) {
            throw {
                errorStatus: 400,
                message: "City and Pincode mismatch. Kindly check if entered details are correct."
            }
        }
        return await negativeAreaCheck(req, res);
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

async function checkNegativeAreaUsingLatitudeAndLongitude(req, res) {
    await templateValidation.validateTemplateData(
        req.service.file_s3_path,
        req.body,
    );
    return await negativeAreaCheck(req, res);
}

// Function to make API call to geo-spoc with latitude and longitude to check for negative-area
async function negativeAreaCheck(req, res) {

    const apiName = 'NEGATIVE-AREA';
    const requestId = `${req.company.code}-${apiName}-${Date.now()}`;

    const serviceDetails = {
        vendor_name: 'GEO-SPOC',
        api_name: apiName,
        service_id: process.env.SERVICE_GEO_CODE_NEGATIVE_AREA_ID,
        request_id: requestId,
        api_response_type: 'JSON',
        is_cached_response: 'FALSE',
    };

    req.logData = {
        ...serviceDetails,
    };
    try {
        // Extract latitude and longitude from the request body
        const { longitude, latitude } = req.body;

        // GeoCode URL and headers
        const geoCodeUrl = process.env.GEO_CODE_NEGATIVE_AREA_URL;
        const config = {
            headers: {
                [process.env.GEO_CODE_API_AUTH_KEY]: process.env.GEO_CODE_API_AUTH_VALUE,
            },
            params: {
                longitude,
                latitude
            }
        };

        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        // Fetch GeoCode data
        const response = (await axios.get(geoCodeUrl, config))?.data;

        // Upload response to AWS S3
        await reqresLog(response, req, 'response');

        return res.status(200).send({
            request_id: requestId,
            result: {
                message: response.message,
                data: {
                    latitude: response.data.latitude,
                    longitude: response.data.longitude,
                    is_in_negative_area: response.data.isInNegativeArea
                }
            },
            success: true,
        });
    } catch (error) {
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}

module.exports = {
    checkNegativeAreaUsingAddress,
    checkNegativeAreaUsingLatitudeAndLongitude
};
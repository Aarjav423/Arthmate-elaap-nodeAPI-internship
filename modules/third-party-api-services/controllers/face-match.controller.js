const { reqresLog, errorLog } = require('./logging.controller')
const { templateValidation } = require('../validators')
const axios = require('axios');
const { karzaPostConfig } = require("../utils")

async function checkFaceMatch(req, res) {
    const apiName = 'FACE-MATCH';
    const requestId = `${req.company?.code}-${apiName}-${Date.now()}`;
    const serviceDetails = {
        vendor_name: 'KARZA',
        api_name: apiName,
        service_id: process.env.SERVICE_FACE_MATCH_ID,
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
        const caseID = {
            caseId:req.body.case_id
        }
        const payload = {
            image1B64:req.body.first_image,
            image2B64:req.body.second_image,
            getNumberOfFaces:req.body.get_number_of_faces || true,
            clientData:caseID
        }
        const faceMatchUrl = process.env.KARZA_URL + "v3/facesimilarity";

        const config =karzaPostConfig(faceMatchUrl,process.env.KARZA_API_KEY,payload);
        
        // Upload request to AWS S3
        await reqresLog(req.body, req, 'request');

        const faceMatchResp = (await axios.request(config))?.data;

        // Upload response to AWS S3
        await reqresLog(faceMatchResp, req, 'response');
        if(faceMatchResp?.statusCode===101 || faceMatchResp?.statusCode==="101"){
            return res.status(200).send({
                request_id: requestId,
                result: {
                    match: faceMatchResp?.result.match,
                    match_score: faceMatchResp?.result?.matchScore,
                    review_needed: faceMatchResp?.result.reviewNeeded,
                    confidence: faceMatchResp?.result.confidence,
                    face_properties: {
                        image1: {
                            number_of_faces: faceMatchResp?.result?.faceProperties?.image1?.numberOfFaces
                        },
                        image2: {
                            number_of_faces: faceMatchResp?.result?.faceProperties?.image2?.numberOfFaces
                        }
                    },
                    client_data: {
                        case_id: faceMatchResp?.clientData?.caseId
                    }
                },
                success: true,
            });
        }
        else{
           throw{
            message : "Please provide valide base64 of image",
            errorStatus: 400,
           }
        }
    } catch (error) {
        console.log("Face Match Error",error);
        error.request_id = requestId;
        await errorLog(error, req, res);
    }
}


module.exports = {
    checkFaceMatch,
};
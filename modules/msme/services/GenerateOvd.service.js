const axios = require('axios');

const GenerateOvdService = async (data) => {
    try {
        const config = {
            method: 'POST',
            url: `${process.env.SERVICE_OVD_URL
                    ? process.env.SERVICE_OVD_URL
                    : 'http://3.110.94.184:8082'
                }/generate-ovd`,
            headers: {
                Authorization: `${process.env.OVD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: data,
        };

        //make call ovd api
        const ovdResp = await axios(config);
        return { success: true, ovd_resp: ovdResp.data };
    } catch (error) {
        return {
            success: false,
        };
    }
};

module.exports = {
    GenerateOvdService
};
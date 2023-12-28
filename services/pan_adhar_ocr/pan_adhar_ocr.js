const axios = require('axios');
const pan_adhar_ocr = async (id, file, time) => {
  try {
    let postConfig = {
      file_b64: file,
      loan_app_id: id,
      consent: 'Y',
      consent_timestamp: time,
    };
    let header = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: process.env.SERVICE_MS_TOKEN,
      },
    };
    let response = await axios.post(
      `${process.env.SERVICE_MS_URL}/api/kyc-ocr`,
      postConfig,
      header,
    );
    return response.data.data.result;
  } catch (error) {
    throw {
      message: error.response.data.message,
      success: false,
    };
  }
};
module.exports = {
  pan_adhar_ocr,
};

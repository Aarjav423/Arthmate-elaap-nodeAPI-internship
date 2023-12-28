const axios = require('axios');

const sendOtp = async (mobileData) => {
  const requestBody = {
    recipient: mobileData.receiver_mobile,
    message: mobileData.smsContent,
    from: process.env.SEND_OTP_FROM,
  };
  //Send OTP message URL
  const url = process.env.AUTH_SEND_OTP_URL;

  //Headers
  const config = {
    headers: {
      Authorization: `Basic ${process.env.SMS_OTP_AUTHORIZATION}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await axios.post(url, requestBody, config);
    return response.data;
  } catch (error) {
    return error;
  }
};

module.exports = sendOtp;

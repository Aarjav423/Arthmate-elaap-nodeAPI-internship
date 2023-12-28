const axios = require('axios');

const postConfig = {
  method: 'post',
  headers: {
    apikey: process.env.SMS_MICROSERVICE_APIKEY,
    'Content-Type': 'application/json',
  },
};

/**
 * Usage:

    sendOtp({phone:9545595676}).then( function(response){
    console.log(response.data);
   });
   will print response.data as
    {
        success: true,
        msg: 'OTP sent on 9545595676',
        id: '63c35319688fb2842b65428f5d9a1b2c',
        isValid: true
    }
 */
var sendOtp = function (smsData) {
  return new Promise(function (resolve, reject) {
    console.log('postConfig: ', postConfig);
    axios
      .post(
        'https://otp.onrender.com/begin',
        JSON.stringify(smsData),
        postConfig,
      )
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Usage; verifyOtp({phone:9545595676,id:"bb1538ae2807a73bf4dff99ee5b79b31", otp:528497})
 *                .then(function(response){ console.log(response); })

    will print response.data as
     {
        success: true,
        msg: 'OTP sent on 9545595676',
        id: 'bb1538ae2807a73bf4dff99ee5b79b31',
        isValid: true
    }
});
 */
var verifyOtp = function (smsData) {
  return new Promise(function (resolve, reject) {
    axios
      .post(
        'https://otp.onrender.com/complete',
        JSON.stringify(smsData),
        postConfig,
      )
      .then(resolve)
      .catch(reject);
  });
};

module.exports = {
  sendOtp,
  verifyOtp,
};

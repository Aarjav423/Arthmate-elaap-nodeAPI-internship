'use strict';
const moment = require('moment');
const axios = require('axios');

/***
 * pradeep jaiswal
 * api call for trackwizz service
 */
const trackWizzService = async (data) => {
  try {
    const config = {
      method: 'POST',
      url: `${
        process.env.SERVICE_OVD_URL
          ? process.env.SERVICE_OVD_URL
          : 'http://3.110.94.184:8082'
      }/trackwizz/process`,
      headers: {
        Authorization: `${process.env.OVD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: data,
    };

    //make call trackwizz api
    const reponse = await axios(config);
    return { success: true, response: reponse.data.a64ScreeningApiResult };
  } catch (error) {
    console.log('error >>', error);
    return {
      success: false,
    };
  }
};

module.exports = {
  trackWizzService,
};

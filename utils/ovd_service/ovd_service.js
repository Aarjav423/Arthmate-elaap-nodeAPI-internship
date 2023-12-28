'use strict';
const moment = require('moment');
const axios = require('axios');

/***
 * pradeep jaiswal
 * api call for ovd service
 */
const OvdService = async (data) => {
  try {
    const config = {
      method: 'POST',
      url: `${
        process.env.SERVICE_OVD_URL
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

const smartParserService = async (data) => {
  try {
    const config = {
      method: 'POST',
      url: process.env.SERVICE_SMART_PARSER_URL,
      headers: {
        'access-token': process.env.SMART_PARSER_TOKEN,
        'Content-Type': 'application/json',
      },
      data: data,
    };

    //make call generic parser api
    const genericParserResp = await axios(config);
    return { success: true, parser_resp: genericParserResp.data };
  } catch (error) {
    return {
      success: false,
    };
  }
};

module.exports = {
  OvdService,
  smartParserService,
};

const axios = require('axios');

const SmartParserService = async (data) => {
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
  SmartParserService
};
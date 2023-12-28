const axios = require('axios');
const qs = require('qs');

const handleTokenGeneration = async (url, data) => {
  let result;
  let error;
  let options = {
    headers: {
      Authorization: process?.env?.ENACH_TOKEN_FOR_GENERATION,
      'Content-Type': 'application/json',
    },
  };
  let payload = {
    company_id: data?.company_id || "",
    user_id: data?.user_id,
    source: process?.env?.ENACH_SOURCE,
    scope: [process?.env?.ENACH_WRITE, process?.env?.ENACH_READ],
    is_enable_expiry: data?.is_enable_expiry ?? true,
  };

  try {
    result = await axios.post(url, payload, options);
    return { result };
  } catch (error) {
    console.log(error);
    throw {
      error,
      message: 'Error occured in handle Token Generation Request',
      success: false,
    };
  }
};

module.exports={
    handleTokenGeneration
}
const axios = require('axios');

const validationCheck = async (payload) => {
  const url = process.env.MS_VALIDATOR_URL;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const result = await axios.post(url, payload, config);
    return result.data;
  } catch (error) {
    console.log(error?.response?.data?.message);
  }
};

module.exports = {
  validationCheck: validationCheck,
};

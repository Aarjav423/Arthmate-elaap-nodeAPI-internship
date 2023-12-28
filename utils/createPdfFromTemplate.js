const axios = require('axios');
const createPdf = async (templateBody, config) => {
  try {
    let responseData = await axios.post(
      `${process.env.PDF_URL}/generate-doc`,
      templateBody,
      config,
    );
    return responseData;
  } catch (error) {
    throw error;
  }
};
module.exports = {
  createPdf,
};

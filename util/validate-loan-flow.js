const axios = require('axios');
const jwt = require('../util/jwt');

const validatePanDetails = async (
  basePath,
  bodyData,
  companyId,
  companyCode,
  productId,
  userId,
  panUserDetails,
) => {
  try {
    const token = jwt.generateTokenForService(
      {
        company_id: companyId,
        product_id: productId,
        user_id: userId,
        type: 'service',
        company_code: companyCode,
      },
      60 * 5 * 1,
    );
    const panValidationResult = await axios.post(
      `${basePath}/api/kz_pan_kyc`,
      bodyData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          company_code: companyCode,
        },
      },
    );
    if (!panValidationResult)
      throw {
        message: 'Something went wrong while verifying pan',
      };
    const nameMatch =
      (await panValidationResult.data.data.result.name) ===
      panUserDetails.toUpperCase();
    if (!nameMatch)
      throw {
        message: 'Invalid pan details.',
      };
    return nameMatch;
  } catch (error) {
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};
const processCreditGridData = async (data) => {
  return true;
};

const validateProcessCreditGrid = async (
  basePath,
  bodyData,
  companyId,
  companyCode,
  productId,
  userId,
) => {
  try {
    const token = jwt.generateTokenForService(
      {
        company_id: companyId,
        product_id: productId,
        user_id: userId,
        type: 'service',
        company_code: companyCode,
      },
      60 * 5 * 1,
    );
    const bureauCreditResult = await axios.post(
      `${basePath}/api/credit_report`,
      bodyData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          company_code: companyCode,
        },
      },
    );
    if (!bureauCreditResult)
      throw {
        message: 'Error while fetching bureau credit.',
      };
    if (bureauCreditResult.data.data.message !== 'ok')
      throw {
        message: bureauCreditResult.data.data.message,
      };
    return bureauCreditResult.data.data;
  } catch (error) {
    return error;
  }
};

const validatePennyDropDetails = async (
  basePath,
  bodyData,
  companyId,
  companyCode,
  productId,
  userId,
  userAccountNumber,
) => {
  try {
    const token = jwt.generateTokenForService(
      {
        company_id: companyId,
        product_id: productId,
        user_id: userId,
        type: 'service',
        company_code: companyCode,
      },
      60 * 5 * 1,
    );
    const accountValidationResult = await axios.post(
      `${basePath}/api/kz_bank_acc_num`,
      bodyData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          company_code: companyCode,
        },
      },
    );
    if (!accountValidationResult)
      throw {
        message: 'Something went wrong while verifing account',
      };
    const accountMatch =
      (await response.data.result.accountNumber) === userAccountNumber;
    if (!accountMatch)
      throw {
        message: 'Invalid account details.',
      };
    return accountMatch;
  } catch (error) {
    return error;
  }
};

const fetchBureauDetailsFromS3 = async (pathUrl, bureauDetails) => {
  //validating bureau id fetched from S3
  return true;
};

const checkPoolFLDGBalance = async () => {
  //configured disbursement channel and balance check
  return;
};

module.exports = {
  validatePanDetails,
  processCreditGridData,
  validatePennyDropDetails,
  fetchBureauDetailsFromS3,
  checkPoolFLDGBalance,
  validateProcessCreditGrid,
};

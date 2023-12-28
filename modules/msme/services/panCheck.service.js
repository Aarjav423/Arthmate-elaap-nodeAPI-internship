const axios = require('axios');

const panNsdlCheck = async (query) => {
  const url = `${process.env.SERVICE_MS_URL}/api/pan_kyc_v2`;

  const data = {
    pan: query.pan,
    loan_app_id: query.loan_app_id,
    consent: 'Y',
    consent_timestamp: '2023-01-12 10:30:30',
  };

  const config = {
    headers: {
      Authorization: `${process.env.SERVICE_MS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    let result = await axios.post(url, data, config);
    return result.data;
  } catch (error) {
    throw {
      error,
      message: 'Network issue please try after sometime',
      success: false,
    };
  }
};

const nameMatchCheck = async (query) => {
  const url = `${process.env.SERVICE_MS_URL}/api/kz-name`;
  const config = {
    headers: {
      Authorization: `${process.env.SERVICE_MS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    let result = await axios.post(url, query, config);
    return result.data;
  } catch (error) {
    throw {
      error,
      message: 'Network issue please try after sometime',
      success: false,
    };
  }
};

const verifyPan = async (query) => {
  const { pan, first_name, middle_name, last_name, loan_app_id } = query;
  let fullname;
  if (middle_name) fullname = first_name + ' ' + middle_name + ' ' + last_name;
  else fullname = first_name + ' ' + last_name;

  const nsdlPayload = {
    pan: pan,
    loan_app_id: loan_app_id,
  };

  const panNsdlResult = await panNsdlCheck(nsdlPayload);

  if (!panNsdlResult) {
    throw {
      success: false,
      message: 'Network issue in pan validation. Please try after sometime',
    };
  }

  if (!panNsdlResult.success) {
    throw {
      success: false,
      message: 'Please enter valid PAN',
    };
  }

  const pan_first_name = panNsdlResult.data.first_name;
  const pan_middle_name = panNsdlResult.data.middle_name;
  const pan_last_name = panNsdlResult.data.last_name;
  let pan_name;
  if (pan_middle_name)
    pan_name = pan_first_name + ' ' + pan_middle_name + ' ' + pan_last_name;
  else pan_name = pan_first_name + ' ' + pan_last_name;

  const nameCheckPayload = {
    input_fname: first_name,
    input_mname: middle_name,
    input_lname: last_name,
    input_name: fullname,
    kyc_fname: pan_first_name,
    kyc_mname: pan_middle_name,
    kyc_lname: pan_last_name,
    kyc_name: pan_name,
    type: 'individual',
  };

  const nameMatchResult = await nameMatchCheck(nameCheckPayload);

  if (!nameMatchResult) {
    throw {
      success: false,
      message: 'Network issue in name match. Please try after sometime',
    };
  }

  const score = nameMatchResult.data.result.score;
  let status;
  if (score < 0.2) {
    status = 'rejected';
    throw {
      success: false,
      message: "PAN details doesn't match with Loan record",
    };
  }

  if (score >= 0.2 && score <= 0.7) status = 'deviation';
  else status = 'approved';

  return status;
};

module.exports = {
  panNsdlCheck,
  nameMatchCheck,
  verifyPan,
};

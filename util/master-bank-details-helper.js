const bodyParser = require('body-parser');
const validate = require('./validate-req-body.js');
const axios = require('axios');
const bankDetailsData = require('../models/master-bank-details-schema.js');

const validateBankDetailsData = async (req, res, next) => {
  try {
    const template = [
      {
        field: 'bene_bank_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid beneficiary bank name',
      },
      {
        field: 'bene_bank_acc_num',
        type: 'alphanum',
        checked: 'FALSE',
        validationmsg: 'Please enter valid beneficiary bank account number',
      },
      {
        field: 'bene_bank_ifsc',
        type: 'ifsc',
        checked: 'FALSE',
        validationmsg: 'Please enter valid beneficiary bank ifsc',
      },
      {
        field: 'bene_bank_account_holder_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg:
          'Please enter valid beneficiary bank account holder name',
      },
      {
        field: 'bene_bank_account_type',
        type: 'enum',
        checked: 'FALSE',
        validationmsg: 'Please enter valid beneficiary bank account type',
      },
    ];
    //validate request data with above data
    const result = await validate.validateDataWithTemplate(template, [
      req.body,
    ]);
    if (!result)
      throw {
        success: false,
        message: 'Error while validating data with template.',
      };
    if (result.unknownColumns.length)
      throw {
        success: false,
        message: 'Few columns are unknown',
        data: {
          unknownColumns: result.unknownColumns,
        },
      };
    if (result.missingColumns.length)
      throw {
        success: false,
        message: 'Few columns are missing',
        data: {
          missingColumns: result.missingColumns,
        },
      };
    if (result.errorRows.length)
      throw {
        success: false,
        message: 'Few fields have invalid data',
        data: {
          exactErrorRows: result.exactErrorColumns,
          errorRows: result.errorRows,
        },
      };
    if (result.exactEnumErrorColumns.length)
      throw {
        success: false,
        message: `${result.exactEnumErrorColumns[0]}`,
        errorCode: '02',
        data: {
          exactEnumErrorColumns: result.exactEnumErrorColumns,
        },
      };
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const pennyDropAPICalling = async (data) => {
  try {
    const pennyBankData = {
      ifsc: data.bene_bank_ifsc,
      account_number: data.bene_bank_acc_num,
    };
    const pennyURL =
      process.env.SERVICE_MS_URL + process.env.SERVICE_MASTER_BANK_PENNY_URL;

    const pennyDropResponseData = await axios.request({
      url: pennyURL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.SERVICE_MASTER_BANK_PENNY_TOKEN,
      },
      data: JSON.stringify(pennyBankData),
    });

    return pennyDropResponseData;
  } catch (error) {
    throw {
      success: false,
      message: 'Error occured in Penny Drop API',
    };
  }
};

module.exports = {
  validateBankDetailsData,
  pennyDropAPICalling,
};

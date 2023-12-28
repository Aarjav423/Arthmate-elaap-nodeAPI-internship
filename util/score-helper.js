const AScoreSchema = require('../models/a-score-schema.js');
const BScoreSchema = require('../models/b-score-schema.js');
const OfferDetailsSchema = require('../models/offer-details-schema.js');
const validate = require('../util/validate-req-body.js');
const processAscore = async (req, data) => {
  try {
    // Fetch data from a_score by req_id
    const aScoreData = await AScoreSchema.findByReqId(data.a_score_request_id);
    if (!aScoreData) throw { success: false, message: 'A score not found.' };
    return {
      success: true,
      score: aScoreData.score,
      bureau_score: aScoreData?.bureau_score,
    };
  } catch (error) {
    return error;
  }
};

const processBscore = async (req, data) => {
  try {
    // Fetch data from b_score by req_id
    const bScoreData = await BScoreSchema.findByReqId(data.b_score_request_id);
    if (!bScoreData) throw { success: false, message: 'B score not found.' };
    return {
      success: true,
      score: bScoreData.score,
      offered_amount: bScoreData?.offered_amount,
      offered_int_rate: bScoreData?.offered_int_rate,
      monthly_imputed_income: bScoreData?.monthly_imputed_income,
      monthly_average_balance: bScoreData?.monthly_average_balance,
      foir: bScoreData?.foir,
    };
  } catch (error) {
    return error;
  }
};

const processOfferDetails = async (req, loan_app_id) => {
  try {
    // Fetch data from b_score by req_id
    const offerDetailsData =
      await OfferDetailsSchema.getByLoanAppId(loan_app_id);
    if (!offerDetailsData) return null;
    return {
      success: true,
      offered_amount: offerDetailsData?.offered_amount,
      offered_int_rate: offerDetailsData?.offered_int_rate,
      monthly_imputed_income: offerDetailsData?.monthly_imputed_income,
      monthly_average_balance: offerDetailsData?.monthly_average_balance,
      foir: offerDetailsData?.foir,
      loan_app_id: offerDetailsData?.loan_app_id,
    };
  } catch (error) {
    return error;
  }
};

const validateAScoreDetailsData = async (req, res, next) => {
  try {
    const template = [
      {
        field: 'first_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid first name',
      },
      {
        field: 'last_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid last name',
      },
      {
        field: 'dob',
        type: 'date',
        checked: 'FALSE',
        validationmsg: 'Please enter valid date of birth',
      },
      {
        field: 'pan',
        type: 'pan',
        checked: 'FALSE',
        validationmsg: 'Please enter valid pan number',
      },
      {
        field: 'gender',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid gender',
      },
      {
        field: 'mobile_number',
        type: 'mobile',
        checked: 'FALSE',
        validationmsg: 'Please enter valid mobile number',
      },
      {
        field: 'address',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid address',
      },

      {
        field: 'city',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid city',
      },
      {
        field: 'state',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid state code',
      },

      {
        field: 'pin_code',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid pin code',
      },
      {
        field: 'loan_app_id',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid loan_app_id',
      },
      {
        field: 'product_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid product type',
      },
      {
        field: 'enquiry_purpose',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid enquiry purpose',
      },
      {
        field: 'enquiry_stage',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid enquiry stage',
      },
      {
        field: 'enquiry_amount',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid enquiry amount',
      },
      {
        field: 'en_acc_account_number_1',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid en_acc_account_number',
      },
      {
        field: 'bureau_type',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid bureau type',
      },
      {
        field: 'consent',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid consent',
      },
      {
        field: 'consent_timestamp',
        type: 'date-time',
        checked: 'FALSE',
        validationmsg: 'Please enter valid consent timestamp',
      },
      {
        field: 'tenure',
        type: 'int32',
        checked: 'FALSE',
        validationmsg: 'Please enter valid tenure',
      },
      {
        field: 'status',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid status',
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
    next();
  } catch (error) {
    console.log('validateAScoreDetailsData error', error);
    return res.status(400).send(error);
  }
};

module.exports = {
  processAscore,
  processBscore,
  processOfferDetails,
  validateAScoreDetailsData,
};

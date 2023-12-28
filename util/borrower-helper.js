const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const StatusLogsSchema = require('../models/status-logs-schema.js');
const validate = require('./validate-req-body.js');
const jwt = require('../util/jwt');
const ComplianceSchema = require('../models/compliance-schema.js');
const PayoutDetailsSchema = require('../models/payout-detail-schema.js');
const payoutDetailsStatus = ['in_progress', 'processed'];
const CompanySchema = require('../models/company-schema.js');
const ProductSchema = require('../models/product-schema.js');
const { refundType } = require('../utils/constant.js');
const { getInterestRefundPayoutDetails } = require('./payout-details-helper.js');

const isLoanExist = async (req, res, next) => {
  try {
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_id: req.body.loan_id,
      loan_app_id: req.body.loan_app_id,
      partner_loan_id: req.body.partner_loan_id,
      partner_borrower_id: req.body.partner_borrower_id,
      borrower_id: req.body.borrower_id,
    });
    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for provided data.',
      };

    // Validate company_id and product_id with token
    const validateCompanyProductWithLAID = await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
    if (!validateCompanyProductWithLAID.success) throw validateCompanyProductWithLAID;

    req.loanData = loanExist;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const isLoanExistByLeadID = async (req, res, next) => {
  try {
    if (!req.body.loan_app_id) {
      throw {
        success: false,
        message: 'Please provide the loan APP ID',
      };
    }
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_app_id: req.body.loan_app_id,
    });
    if (loanExist)
      throw {
        success: false,
        message: 'Loan already exist with provided loan app ID.',
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const checkLoanStatusIsActive = async (req, res, next) => {
  try {
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_id: req.body.loan_id || req.params.loan_id,
    });
    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for provided data.',
      };
    // Retreive Stage to check loan is active
    let { stage = 0 } = loanExist;
    if (stage != 4) {
      throw {
        success: false,
        message: 'Loan is not in active state',
      };
    }

    req.loanData = loanExist;
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const isLoanExistByLID = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_id,
    });

    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for provided data.',
      };
    // Validate company_id and product_id with token
    const validateCompanyProductWithLAID = await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
    if (!validateCompanyProductWithLAID.success) throw validateCompanyProductWithLAID;

    req.loanData = loanExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const isConditionalLoanExistByLID = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_id ? req.body.loan_id : req.params.loan_id;
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_id,
    });
 
    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for provided data.',
      };
    // Check if the user is not a SuperAdmin
    if (req.authData && req.user && req.user.type.toLowerCase() !== 'admin') {
      // Validate company_id and product_id with token for non-SuperAdmins
      const validateCompanyProductWithLAID = await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
      if (!validateCompanyProductWithLAID.success) {
        throw validateCompanyProductWithLAID;
      }
    } else {
      req.company = await CompanySchema.findById(loanExist.company_id);
      req.product = await ProductSchema.findById(loanExist.product_id);
    }
 
    req.loanData = loanExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const fetchLeadData = async (req, res, next) => {
  try {
    const leadResp = await LoanRequestSchema.findIfExists(req.loanData.loan_app_id);
    if (!leadResp)
      throw {
        success: false,
        message: 'No lead found against provided loan_app_id.',
      };
    req.leadData = leadResp;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const validateLoanPatchData = async (req, res, next) => {
  try {
    const template = [
      {
        field: 'umrn',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid umrn.',
      },
      {
        field: 'mandate_ref_no',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid mandate_ref_no.',
      },
      {
        field: 'nach_amount',
        type: 'float',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_amount.',
      },
      {
        field: 'nach_registration_status',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_registration_status).',
      },
      {
        field: 'nach_status_desc',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_status_desc.',
      },
      {
        field: 'nach_account_holder_name',
        type: 'string',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_account_holder_name.',
      },
      {
        field: 'nach_account_num',
        type: 'alphanum',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_account_num.',
      },
      {
        field: 'nach_ifsc',
        type: 'ifsc',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_ifsc.',
      },
      {
        field: 'nach_start',
        type: 'date',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_start in YYYY-MM-DD format.',
      },
      {
        field: 'nach_end',
        type: 'date',
        checked: 'FALSE',
        validationmsg: 'Please enter valid nach_end in YYYY-MM-DD format.',
      },
    ];
    //validate request data with above data
    const result = await validate.validateDataWithTemplate(template, [req.body]);
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
    return res.status(400).send(error);
  }
};

const loanExistBulk = async (req, res, next) => {
  try {
    //check if all borrower ids exists in borrower info table
    let uniqueLoanIds = req.uniqueLoanIds;
    loanIdAlreadyExist = await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
    if (loanIdAlreadyExist.length < uniqueLoanIds.length)
      throw {
        success: false,
        message: 'Few loan ids not present in loan',
      };
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const findLoanExist = async (loan_id, req) => {
  try {
    // Check if loan id exist in borrower info common table
    const loanData = await BorrowerinfoCommon.findOneWithKLID(loan_id);
    if (!loanData)
      throw {
        success: false,
        message: 'No records found against provided loan id in borrowerinfo.',
      };

    // Validate company_id and product_id with token
    const validateCompanyProductWithLAID = await jwt.verifyLoanAppIdCompanyProduct(req, loanData.loan_app_id);
    if (!validateCompanyProductWithLAID.success) throw validateCompanyProductWithLAID;

    return loanData;
  } catch (error) {
    return error;
  }
};

const getLeadLoanData = async (req, res, next) => {
  try {
    const loan_app_id = req.loanData.loan_app_id;
    const leadData = await fetchLeadData(req, res, next);
    let leadsData = JSON.parse(JSON.stringify(req.leadData));
    let borrowerData = JSON.parse(JSON.stringify(req.loanData));
    const lmsPostData = await Object.assign(leadsData, borrowerData);
    req.lmsPostData = lmsPostData;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const recordStatusLogs = async (req, loan_id, old_status, new_status, userType) => {
  try {
    let userEmail = '';
    if (userType === 'system') {
      userEmail = userType;
    } else if (userType === 'dash-api' || userType === 'dash') {
      userEmail = req.user.email;
    } else if (userType === 'api') {
      userEmail = req?.company?.name;
    }
    //Prepare status logs object
    statusLogsObj = {
      loan_id: loan_id,
      old_status: old_status,
      new_status: new_status,
      user_email: userEmail,
      action_date_time: Date.now(),
    };
    //Fetch loan data by loan id
    if (old_status == '') {
      const loanExist = await BorrowerinfoCommon.findByCondition({
        loan_id,
      });
      statusLogsObj.old_status = loanExist.status;
      statusLogsObj.loan_id = loanExist.loan_id;
      statusLogsObj.old_status = loanExist.status;
    }
    //Record loan status logs.
    const recordLoanStatusLogs = await StatusLogsSchema.addNew(statusLogsObj);
    if (!recordLoanStatusLogs)
      throw {
        success: false,
        message: 'Error while recording loan status logs.',
      };
    return { success: true };
  } catch (error) {
    return error;
  }
};

//record user for loan creation
const recordUser = async (req, loan_id, userType) => {
  try {
    if (userType === 'api') {
      user_id = req?.company?.name;
    } else {
      user_id = req?.user?._id;
    }
    //update in borrower  info schema
    const recordUser = await BorrowerinfoCommon.updateBI({ user_id: user_id }, loan_id);

    //update in compliance  schema
    const recordUserInCompliance = await ComplianceSchema.updateUserCompliance({ user_id: user_id }, loan_id);
  } catch (error) {
    return error;
  }
};

const isLoanExistByLoanAppId = async (req, res, next) => {
  try {
    const loan_app_id = req.body.loan_app_id ? req.body.loan_app_id : req.params.loan_app_id;
    // Validate if loan_app_id exist in borrower_info table, if not throw error "loan_app_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_app_id,
    });

    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for loan_app_id ',loan_app_id,
      };
    // Validate company_id and product_id with token
    const validateCompanyProductWithLAID =
      await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
    if (!validateCompanyProductWithLAID.success)
      throw validateCompanyProductWithLAID;

    req.loanData = loanExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const findLoanDetailsForNach = async (loanId) => {
  try {
    const data = await BorrowerinfoCommon.findLoanForNach(loanId);
    if (data?.length < 1) {
      throw { message: "No loan exists for the given loan_id" };
    } else {
      return data[0];
    }
  } catch (error) {
    throw error;
  }
};

const updateNachDetailsInBIC = async (updates, query) => {
  try {
    const bic = await BorrowerinfoCommon.updateBorrowerInfoCommon(
      updates,
      query,
    );
    return bic;
  } catch (error) {
    throw error;
  }
};

const checkBorrowerPayoutStatus = async (req, res, next) => {
  try {
    const loan_id = req.body?.loan_id ?? req.params?.loan_id;

    // Check Borrower Details
    const borrowerInfo = await BorrowerinfoCommon.findByCondition({ loan_id });
    if (!borrowerInfo) throw new Error('Loan details do not exist for the provided data.');
    req.borrowerInfo = borrowerInfo;

    // Check Payout Details
    let requestor_id;
    if (req.authData.type == 'api') {
      requestor_id = req?.company?.name;
    } else {
      requestor_id = req?.user?.email;
    }
    const payoutInfo = await getInterestRefundPayoutDetails(borrowerInfo, requestor_id);
    if (!payoutInfo) throw new Error('Payout details do not exist for the provided data.');
    if (payoutDetailsStatus.includes(payoutInfo?.status?.toLowerCase())) throw new Error(`Your request cannot be processed, as the payout status is '${payoutInfo?.status?.toLowerCase()}'.`);
    req.payoutInfo = payoutInfo;

    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message ?? "Technical error, please try again."
    });
  }
};

module.exports = {
  isLoanExist,
  isLoanExistByLID,
  isConditionalLoanExistByLID,
  fetchLeadData,
  validateLoanPatchData,
  loanExistBulk,
  findLoanExist,
  getLeadLoanData,
  recordStatusLogs,
  recordUser,
  checkLoanStatusIsActive,
  isLoanExistByLoanAppId,
  isLoanExistByLeadID,
  findLoanDetailsForNach,
  updateNachDetailsInBIC,
  checkBorrowerPayoutStatus,
};

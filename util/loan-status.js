const moment = require('moment');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const creditGridSchema = require('../models/credit-grid-schema.js');
const shortOrexcessSchema = require('../models/short-or-excess-schema.js');
const kycValidation = require('./kyc-validation');
const LoanRequestSchema = require('../models/loan-request-schema.js');
const validateLoanFlow = require('../util/validate-loan-flow.js');
const thirdPartyHelper = require('../util/thirdPartyHelper.js');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const loanedits = require('./loanedits');
const axios = require('axios');
const LoanStateSchema = require('../models/loan-state-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');
const { getEPSILON } = require('./math-ops');

const updateStatus = async (req, data) => {
  try {
    const borrowerResp = await BorrowerinfoCommon.findOneWithKLID(data.loan_id);
    data.product_key = req.product.name;
    if (borrowerResp.stage == 4 && data.status !== 'cancelled') {
      throw {
        message: `Unable to change loan status as loan is already in ${borrowerResp.status} status`,
        success: false,
      };
    }
    const lrData = await LoanRequestSchema.findIfExists(data.loan_app_id);
    const panUserName =
      lrData.first_name + ' ' + lrData.middle_name + ' ' + lrData.last_name;
    data.stage = loanedits.mappingStages[data.status];
    if (data.status === 'open') {
      if (borrowerResp.status !== 'kyc_data_approved')
        throw {
          success: false,
          message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };
      const updateLeadData = await LoanRequestSchema.updateLeadStatus(
        data.loan_app_id,
        { lead_status: 'approved' },
      );
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };
      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
    var basePath = 'http://localhost:' + process.env.PORT;
    if (data.status === 'kyc_data_approved') {
      if (
        borrowerResp.status !== 'open' &&
        borrowerResp.status !== 'credit_approved'
      )
        throw {
          success: false,
          message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };
      if (
        borrowerResp.status === 'credit_approved' &&
        isCoLending(req.product.co_lenders,borrowerResp)
      ) {
        throw {
          success: false,
          message: `This co-lending loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };
      }
      if (req.product.check_mandatory_docs) {
        const docResp = await kycValidation.CheckMandatoryDocUpload(
          req.loanSchema._id,
          data.loan_id,
        );
        if (!docResp.success)
          throw {
            success: false,
            message: docResp.message,
          };
      }

      data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
      data.stage = loanedits.mappingStages['kyc_data_approved'];
      const updateLeadStatus = await LoanRequestSchema.updateStatus(
        [data],
        'kyc_data_approved',
      );
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };

      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
    if (data.status === 'credit_approved') {
      if (
        borrowerResp.status !== 'kyc_data_approved' &&
        borrowerResp.status !== 'disbursal_approved'
      )
        throw {
          success: false,
          message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };
      const checkCreditGrid = await creditGridSchema.getActiveGrid(
        req.product._id,
      );
      if (checkCreditGrid.length) {
        if (!lrData.aadhar_card_num)
          throw {
            success: false,
            message: "Borrower's aadhar number is required.",
          };
        if (!lrData.appl_pan)
          throw {
            success: false,
            message: "Borrower's pan number is required.",
          };
        if (!lrData.appl_phone)
          throw {
            success: false,
            message: "Borrower's phone number is required.",
          };
        if (!lrData.first_name)
          throw {
            success: false,
            message: "Borrower's first name is required.",
          };
        if (!lrData.middle_name)
          throw {
            success: false,
            message: "Borrower's middle name is required.",
          };
        if (!lrData.last_name)
          throw {
            success: false,
            message: "Borrower's last name is required.",
          };
        if (!lrData.dob)
          throw {
            success: false,
            message: "Borrower's date of birth is required.",
          };

        const bodyData = {
          aadhaarNumber: lrData.aadhar_card_num,
          panNumber: lrData.appl_pan,
          phoneNumber: lrData.appl_phone,
          firstName: lrData.first_name,
          middleName: lrData.middle_name,
          lastName: lrData.last_name,
          birthday: lrData.dob,
        };
        const creditGridReport = validateLoanFlow.validateProcessCreditGrid(
          basePath,
          bodyData,
          req.company._id,
          req.company.code,
          req.product._id,
          req.user._id,
        );
        if (!creditGridReport)
          throw {
            success: false,
            message: 'error while fetching process credit grid data',
          };
        const processCreditGrid =
          validateLoanFlow.processCreditGridData(creditGridReport);
        if (!processCreditGrid)
          throw {
            success: false,
            message: 'error while processing credit grid report',
          };
      }
      data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
      data.stage = loanedits.mappingStages['credit_approved'];
      if (
        req.product.is_lender_selector_flag === 'Y' &&
        borrowerResp.co_lend_flag === 'Y'
      ) {
        data.stage = loanedits.mappingStages['co_lender_approval_pending'];
        data.status = 'co_lender_approval_pending';
      }
      const updateLeadStatus = await LoanRequestSchema.updateStatus(
        [data],
        data.status,
      );
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };
      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
    if (data.status === 'disbursal_approved') {
      if (req.product.allow_loc)
        throw {
          success: false,
          message: `Loan status can’t be changed beyond ${borrowerResp.status}.`,
        };
      if (
          borrowerResp.status !== 'credit_approved' &&
          borrowerResp.status !== 'disbursal_pending'
      )
        throw {
          success: false,
          message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };
      let pennyDropStatusResult = { message : "" }
      if (req.product?.penny_drop && process.env.PENNY_DROP_CHECK === 'Restricted') {
        pennyDropStatusResult = await pennyDropStatus(data);
        if (!pennyDropStatusResult.success) {
          const updates = {
            penny_drop_result : pennyDropStatusResult.penny_drop_result,
            name_match_result : pennyDropStatusResult.name_match_result,
            updated_at : moment().format('YYYY-MM-DD HH:mm:ss')
          }
          await BorrowerinfoCommon.updateLoanStatus(updates, data.loan_id)
          throw {
            success: false,
            message: pennyDropStatusResult.message,
          };
        }
      }
      const thirdPartyLoanStatusUpdate =
        await thirdPartyHelper.thirdPartyUpdateLoanStatus(req, data);
      if (!thirdPartyLoanStatusUpdate.success) {
        return thirdPartyLoanStatusUpdate.data;
      }
      data.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
      data.disbursal_approve_date = moment().format('YYYY-MM-DD');
      data.stage = loanedits.mappingStages['disbursal_approved'];
      await LoanRequestSchema.updateStatus(
          [data],
          'disbursal_approved',
      );
      data.penny_drop_result = pennyDropStatusResult.penny_drop_result
      data.name_match_result = pennyDropStatusResult.name_match_result
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };
      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `${pennyDropStatusResult.message} Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
    if (data.status === 'rejected') {
      if (!data?.reason) {
        throw {
          success: false,
          message: 'Please provide the reason',
        };
      }
      const rejectLoan = await handleLoanRejection(req, borrowerResp, data);
      if (!rejectLoan.success) throw rejectLoan;
      return rejectLoan;
    }
    if (loanedits.mappingStatuses[data.status] !== borrowerResp.status)
      throw {
        success: false,
        message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
      };
    if (data.status === 'disbursed') {
      if (borrowerResp.status !== 'disbursal_approved')
        throw {
          success: false,
          message: `Loan status cannot be change to ${data.status} currently loan is in ${borrowerResp.status} state.`,
        };

      data.disburse_date = moment().format('YYYY-MM-DD');
      data.stage = loanedits.mappingStages['disbursed'];
      const updateLeadStatus = await LoanRequestSchema.updateStatus(
        [data],
        'disbursed',
      );
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };
      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
    if (data.status === 'cancelled') {
      data.stage = loanedits.mappingStages['cancelled'];

      if (!req.product.cancellation_period)
        throw {
          success: false,
          message: 'Cancellation period is not configured in product.',
        };
      const cancellationPeriod = req.product.cancellation_period;
      const disbursementRecords = await DisbursementLedgerSchema.findByLoanId(
        data.loan_id,
      );
      if (!disbursementRecords)
        throw {
          success: false,
          message: `No disbursement records found aginst ${data.loan_id}`,
        };
      const disburseDate = moment(
        disbursementRecords.disbursement_date_time,
        'YYYY-MM-DD',
      );

      const currentDate = moment();
      const daysPassedAfterDisbursement = currentDate.diff(
        disburseDate,
        'days',
      );

      // Validate the days passed after disbursement should not be greater than cancellation_period

      if (daysPassedAfterDisbursement > cancellationPeriod)
        throw {
          success: false,
          message:
            'Unable to cancel the loan as days passed are more than cancellation period',
        };
      // Loan transaction squareoff
      const loanTransactions = await loanCreditAndDebitTransactions(
        borrowerResp,
        req,
      );
      if (loanTransactions.success == false) throw loanTransactions;
      const updateLeadStatus = await LoanRequestSchema.updateStatus(
        [data],
        'cancelled',
      );
      const updateStatusResp = await BorrowerinfoCommon.updateLoanStatus(
        data,
        data.loan_id,
      );
      if (!updateStatusResp)
        throw {
          success: false,
          message: 'Failed to update loan status',
        };
      //Record loan status change logs
      const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
        req,
        data.loan_id,
        borrowerResp.status,
        data.status,
        req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      return {
        message: `Loan status updated to ${data.status} successfully.`,
        updateResp: updateStatusResp,
      };
    }
  } catch (error) {
    return error;
  }
};

const updateStatusToKycDataApproved = async (req, data) => {
  try {
    let updateStatusData = { status: 'kyc_data_approved', stage: 1 };
    const updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
      updateStatusData,
      data.loan_id,
    );
    const updateLeadStatus = await LoanRequestSchema.updateStatus(
      [data],
      'kyc_data_approved',
    );
    if (!updateLoanStatus)
      throw {
        success: false,
        message: 'Failed to update loan status to kyc_data_approved',
      };
    return updateLoanStatus;
  } catch (error) {
    return error;
  }
};

const updateStatusToCreditApproved = async (req, data) => {
  try {
    let updateStatusData = { status: 'credit_approved', stage: 2 };

    if (data.co_lend_flag === 'Y') {
      updateStatusData = {
        status: 'co_lender_approval_pending',
        stage: 211,
        co_lender_assignment_id: req.body.co_lender_assignment_id,
      };
    }

    const updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
      updateStatusData,
      data.loan_id,
    );
    const updateLeadStatus = await LoanRequestSchema.updateStatus(
      [data],
      updateStatusData.status,
    );
    if (!updateLoanStatus)
      throw {
        success: false,
        message: 'Failed to update loan status to credit_approved',
      };
    return updateLoanStatus;
  } catch (error) {
    return error;
  }
};

const loanCreditAndDebitTransactions = async (data, req) => {
  try {
    const loanState = await LoanStateSchema.getByLoanIds([data.loan_id]);
    let debitSum = 0;
    let creditSum = 0;
    // Make sum of all debit entries from loan transactions against loan id
    const loanTxnRecords = await LoanTransactionSchema.findByLID(data.loan_id);
    loanTxnRecords.forEach(async (row, index) => {
      if (row.txn_entry === 'dr') {
        debitSum += parseFloat(row.txn_amount);
      }
      if (row.txn_entry === 'cr' && row.is_received === 'Y') {
        creditSum += parseFloat(row.txn_amount);
      }
    });
    debitSum = Math.round((debitSum * 1 + Number.EPSILON) * 100) / 100;
    creditSum = Math.round((creditSum * 1 + Number.EPSILON) * 100) / 100;
    let expectedRepayAmount =
      parseFloat(data.net_disbur_amt) + parseFloat(data.processing_fees_amt);
    expectedRepayAmount =
      Math.round((expectedRepayAmount * 1 + Number.EPSILON) * 100) / 100;
    // Check in product whether advance_emi flag is on
    // Check the value recorded in borrower info for advance emi
    let advanceEmi = req.product.advance_emi
      ? data.advance_emi * 1 > 0
        ? data.advance_emi * 1
        : 0
      : 0;
    advanceEmi = Math.round((advanceEmi * 1 + Number.EPSILON) * 100) / 100;

    let withHeldAmount = parseFloat(data?.withheld_amt || 0);
    withHeldAmount =
      Math.round((withHeldAmount * 1 + Number.EPSILON) * 100) / 100;

    let upfrontInterest = parseFloat(data?.upfront_interest || 0);
    upfrontInterest =
      Math.round((upfrontInterest * 1 + Number.EPSILON) * 100) / 100;

    let creditAmountToReceived =
      loanState[0].prin_os * 1 +
      loanState[0].int_accrual * 1 -
      advanceEmi -
      withHeldAmount -
      upfrontInterest;
    creditAmountToReceived =
      Math.round((creditAmountToReceived * 1 + Number.EPSILON) * 100) / 100;

    if (creditSum < creditAmountToReceived)
      return {
        success: false,
        message:
          'repayment sum not matching with criteria. Kindly contact administrator.',
      };
    if (creditSum > creditAmountToReceived) {
      const shorOrExcessData = {
        loan_id: data.loan_id,
        company_id: data.company_id,
        product_id: data.product_id,
        amount: getEPSILON(creditSum * 1 - creditAmountToReceived * 1),
        closed_date: moment(),
        created_by: req.user.username,
        updated_by: req.user.username,
      };
      shortOrexcessSchema.addNew(shorOrExcessData);
    }
    //We must ensure that sanctioned amount has been returned (sanctioned amount = net disbursement amount + processing fees)
    // if (creditSum !== expectedRepayAmount)
    //   return {success: false, message: "Expected repayment amount mismatch."};
    return { success: true };
  } catch (error) {}
};

const handleLoanRejection = async (req, borrowerResp, data) => {
  try {
    // Validate current stage of the loan.
    if (req.product.allow_loc) {
      if (
        borrowerResp.stage > 0 &&
        borrowerResp.stage != 901 &&
        borrowerResp.stage != 906
      )
        throw {
          success: false,
          message: `Unable to reject the line as line is in ${borrowerResp.status}.`,
        };
    } else {
      if (
        borrowerResp.stage > 2 &&
        borrowerResp.stage != 901 &&
        borrowerResp.stage != 906
      )
        throw {
          success: false,
          message: `Unable to reject the loan as loan is in ${borrowerResp.status}.`,
        };
    }
    const thirdPartyLoanStatusUpdate =
      await thirdPartyHelper.thirdPartyUpdateLoanStatus(req, data);

    if (!thirdPartyLoanStatusUpdate.success) {
      return thirdPartyLoanStatusUpdate.data;
    }
    //Update data in loanrequest table.
    leadUpdateObj = {
      is_deleted: 1,
      delete_date_timestamp: Date.now(),
      deleted_by: req.user._id,
      status: 'rejected',
      loan_status: 'rejected',
      lead_status: 'rejected',
      reason: data.reason,
      remarks: data.remarks,
      updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      partner_loan_app_id: `${
        borrowerResp.partner_loan_app_id
      }-D${moment().format('DDMMYYYYHHMMSS')}`,
    };

    const updateLeadData = await LoanRequestSchema.updateLeadStatus(
      data.loan_app_id,
      leadUpdateObj,
    );
    if (!updateLeadData)
      throw { success: false, message: 'Error while updating lead status.' };
    //Update data in borrowerinfo common table.
    loanUpdateObj = {
      status: 'rejected',
      stage: loanedits.mappingStages['rejected'],
      rejection_date_time: Date.now(),
      rejected_by: req.user.email,
      updated_by: req.user.email,
      reason: data?.reason,
      remarks: data?.remarks,
      updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      partner_loan_app_id: `${
        borrowerResp.partner_loan_app_id
      }-D${moment().format('DDMMYYYYHHMMSS')}`,
    };

    const updateLoanData = await BorrowerinfoCommon.updateLoanStatus(
      loanUpdateObj,
      data.loan_id,
    );
    if (!updateLoanData)
      throw { success: false, message: 'Error while updating loan status.' };
    //Record loan status change logs
    const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
      req,
      data.loan_id,
      borrowerResp.status,
      data.status,
      req.authData.type,
    );
    if (!maintainStatusLogs.success) throw maintainStatusLogs;
    return {
      success: true,
      message: `Loan status updated to ${data.status} successfully.`,
      updateResp: updateLoanData,
    };
  } catch (error) {
    return error;
  }
};

const pennyDropStatus = async (BICData) => {
  let pennyDropName = "Penny drop failed"
  let nameMatchScore = undefined
  try {
    const BICRecord = await BorrowerinfoCommon.findByLId(BICData.loan_app_id);
    const payload = {
      ifsc: BICRecord.bene_bank_ifsc,
      account_number: BICRecord.bene_bank_acc_num,
      loan_app_id: BICRecord.loan_app_id,
    };
    const responsePD = await axios.post(
      `${
        process.env.SERVICE_MS_URL + process.env.SERVICE_MASTER_BANK_PENNY_URL
      }`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.SERVICE_MS_TOKEN,
        },
      },
    );
    if (!responsePD)
      throw {
        success: false,
        message:
          'System is not able to perform Penny drop at the moment, please try again after sometime.',
      };
    pennyDropName = responsePD.data?.data?.result?.accountName;
    if (!responsePD.data.success)
      throw {
        success: false,
        message:
          'Penny drop failed, please check & update the beneficiary details and try again.',
      };
    //Call name match API on successfull penny drop
    let nameToPass = BICRecord.bene_bank_account_holder_name;
    let nameMatchResult = await axios.post(
      `${process.env.SERVICE_MS_URL + process.env.NAME_URL}`,
      {
        input_name: nameToPass === ' ' ? '' : nameToPass,
        kyc_name: responsePD.data.data.result.accountName,
        type: 'individual',
        loan_app_id : BICRecord.loan_app_id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.SERVICE_MS_TOKEN,
        },
      },
    );
    if (!nameMatchResult)
      throw {
        success: false,
        message:
          'System is not able to perform Penny drop at the moment, please try again after sometime.',
      };
    nameMatchScore = nameMatchResult.data.data.result.score * 1
    if (nameMatchResult.data.data.result.score * 1 < 0.6)
      throw {
        success: false,
        message:
          'Penny drop failed, please check & update the beneficiary details and try again.’',
      };
    return {
      success: true,
      message: 'Name matched successfully',
      penny_drop_result : pennyDropName,
      name_match_result : nameMatchScore
    };
  } catch (error) {
    return {
      success: false,
      message:
        'Penny drop failed, please check & update the beneficiary details and try again.',
      penny_drop_result : pennyDropName,
      name_match_result : nameMatchScore
    };
  }
};

const isCoLending = (co_lenders,loan) => {
  if (!loan.co_lend_flag || loan.co_lend_flag !== 'Y') {
    return false;
  }
  const assignedCoLender = co_lenders
    .find(lender => lender.co_lender_id === loan.co_lender_id)?.co_lender_shortcode;
  const nonCoLenders = JSON.parse(process.env.NON_COLENDER_NAMES);
  return !nonCoLenders.includes(assignedCoLender);
}

module.exports = {
  updateStatus,
  updateStatusToKycDataApproved,
  updateStatusToCreditApproved,
  pennyDropStatus,
};

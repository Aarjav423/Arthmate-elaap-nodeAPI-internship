const {
  findOneWithKLID,
  findProductId,
  getCompanyById,
  findByColenderId,
  getDisburseChannel,
  findDisbursementChannelMasterByTitle,
  updateLoanStatus: loanStatusUpdate,
  addDisbursementLedger,
} = require('../disbursement/helper');
const { recordStatusLogs } = require('./utils');
const { disbursementType } = require('./constant');
const moment = require('moment');
const axios = require('axios');

const disbursedLoan = async (loanId, data, type) => {
  try {
    //check if loan Id exists
    let {
      loanData,
      productData,
      companyData,
      disbursementChannel,
      disbursementChannelMaster,
      net_disbur_amt,
    } = data;
    if (!loanData) {
      loanData = await findOneWithKLID(loanId);
    }
    if (!productData) {
      let { product_id } = loanData;
      productData = await findProductId(product_id);
    }
    if (!companyData) {
      let { company_id } = loanData;
      companyData = await getCompanyById(company_id);
    }
    if (!disbursementChannel) {
      let { co_lender_id, product_id, company_id } = loanData;
      if (co_lender_id) {
        disbursementChannel = await findByColenderId(co_lender_id);
      } else {
        disbursementChannel = await getDisburseChannel({
          company_id,
          product_id,
        });
      }
    }
    if (!disbursementChannelMaster) {
      disbursementChannelMaster = await findDisbursementChannelMasterByTitle(
        disbursementChannel.disburse_channel,
      );
    }
    //Create a unique Loan ID for multitranches and cash collateral product
    let newLoanId = loanId;
    if (
      productData.cash_collateral &&
      type &&
      type == disbursementType.CASHCOLLATERAL
    ) {
      newLoanId = `${loanId.substr(loanId.length - 11)}W${moment().unix()}`;
    }

    let reqData = {
      loan_id: newLoanId,
      loan_app_id: loanData.loan_app_id,
      partner_loan_id: loanData.partner_loan_id,
      partner_borrower_id: loanData.partner_borrower_id,
      borrower_id: loanData.borrower_id,
      sanction_amount: loanData.sanction_amount,
      net_disbur_amt: net_disbur_amt,
      product_id: productData._id,
      company_name: companyData.name,
      code: companyData.code,
      company_id: companyData._id,
      txn_id: `${loanId}${new Date().getTime()}`,
      txn_date: moment(Date.now()).format('YYYY-MM-DD'),
      disburse_channel: disbursementChannelMaster.title,
      amount: net_disbur_amt,
      debit_account_no: disbursementChannel.debit_account,
      debit_ifsc: disbursementChannel.debit_account_ifsc,
      debit_trn_remarks: loanId,
      beneficiary_ifsc: loanData.bene_bank_ifsc,
      beneficiary_account_no: loanData.bene_bank_acc_num,
      beneficiary_name: loanData.bene_bank_account_holder_name,
      mode_of_pay: 'PA',
      webhook_link: process.env.WIREOUT_URL,
      access_token: process.env.WIREOUT_SECRET,
      label_type:
        type == disbursementType.CASHCOLLATERAL
          ? disbursementType.CASHCOLLATERAL
          : null,
    };
    const config = {
      method: 'post',
      url: disbursementChannelMaster.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${disbursementChannelMaster.secret_key}`,
      },
      data: reqData,
    };
    const disbursementResponse = await axios(config);
    return {
      disbursementResponse,
      reqData,
      channelName: disbursementChannelMaster.title,
    };
  } catch (error) {
    throw error;
  }
};

//handleLoanAfterDisbursement
const handleLoanAfterDisbursement = async (
  loanId,
  userData,
  company,
  product,
  existingStatus,
  loanData,
  channelName,
  disbursmentRequestData,
  disbursmentResponseData,
  isFirstRequest,
  type,
) => {
  //after response from bank disbursement api make the loan status as disbursement_initiated

  try {
    let data = {};
    if (isFirstRequest) {
      (data.status = 'disbursement_initiated'), (data.stage = '32');
    }
    await loanStatusUpdate(data, loanId);
    //Record loan status change logs
    if (isFirstRequest) {
      const maintainStatusLogs = await recordStatusLogs(
        userData,
        company,
        disbursmentRequestData.loan_id,
        existingStatus,
        'disbursement_initiated',
        type === 'service' ? 'system' : type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
    }
    //Make debit entry in  disbursement_and_topup schema
    const disbursementDebitData = {
      company_id: company._id,
      product_id: product._id,
      disbursement_channel: channelName,
      txn_id: disbursmentResponseData.txn_id,
      amount: disbursmentRequestData.net_disbur_amt,
      request_id: disbursmentRequestData.loan_id,
      loan_id: loanId,
      borrower_id: disbursmentRequestData.borrower_id,
      partner_loan_id: disbursmentRequestData.partner_loan_id,
      partner_borrower_id: disbursmentRequestData.partner_borrower_id,
      txn_date:disbursmentResponseData.data && disbursmentResponseData.data.created_date?disbursmentResponseData.data.created_date:moment(Date.now()).format('YYYY-MM-DD'),
      bank_name: loanData.bene_bank_account_holder_name,
      bank_account_no: loanData.bene_bank_acc_num,
      bank_ifsc_code: loanData.bene_bank_ifsc,
      borrower_mobile: disbursmentRequestData.borrower_mobile,
      txn_entry: 'dr',
      txn_stage: '',
      label: 'witheld',
      label_type: disbursmentRequestData.label_type,
      disburse_for_loc_request_id: disbursmentRequestData.loc_drawdown_request_id,
      disburse_for_loc_usage_id:disbursmentRequestData.loc_drawdown_usage_id,

    };

    if (
      !disbursmentRequestData.label_type ||
      disbursmentRequestData.label_type === ''
    )
      disbursementDebitData['label_type'] = disbursementType.CASHCOLLATERAL;

    await addDisbursementLedger(disbursementDebitData);
    return true;
  } catch (err) {
    console.log(err);
    err.message = 'Error occured after disbursment of Loan';
    throw err;
  }
};

module.exports = {
  disbursedLoan,
  handleLoanAfterDisbursement,
};

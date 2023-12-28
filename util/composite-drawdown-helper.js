const DisbursementChannelConfig = require('../models/disbursement-channel-config-schema');
const DisbursementChannelMasterScehema = require('../models/disbursement-channel-master-schema.js');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema');
const axios = require('axios');

const callBankWireout = async (req, res, next) => {
  try {
    const disbAndTopupId = req.disbursementLedgerData
      ? req.disbursementLedgerData._id
      : '';
    const req_loan_id = `${req.loanData.loan_id.substr(
      req.body.loan_id.length - 11,
    )}D${disbAndTopupId}`;
    const drawdownData = {
      loan_app_id: req.body.loan_app_id,
      loan_id: req_loan_id,
      borrower_id: req.body.borrower_id,
      partner_loan_app_id: req.body.partner_loan_app_id,
      partner_loan_id: req.body.partner_loan_id,
      partner_borrower_id: req.body.partner_borrower_id,
      borrower_mobile: req.body.borrower_mobile,
      txn_date: req.body.drawadown_request_date,
      product_id: req.product._id,
      company_name: req.company.name,
      code: req.company.code,
      company_id: req.company._id,
      txn_id: req?.disbursementLedgerData?.txn_id,
      disburse_channel: req.disbursementChannelMaster.title,
      amount: req.net_drawdown_amount,
      debit_account_no: req.disbursementChannel.debit_account,
      debit_ifsc: req.disbursementChannel.debit_account_ifsc,
      debit_trn_remarks: req.body.loan_id,
      beneficiary_ifsc: req.loanData.bene_bank_ifsc,
      beneficiary_account_no: req.loanData.bene_bank_acc_num,
      beneficiary_name: req.loanData.bene_bank_account_holder_name,
      mode_of_pay: 'PA',
      webhook_link: process.env.WIREOUT_URL,
      access_token: process.env.WIREOUT_SECRET,
    };

    const config = {
      method: 'post',
      url: req.disbursementChannelMaster.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${req.disbursementChannelMaster.secret_key}`,
      },
      data: drawdownData,
    };
    const disbursementResponse = await axios(config);
    if (!disbursementResponse.data)
      throw {
        success: false,
        message: 'Error while calling bank disbursement api.',
      };
    if (disbursementResponse.data) {
      req.disbursementResponse = disbursementResponse.data;
      next();
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(400).send({
        success: false,
        message: 'Service unavailable. Please try again later.',
      });
    }
    return res.status(400).send(err);
  }
};

module.exports = {
  callBankWireout,
};

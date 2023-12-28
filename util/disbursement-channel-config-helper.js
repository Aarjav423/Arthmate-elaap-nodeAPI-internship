const DisbursementChannelConfig = require('../models/disbursement-channel-config-schema');
const DisbursementChannelMasterScehema = require('../models/disbursement-channel-master-schema.js');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');

const checkDisbursementChannelConfig = async (req, res, next) => {
  try {
    //Check whether the disbursement channel is configured
    const disbursementChannel =
      await DisbursementChannelConfig.getDisburseChannel({
        company_id: req.company._id,
        product_id: req.product._id,
      });
    if (!disbursementChannel)
      throw {
        success: false,
        message: `Disburse channel is not configured for ${req.company.name} `,
      };
    req.disbursementChannel = disbursementChannel;
    const disbursementChannelMaster =
      await DisbursementChannelMasterScehema.findOneByTitle(
        disbursementChannel.disburse_channel,
      );
    if (!disbursementChannelMaster)
      throw {
        success: false,
        message: `Global disbursement channel not found`,
      };
    if (!disbursementChannelMaster.status)
      throw {
        success: false,
        message: `Global disbursement channel is not active, kindly contact system administrator.`,
      };
    req.disbursementChannelMaster = disbursementChannelMaster;
    if (!disbursementChannel)
      throw {
        success: false,
        message: `Product don't have this channel configured , kindly contact system administrator.`,
      };
    if (disbursementChannel.status === '0')
      throw {
        success: false,
        message: `Disburse channel config for this product is not active, kindly contact system administrator.`,
      };
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const checkDisbursementChannelBalance = async (
  company_id,
  product_id,
  disbursement_channel,
) => {
  try {
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    const channelTransactions = await DisbursementLedgerSchema.findByCondition({
      company_id,
      product_id,
      disbursement_channel,
    });
    channelTransactions.forEach((row, index) => {
      if (row.txn_entry.toLowerCase() == 'dr' && row.txn_stage === '1') {
        totalDebitAmount += parseFloat(row.amount ? row.amount : 0);
      }
      if (row.txn_entry.toLowerCase() == 'cr') {
        totalCreditAmount += parseFloat(row.amount ? row.amount : 0);
      }
    });
    const availableBalance = totalCreditAmount - totalDebitAmount;
    return availableBalance;
  } catch (error) {
    return error;
  }
};

const checkWalletBalance = async (req, res, next) => {
  try {
    // walletCheck
    if (req.disbursementChannel.wallet_config_check === '1') {
      const availableChannelBalance = await checkDisbursementChannelBalance(
        req.company._id,
        req.product._id,
        req.disbursementChannelMaster.title,
      );
      if (
        parseFloat(availableChannelBalance) <
        parseFloat(req.net_drawdown_amount)
      ) {
        throw {
          success: false,
          message: 'Insufficient balance, kindly top up disbursement channel',
        };
      }
    }
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const recordDisbursementLedger = async (req, res, next) => {
  try {
    //Make debit entry in  disbursement_and_topup schema
    const disbursementDebitData = {
      company_id: req.company._id,
      product_id: req.product._id,
      disbursement_channel: req.disbursementChannelMaster.title,
      txn_id: req.disbursementResponse
        ? req.disbursementResponse.txn_id
        : `${req.body.loan_id}${new Date().getTime()}`,
      amount: req.net_drawdown_amount,
      loan_id: req.body.loan_id,
      borrower_id: req.body.borrower_id,
      partner_loan_id: req.body.partner_loan_id,
      partner_borrower_id: req.body.partner_borrower_id,
      txn_date: req.body.drawadown_request_date,
      bank_name: req.loanData.bene_bank_account_holder_name,
      bank_account_no: req.loanData.bene_bank_acc_num,
      bank_ifsc_code: req.loanData.bene_bank_ifsc,
      borrower_mobile: req.body.borrower_mobile,
      txn_entry: 'dr',
      txn_stage: '',
      upfront_interest: req.upfront_interest,
      rearended_interest: req.rearended_interest,
      processing_fees: req.processing_fees,
      label_type: req.body.label_type,
    };
    const recordDebitData = await DisbursementLedgerSchema.addNew(
      disbursementDebitData,
    );
    req.disbursementLedgerData = recordDebitData;
    next();
  } catch (error) {
    console.log('recordDisbursementLedger error', error);
    return res.status(400).send(error);
  }
};
module.exports = {
  checkDisbursementChannelConfig,
  checkWalletBalance,
  recordDisbursementLedger,
};

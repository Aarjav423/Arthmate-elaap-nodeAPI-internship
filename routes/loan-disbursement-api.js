bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const DisbursementChannelSchema = require('../models/disbursement-channel-config-schema.js');
const calculation = require('../util/calculation.js');
const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  // check loan transaction balance api
  app.post(
    '/api/check_balance',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const data = req.body;
        const RespBorro = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (!RespBorro)
          throw {
            success: false,
            message: 'This loan id do not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            success: false,
            message: 'This loan id is not associated with selected company',
          };
        const sanctionAmount = parseFloat(RespBorro.sanction_amount);
        let totalUsageAmount = 0;
        let totalRepayAmount = 0;
        const loanTransactions =
          await LoanTransactionSchema.getAllByLoanBorrowerId(
            RespBorro.borrower_id,
            data.loan_id,
          );
        loanTransactions.forEach((row, index) => {
          if (row.txn_entry === 'dr') {
            totalUsageAmount += parseFloat(row.txn_amount);
          }
          if (row.txn_entry === 'cr') {
            totalRepayAmount += parseFloat(row.txn_amount);
          }
        });
        const availableBalance =
          sanctionAmount - (totalUsageAmount - totalRepayAmount);
        return res.status(200).send({
          success: true,
          sanction_amount: sanctionAmount,
          usageAmount: totalUsageAmount,
          repaymentAmount: totalRepayAmount,
          availableBalance,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/disbursement',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const data = req.body;
        const RespBorro = await BorrowerinfoCommon.findOneWithKLID(
          data.loan_id,
        );
        if (!RespBorro)
          throw {
            success: false,
            message: 'This loan id do not exist',
          };
        if (req.company._id !== RespBorro.company_id)
          throw {
            success: false,
            message: 'This loan id is not associated with selected company',
          };
        if (RespBorro.status !== 'disbursal_approved') {
          throw {
            message: `For loan disbursement loan status should be  disbursal_approved currently loan is in ${RespBorro.status} status`,
          };
        }
        const disbursementChannel =
          await DisbursementChannelSchema.findByCompanyAndProductId(
            req.company._id,
            req.product._id,
          );
        if (!disbursementChannel.length)
          throw {
            message: `Disburse channel is not configured against ${req.company.name} `,
          };
        // const disburseChannel = disbursementChannel[0].disburse_channel;
        // const walletData = {
        //   company_id: req.company._id,
        //   company_code: req.company.code,
        //   product_id: req.product._id,
        //   lender_id: req.lender._id,
        //   user_id: req.user._id,
        //   disbursement_channel: disburseChannel,
        // };
        // const walletBalance = await calculation.checkWalletBalance(walletData);
        // if (!walletBalance.success) throw walletBalance;
        const appliedAmount = parseFloat(RespBorro.applied_amount);
        const sanctionAmount = parseFloat(RespBorro.sanction_amount);
        if (!sanctionAmount)
          throw {
            message: `loan is not sanctioned for ${data.loan_id}`,
          };
        if (sanctionAmount > appliedAmount)
          throw {
            message: 'sanction amount should be less than applied amount ',
          };
        const disburseResult = await BorrowerinfoCommon.updateLoanStatus(
          {
            status: 'disbursed',
            stage: 4,
          },
          data.loan_id,
        );
        if (!disburseResult)
          throw {
            success: false,
            message: 'Error while disbursing loan',
          };
        return res.status(200).send({
          success: true,
          message: `loan disbursed successfully for ${data.loan_id} `,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema.js');
const LoanStateSchema = require('../models/loan-state-schema.js');
const PayoutDetails = require('../models/payout-detail-schema.js');
const adjustExcessAmount = async (loanId, amountToAdjust, dataArray) => {
  let remainingAmount = amountToAdjust;
  const adjustedArray = [];
  for (let i = 0; i < dataArray.length; i++) {
    const currentAmount = dataArray[i].amount;
    const adjustedObj = { adjusted_amount: 0, fullyAdjusted: false};
    if (currentAmount <= remainingAmount) {
      adjustedObj.adjusted_amount = currentAmount;
      adjustedObj.fullyAdjusted = true;
      remainingAmount -= currentAmount;
      adjustedObj.remainingAmount=currentAmount-adjustedObj.adjusted_amount       
    } else {
      adjustedObj.adjusted_amount = remainingAmount;
      adjustedObj.remainingAmount = currentAmount - remainingAmount;
      remainingAmount = 0;
    }
    let ledgerData = {
      ...adjustedObj,
      ...dataArray[i],
    };
    adjustedArray.push(ledgerData);
    if (ledgerData.adjusted_amount > 0) {
      if (ledgerData.ledger_type == 'excess_ledger') {
        //update excess_ledger
        await LoanStateSchema.updateOne(
          { loan_id: loanId, _id: ledgerData._id },
          {
            excess_payment_ledger: {
              txn_amount: parseFloat(ledgerData.remainingAmount).toFixed(2),
              utr_number: ledgerData.utr_number,
              utr_date_time_stamp: ledgerData.utr_date,
            },
          },
        );
      } else if (ledgerData.ledger_type == 'transaction_ledger') {
        await LoanStateSchema.updateOne(
          { loan_id: loanId },
          {
            excess_payment_ledger: {
              txn_amount: parseFloat(ledgerData.remainingAmount).toFixed(2),
              utr_number: ledgerData.utr_number,
              utr_date_time_stamp: ledgerData.utr_date,
            },
          },
        );
        await LoanTransactionLedgerSchema.updateOne({ loan_id: loanId, label: 'repayment', is_received: 'Y', $or: [{ processed: 'null' }, { processed: null }], _id: ledgerData._id }, { processed: 'Y' });
      }
    }
  }
  return adjustedArray;
};

const checkExcessRefundInProgress = async (req, res, next) => {
  try {
    if (!req.body.loan_id) {
      throw {
        success: false,
        message: 'Error please provide a loanId',
      };
    }
    let excessData = (await PayoutDetails.find({ loan_id: req.body.loan_id, type: 'excess_refund', status: 'In_Progress' })) || [];
    if (excessData.length > 0) {
      throw {
        success: false,
        message: 'Excess Refund for the provided loanId has already existing refund request in Progress',
      };
    }
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const revertExcessAmount = async (paymentDetails = [],loanId) => {
  try {
    paymentDetails.map(async(data) => {
      let { adjusted_amount } = data;
      if (adjusted_amount >= 0) {
        if (data.ledger_type == 'excess_ledger') {  
          //update here
          await LoanStateSchema.updateOne(
            { loan_id: loanId, _id: data._id },
            {
              excess_payment_ledger: {
                txn_amount: parseFloat(data.amount).toFixed(2),
                utr_number: data.utr_number,
                utr_date_time_stamp: data.utr_date,
              },
            },
          );
        } else if (data.ledger_type == 'transaction_ledger') {
          await LoanTransactionLedgerSchema.updateOne({ loan_id: loanId, label: 'repayment', is_received: 'Y', processed:"Y", _id: data._id }, { processed: null });
        }
      }
    });
  } catch (err) {}
};

module.exports = {
  adjustExcessAmount,
  checkExcessRefundInProgress,
  revertExcessAmount,
};

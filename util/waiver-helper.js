const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');

const waiverTransaction = async (data) => {
  try {
    // Record data in loan transaction ledger
    const recordWaiverTransaction = await LoanTransactionSchema.addInBulk(data);
    return recordWaiverTransaction;
  } catch (error) {
    return error;
  }
};

module.exports = {
  waiverTransaction,
};

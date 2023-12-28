const {
  addNewStatusLogs,
  findBICByCondition,
  findDisbursementLedgerByCondition,
} = require('./helper');
const recordStatusLogs = async (
  user,
  company,
  loan_id,
  old_status,
  new_status,
  userType,
) => {
  try {
    let userEmail = '';
    if (userType === 'system') {
      userEmail = userType;
    } else if (userType === 'dash-api' || userType === 'dash') {
      userEmail = user?.email;
    } else if (userType === 'api') {
      userEmail = company?.name;
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
      const loanExist = await findBICByCondition({
        loan_id,
      });
      statusLogsObj.old_status = loanExist.status;
      statusLogsObj.loan_id = loanExist.loan_id;
      statusLogsObj.old_status = loanExist.status;
    }
    //Record loan status logs.
    const recordLoanStatusLogs = await addNewStatusLogs(statusLogsObj);
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

const checkDisbursementChannelBalance = async (
  company_id,
  product_id,
  disbursement_channel,
) => {
  let totalDebitAmount = 0;
  let totalCreditAmount = 0;
  const channelTransactions = await findDisbursementLedgerByCondition({
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
};

module.exports = {
  recordStatusLogs,
  checkDisbursementChannelBalance,
};

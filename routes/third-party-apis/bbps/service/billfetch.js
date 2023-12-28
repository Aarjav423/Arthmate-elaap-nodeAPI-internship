let dbDetails = require("../db/db-query");
let { success, fail } = require("../helpers/response");

//Initiate bill
module.exports.billFetch = async (loan_id) => {
  try {
    let todayDate = new Date();
    let totalDueAmount = "";

    if (!loan_id) {
      throw { message: "Invalid data, please provide loan id", code: 404 }
    }
    const _productIDsArray = JSON.parse(process.env.PRODUCT_IDS_TO_EXCLUDE);
    let loanDetails = await dbDetails.borrowerInfoDetail(loan_id,_productIDsArray);
    if (!loanDetails) {
      throw { message: "Bill cannnot be fetched, loan id does not exist", code: 404 }
    }
    let repInstallmentDetails = await dbDetails.findIfInstallmentsExist(loan_id);
    if (!repInstallmentDetails) {
      throw { message: "Bill cannnot be fetched, repayment installments does not exist", code: 400 }
    }

    let loanTransactionAmount = await dbDetails.loanTransactionDetail(loan_id);
    let fifthDay = new Date();
    fifthDay = new Date(fifthDay.setDate(todayDate.getDate() + 5));
    let nextRepaymentInstallments = await dbDetails.nextRepaymentDetail(loan_id, todayDate, fifthDay);

    let nextDueDate = nextRepaymentInstallments?.due_date;
    let installmentAmount = parseFloat(nextRepaymentInstallments?.emi_amount);
    if (!installmentAmount || isNaN(installmentAmount)) {
      installmentAmount = 0;
    }
    let loanStateDetails = await dbDetails.loanDetail(loan_id);
    let chargeDetails = await dbDetails.chargeDetail(loan_id);
    // Loan State overdue amount
    let interestDue = loanStateDetails?.current_int_due
    let principalDue = loanStateDetails?.current_prin_due
    let lpiDue = loanStateDetails?.current_lpi_due
    if (!interestDue || isNaN(interestDue)) {
      interestDue = 0;
    }

    if (!principalDue || isNaN(principalDue)) {
      principalDue = 0;
    }
    if (!lpiDue || isNaN(lpiDue)) {
      lpiDue = 0;
    }

    if (!loanStateDetails?.excess_payment_ledger?.txn_amount) {
      loanStateDetails.excess_payment_ledger = loanStateDetails.excess_payment_ledger || {};
      loanStateDetails.excess_payment_ledger.txn_amount = 0;
    }
    if (!loanTransactionAmount) {
      loanTransactionAmount = 0;
    }

    //Excess payment amount
    let excessPayment = parseFloat(loanStateDetails?.excess_payment_ledger?.txn_amount) + parseFloat(loanTransactionAmount);
    if (!excessPayment || isNaN(excessPayment)) {
      excessPayment = 0;
    }
    //Total charge excluding foreclosure
    if (!chargeDetails?.charge_amount) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.charge_amount = 0;
    }
    if (!chargeDetails?.gst) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.gst = 0;
    }
    if (!chargeDetails?.total_amount_paid) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.total_amount_paid =  0;
    }
    if (!chargeDetails?.total_amount_waived) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.total_amount_waived = 0;
    }
    if (!chargeDetails?.total_gst_reversed) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.total_gst_reversed = 0;
    }
    if (!chargeDetails?.total_gst_paid) {
      chargeDetails = chargeDetails ?? {};
      chargeDetails.total_gst_paid = 0;
    }

    let chargeAmount = parseFloat(chargeDetails?.charge_amount) + parseFloat(chargeDetails?.gst) - parseFloat(chargeDetails?.total_amount_paid) - parseFloat(chargeDetails?.total_amount_waived) - parseFloat(chargeDetails?.total_gst_reversed) - parseFloat(chargeDetails?.total_gst_paid);
    if (!chargeAmount || isNaN(chargeAmount)) {
      chargeAmount = 0;
    }
    //Bill due date
    let dueDate = "";

    if (loanStateDetails?.status?.toLowerCase() === "due") {
      dueDate = await dbDetails.firstDueDate(loan_id);
      if (!dueDate) throw {
        code: 400,
        message: "Cannot fetch bill as due date does not exist"
      }
    }
    else {
      nextInstallmentDate = nextDueDate;

      let nextInstallmentDiffInMilliseconds = Math.abs(nextInstallmentDate - todayDate);
      let diffInDays = parseInt(nextInstallmentDiffInMilliseconds / (1000 * 60 * 60 * 24));
      if (diffInDays <= 5 || diffInDays === 0) {
        dueDate = nextInstallmentDate
      }
      else {
        dueDate = await dbDetails.prevRepInstallmentDate(loan_id, todayDate);
        if (!dueDate) throw {
          code: 400,
          message: "Bill cannot be fetched, as due date is in future date"
        }
      }
    }
    if (!dueDate) throw {
      code: 400,
      message: "Due date is not available"
    }
    let totalDueAmountSum = parseFloat(interestDue) + parseFloat(principalDue) + parseFloat(lpiDue) + parseFloat(installmentAmount) + parseFloat(chargeAmount) - parseFloat(excessPayment);
    totalDueAmount = parseFloat(totalDueAmountSum.toFixed(2));

    if (totalDueAmount < 0 || isNaN(totalDueAmount)) {
      totalDueAmount = 0;
    }
    let dateInISO8601 = todayDate

    dateInISO8601.setHours(dateInISO8601.getHours() + 5);
    dateInISO8601.setMinutes(dateInISO8601.getMinutes() + 30);
    dateInISO8601 = dateInISO8601.toISOString();
    let dbLoggingData = {
      loan_id: loan_id,
      partner_loan_id: loanDetails?.partner_loan_id,
      customer_name: loanDetails?.first_name + " " + loanDetails?.last_name,
      timestamp: dateInISO8601.replace('Z', ' GMT+5:30'),
      biller_txn_reference_id: `${loan_id}-${Date.now()}`,
      due_date: new Date(dueDate).toISOString().replace('Z', ' GMT+5:30'),
      amount: totalDueAmount,
      status: "success",
      created_at: new Date(),
      updated_at: new Date(),
    };

    await dbDetails.insertIntoDb(dbLoggingData);
    delete dbLoggingData._id;
    delete dbLoggingData.created_at;
    delete dbLoggingData.updated_at;
    return success(200, {
      ...dbLoggingData
    });
  }
  catch (error) {
    console.error("Error occurs during bill fetch: ", error);
    if (error.code) {
      let _custom4xxErr = {
        message: error.message,
        response_code: error.code,
        response_reason: "fail"
      }
      return fail(error.code, _custom4xxErr);
    }
    else {
      let _custom5xxErr = {
        message: "Please contact the administrator",
        response_code: 500,
        response_reason: "fail"
      }
      return fail(500, _custom5xxErr);
    }
  }
}

//Save bill payment details
module.exports.billPayment = async (event) => {
  let approval_ref_num = Array.from(Array(10), () => Math.floor(Math.random() * 36).toString(36)).join('');
  try {
    let body = event.body;
    if (!body?.txn_reference_id) {
      throw {
        code: 400,
        message: "Invalid data, please provide txn reference id"
      }
    }

    if (!body?.biller_txn_reference_id) {
      throw {
        code: 400,
        message: "Invalid data, please provide biller txn reference id",
      };
    }

    let loanId = (await dbDetails.bbpsLoanDetail(body?.biller_txn_reference_id))?.loan_id;

    if (!loanId) {
      throw {
        code: 400,
        message: "Invalid data, please provide valid biller txn reference id",
      };
    }
    const _productIDsArray = JSON.parse(process.env.PRODUCT_IDS_TO_EXCLUDE);
    let loanStage = (await dbDetails.borrowerInfoDetail(loanId,_productIDsArray))?.stage;
    if (loanStage !== 4) {
      throw {
        code: 400,
        message: "Invalid data, please provide valid biller txn reference id",
      };
    }

    let istxnReferenceIdExist = await dbDetails.findTxnInDb(body?.txn_reference_id);
    if (istxnReferenceIdExist) {
      throw { message: "Invalid data, txn reference id already exist", code: 400 }
    }

    let utrTimestamp = body?.utr_timestamp;
    if (!utrTimestamp) {
      throw { message: "Invalid data, please provide utr_timestamp", code: 400 }
    }
    let currentDate = new Date().toISOString().split('T')[0];

    if (utrTimestamp.split('T')[0] > currentDate) {
      throw { message: "Invalid data, utr_timestamp cannot be of future date", code: 400 }
    }

    let amount = body?.payment_amount;
    if (!amount) {
      throw { message: "Invalid payment value", code: 400 }
    }

    let regex = /^[1-9]\d*(\.\d{1,2})?$|^0(\.\d{1,2})?$/;

    if (!regex.test(amount.toString())) {
      throw { message: "Invalid payment value", code: 400 }
    }

    let bbpsData = {
      payment_amount: body?.payment_amount,
      utr_timestamp: body?.utr_timestamp,
      txn_reference_id: body?.txn_reference_id,
      biller_txn_reference_id: body?.biller_txn_reference_id,
      payment_mode: body?.payment_mode,
      approval_ref_num: approval_ref_num,
      stage: 0,
      status: "success",
      updated_at: new Date(),
    };
    if (!body?.biller_txn_reference_id) {
      throw { message: "Invalid data, please provide biller txn reference id", code: 400 }
    }

    let isBillertxnReferenceIdExist = await dbDetails.findIfExist(body.biller_txn_reference_id)
    if (!isBillertxnReferenceIdExist) {
      throw {
        code: 400,
        message: "Transaction reference id not found"
      }
    }
    let updatePaymentData = await dbDetails.updatePaymentDb(body.biller_txn_reference_id, bbpsData)
    if (updatePaymentData.acknowledged === true) {
      return success(200, {
        approval_ref_num: approval_ref_num,
        response_code: 200,
        response_reason: "Successful",
      });
    }
    else {
      throw {
        message: "Internal Server Error"
      }
    }
  } catch (error) {
    console.error("Error occurs during bill payment: ", error);
    if (error.code) {
      let _custom4xxErr = {
        message: error.message,
        response_code: error.code,
        response_reason: "fail"
      }
      return fail(error.code, _custom4xxErr);
    }
    else {
      let _custom5xxErr = {
        message: "Please contact the administrator",
        response_code: 500,
        response_reason: "fail"
      }
      return fail(500, _custom5xxErr);
    }
  }
}

//Check bill status
module.exports.billStatus = async (txn_reference_id) => {
  try {
    if (!txn_reference_id) {
      throw {
        code: 404,
        message: "Transaction reference id should not be empty"
      };
    }
    // Fetch transaction data from the DB
    let transaction = await dbDetails.findTxnInDb(txn_reference_id);
    if (!transaction) {
      throw {
        code: 404,
        message: "Transaction reference id not found"
      }
    } else {
      return success(200, {
        approval_ref_num: transaction.approval_ref_num,
        response_code: 200,
        response_reason: "success",
      });
    }

  } catch (error) {
    console.error("Error occurs bill status check: ", error);
    if (error.code) {
      let _custom4xxErr = {
        message: error.message,
        response_code: error.code,
        response_reason: "fail"
      }
      return fail(error.code, _custom4xxErr);
    }
    else {
      let _custom5xxErr = {
        message: "Please contact the administrator",
        response_code: 500,
        response_reason: "fail"
      }
      return fail(500, _custom5xxErr);
    }
  }
}

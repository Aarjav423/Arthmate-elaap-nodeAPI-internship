const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const LoanState = require('../models/loan-state-schema.js');
const LoanStateAudit = require('../models/loan-state-audit-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const ChargesSchema = require('../models/charges-schema.js');
const moment = require('moment');
const { getEPSILON } = require('../util/math-ops');
const { getVal } = require('../util/calculation');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const findLoanExist = async (loan_id, req) => {
    try {
      // Check if loan id exist in borrower info common table
      const loanData = await BorrowerinfoCommon.findOneWithKLID(loan_id);
      if (!loanData)
        throw {
          success: false,
          message: 'No records found against provided loan id in borrowerinfo.',
        };
      // Validate company and product from token with borrower data
      if (loanData.company_id !== req.company._id)
        throw {
          success: false,
          message: 'company_id mismatch in authorization.',
        };
      if (loanData.product_id !== req.product._id)
        throw {
          success: false,
          message: 'product_id mismatch in authorization.',
        };
      return loanData;
    } catch (error) {
      return error;
    }
  };

  const prepareResponseData = async (
    loanData,
    loanStatesResp,
    loanStatesAuditResp,
    txnAmountSum,
    chargesData,
    chargesDataExcess,
  ) => {
    try {
      let reconSummaryData;
      let currentDueData;
      let totalPaidData;
      let installmentAndRepaymentData = [];
      let finalRespData = {};
      let totalDue =
        (loanStatesResp.current_lpi_due * 1 || 0) +
        (loanStatesResp.current_int_due * 1 || 0) +
        (loanStatesResp.current_prin_due * 1 || 0);
      let loanIds = [];
      Array.from(chargesData).map((item) => {
        loanIds.push(item.loan_id);
      });

      loanIds = [...new Set(loanIds)];
      let chargeValue =
        (((chargesDataExcess.chargeAmountExcess +
          chargesDataExcess.totalGSTExcess -
          chargesDataExcess.chargeAmountPaidExcess -
          chargesDataExcess.totalGSTPaidExcess) *
          1 +
          Number.EPSILON) *
          100) /
        100;
      let finalChargeValue =
        Math.round((chargeValue * 1 + Number.EPSILON) * 100) / 100;
      // Prepare Recon summary data

      reconSummaryData = {
        loan_id: loanData.loan_id,
        customer_name: `${loanData?.first_name} ${loanData?.last_name}`,
        prin_os: loanStatesResp.prin_os ? loanStatesResp.prin_os : 0,
        int_os: loanStatesResp.int_os ? loanStatesResp.int_os : 0,
        accrual_interest: loanStatesResp.int_accrual
          ? loanStatesResp.int_accrual
          : 0,
        dpd: loanStatesResp.dpd ? loanStatesResp.dpd : 0,
        excess_amount:
          Math.round(
            (((loanStatesResp.excess_payment_ledger?.txn_amount
              ? Number(loanStatesResp.excess_payment_ledger.txn_amount)
              : 0) +
              txnAmountSum -
              totalDue -
              finalChargeValue) *
              1 +
              Number.EPSILON) *
              100,
          ) / 100,
      };

      // Prepare Current Due data
      currentDueData = {
        principal_due: loanStatesResp.current_prin_due
          ? loanStatesResp.current_prin_due
          : 0,
        interest_due: loanStatesResp.current_int_due
          ? loanStatesResp.current_int_due
          : 0,
        lpi_due: loanStatesResp.current_lpi_due
          ? loanStatesResp.current_lpi_due
          : 0,
        charges_due: chargesData.chargeAmount
          ? getEPSILON(chargesData.chargeAmount)
          : 0,
        gst_due: chargesData.totalGST ? getEPSILON(chargesData.totalGST) : 0,
      };
      // Prepare total paid data.
      totalPaidData = {
        interest_paid: loanStatesResp.total_int_paid
          ? loanStatesResp.total_int_paid
          : 0,
        principal_paid: loanStatesResp.total_prin_paid
          ? loanStatesResp.total_prin_paid
          : 0,
        lpi_paid: loanStatesResp.total_lpi_paid
          ? loanStatesResp.total_lpi_paid
          : 0,
        chargse_paid: chargesData.chargeAmountPaid
          ? getEPSILON(chargesData.chargeAmountPaid)
          : 0,
        gst_paid: chargesData.totalGSTPaid
          ? getEPSILON(chargesData.totalGSTPaid)
          : 0,
      };
      // prepare  Instalments & Repayments data.
      loanStatesAuditResp.forEach((record) => {
        installmentAndRepaymentData.push({
          installment_number: record.intsalment_num ? record.intsalment_num : 0,
          installment_amount_due: record.amount_due ? record.amount_due : 0,
          principal_due: record.prin_due ? record.prin_due : 0,
          interest_due: record.int_due ? record.int_due : 0,
          lpi_due: record.lpi_due ? record.lpi_due : 0,
          due_date: record.due_date
            ? moment(record.due_date).format('YYYY-MM-DD')
            : '',
          principal_paid: record.prin_paid ? record.prin_paid : 0,
          interest_paid: record.int_paid ? record.int_paid : 0,
          lpi_paid: record.lpi_paid ? record.lpi_paid : 0,
          paid_date: record.paid_date || '',
          status: record.status || '',
          payments: record.payments || [],
        });
      });

      finalRespData.reconSummaryData = reconSummaryData;
      finalRespData.currentDueData = currentDueData;
      finalRespData.totalPaidData = totalPaidData;
      finalRespData.installmentAndRepaymentData = installmentAndRepaymentData;
      return finalRespData;
    } catch (error) {
      return error;
    }
  };

  app.get(
    '/api/recon-details/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        const loanData = await findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;
        // Fetch data from loan states table against loan id
        const loanStatesResp = await LoanState.findByLID(loan_id);

        if (!loanStatesResp)
          throw {
            success: false,
            message:
              'No records found in loan states against provided loan_id.',
          };
        // Fetch data aginst loan_id from loan_state_audit table
        const loanStatesAuditResp = await LoanStateAudit.findByLID(loan_id);
        if (!loanStatesAuditResp)
          throw {
            success: false,
            message:
              'No records found in loan state audit against provided loan id.',
          };

        // Fetch data against loan_id  from loan_transaction_ledger collection
        const transactionLedger =
          await LoanTransactionSchema.findLIByIdsWithIsReccieved(loan_id);
        if (!transactionLedger)
          throw {
            success: false,
            message:
              'No records found in loan transaction ledger schema against provided loan id.',
          };
        let txnAmountSum = 0;
        transactionLedger.forEach((item) => {
        if(item?.label === 'repayment') txnAmountSum += item?.txn_amount * 1;
        });
        // Fetch data against loan_id and charge_ids from charges collection
        const chargesResp = await ChargesSchema.findAllRearEndedCharges(
          loan_id,
          [1, 7],
        );

        if (!chargesResp)
          throw {
            success: false,
            message: 'No records found in charges against provided loan id.',
          };
        let chargeAmount = 0;
        let totalGST = 0;
        let chargeAmountPaid = 0;
        let totalGSTPaid = 0;

        chargesResp.forEach((item) => {
          chargeAmount +=
            (item?.charge_amount || 0) -
            ((item?.total_amount_paid * 1 || 0) +
              (item?.total_amount_waived * 1 || 0));

          totalGST +=
            (item?.gst || 0) -
            ((item?.total_gst_paid * 1 || 0) +
              (item?.total_gst_reversed * 1 || 0));

          chargeAmountPaid +=
            (item?.total_amount_paid * 1 || 0) +
            (item?.total_amount_waived * 1 || 0);

          totalGSTPaid +=
            (item?.total_gst_paid * 1 || 0) +
            (item?.total_gst_reversed * 1 || 0);
        });

        const chargesData = {
          chargeAmount,
          totalGST,
          chargeAmountPaid,
          totalGSTPaid,
        };

        let chargeAmountExcess = 0;
        let totalGSTExcess = 0;
        let chargeAmountPaidExcess = 0;
        let totalGSTPaidExcess = 0;

        chargesResp
          .filter((obj) => obj.is_processed !== 'Y')
          .forEach((item) => {
            chargeAmountExcess +=
              (item?.charge_amount || 0);
            totalGSTExcess +=
              (item?.gst || 0);
            chargeAmountPaidExcess +=
              (item?.total_amount_paid * 1 || 0) +
              (item?.total_amount_waived * 1 || 0);
            totalGSTPaidExcess +=
              (item?.total_gst_paid * 1 || 0) +
              (item?.total_gst_reversed * 1 || 0);
          });
        const chargesDataExcess = {
          chargeAmountExcess,
          totalGSTExcess,
          chargeAmountPaidExcess,
          totalGSTPaidExcess,
        };
        const finalRespData = await prepareResponseData(
          loanData,
          loanStatesResp,
          loanStatesAuditResp,
          txnAmountSum,
          chargesData,
          chargesDataExcess,
        );
        return res.status(200).send(finalRespData);
      } catch (error) {
        console.log('/api/recon-details/:loan_id', error);
        return res.status(400).send(error);
      }
    },
  );
};

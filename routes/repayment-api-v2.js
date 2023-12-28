const bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const chargesCalculationHelper = require('../util/charges-calculation-helper.js');
const locHelper = require('../util/line-of-credit-helper.js');
const AccessLog = require('../util/accessLog');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const ProductSchema = require('../models/product-schema');
const moment = require('moment');
const { getEPSILON } = require('../util/math-ops');

module.exports = (app) => {
  app.use(bodyParser.json());
  //loan repayment API Version 2
  app.post(
    '/api/repayment-record-v2',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;

        if (req.company.lms_version !== 'origin_lms')
          throw {
            success: false,
            message: 'This API does not support your lms_version',
          };

        //Custom Validation check
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid loan id.',
          },
          {
            field: 'partner_loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid partner loan id.',
          },
          {
            field: 'usage_id',
            type: 'number',
            checked: 'FALSE',
            validationmsg: 'Please enter valid usage_id.',
          },
          {
            field: 'utr_number',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid utr number.',
          },
          {
            field: 'utr_date_time_stamp',
            type: 'dateTime',
            checked: 'TRUE',
            validationmsg:
              'Please enter valid utr date with timestamp(yyyy-mm-dd hh:mm:ss).',
          },
          {
            field: 'txn_amount',
            type: 'float',
            checked: 'TRUE',
            validationmsg: 'Please enter transaction amount.',
          },
          {
            field: 'txn_reference',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid transaction reference.',
          },
          {
            field: 'txn_reference_datetime',
            type: 'dateTime',
            checked: 'TRUE',
            validationmsg:
              'Please enter valid transaction reference date with timestamp(yyyy-mm-dd hh:mm:ss).',
          },
          {
            field: 'payment_mode',
            type: 'string',
            checked: 'TRUE',
            validationmsg:
              'Please enter valid payment mode(PG-DebitCard/PG-InternetBanking/PG-UPI/E-Nach/Others).',
          },
          {
            field: 'label',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid label.',
          },
          {
            field: 'amount_net_of_tds',
            type: 'float',
            checked: 'FALSE',
            validationmsg: 'Please enter valid amount net of tds.',
          },
          {
            field: 'tds_amount',
            type: 'float',
            checked: 'FALSE',
            validationmsg: 'Please enter valid tds amount.',
          },
        ];
        //validate request data with above data
        const result = await helper.nonstrictValidateDataWithTemplate(
          template,
          reqData,
        );
        if (!result)
          throw {
            message: 'Error while validating data with template.',
          };
        if (result.unknownColumns.length)
          throw {
            message: 'Few columns are unknown',
            data: {
              unknownColumns: result.unknownColumns,
            },
          };
        if (result.missingColumns.length)
          throw {
            message: 'Few columns are missing',
            errorCode: '01',
            data: {
              missingColumns: result.missingColumns,
            },
          };
        if (result.errorRows.length)
          throw {
            message: 'Few fields have invalid data',
            errorCode: '02',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
          };

        let amountExceedeTdsAmount = [];
        let amountSUMMismatchNetOfTdsANDTdsAmount = [];
        let negativeTDSAmounts = [];
        result.validatedRows.forEach((item) => {
          item['amount_net_of_tds'] = item.txn_amount - (item?.tds_amount || 0);
          if (item.tds_amount > item.txn_amount)
            amountExceedeTdsAmount.push(item);
          if (item.tds_amount < 0) negativeTDSAmounts.push(item);
          const totalAmount =
            (item?.tds_amount || 0) + (item?.amount_net_of_tds || 0);
          if (totalAmount > 0 && totalAmount !== item.txn_amount) {
            amountSUMMismatchNetOfTdsANDTdsAmount.push(item);
          }
        });
        if (amountExceedeTdsAmount.length) {
          throw {
            message: 'TDS amount cannot be greater than transaction amount',
            errorCode: '02',
            data: {
              exactErrorRows: amountExceedeTdsAmount,
              errorRows: amountExceedeTdsAmount,
            },
          };
        }

        if (amountSUMMismatchNetOfTdsANDTdsAmount.length) {
          throw {
            message:
              'Few records amount_net_of_tds + tds amount sum not matching with txn_amount ',
            errorCode: '02',
            data: {
              exactErrorRows: amountSUMMismatchNetOfTdsANDTdsAmount,
              errorRows: amountSUMMismatchNetOfTdsANDTdsAmount,
            },
          };
        }

        if (negativeTDSAmounts.length) {
          throw {
            message: `TDS amount cannot be less than zero`,
            errorCode: '02',
            data: {
              exactErrorRows: negativeTDSAmounts,
              errorRows: negativeTDSAmounts,
            },
          };
        }

        //Loan Status validation (Disbursed Status)
        const loanIds = result.validatedRows.map((item) => {
          return String(item.loan_id);
        });

        const utrNumbers = await result.validatedRows.map((item) => {
          return String(item.utr_number);
        });
        // Make array of all unique loan ids so that there is no repetition of ids
        const uniqueLoanIds = [...new Set(loanIds)];
        // Check if all the unique loan ids are present in borrowerinfo
        const loanIdsList =
          await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);

        //Check if loan exists in borrower info
        if (!loanIdsList)
          throw {
            message: 'Error finding loan ids in borrower info',
          };

        // ----------- Loan Product Mapping Validation --------------------------------//
        const checkProductAssociated = loanIdsList.filter(
          (item) => item.product_id !== req.product._id,
        );

        if (checkProductAssociated.length)
          throw {
            message: 'Few loan ids are not asociated with this product.',
            data: {
              checkProductAssociated: checkProductAssociated,
            },
          };

        // -----------------Loan Company Mapping Validation--------------------------------//
        const loanIdwithCompany =
          await BorrowerinfoCommon.findKLIByIdsWithCompanyId(
            uniqueLoanIds,
            req.company._id,
          );
        if (!loanIdwithCompany)
          throw {
            message: 'Error finding loan ids',
          };
        if (uniqueLoanIds.length != loanIdwithCompany.length)
          throw {
            message: 'Some loan ids are not associated with selected company',
          };

        const recordPFEntries = reqData.filter((x) => {
          return x.label === 'pf';
        });
        let mismatchPfAmountEntries = [];
        let missingPfAmountInBIC = [];
        let mismatchStatusEntries = [];
        let limitAmountMissing = [];
        // Calculate and validate processing fees on limit amount if Line pf in PC is repayment .
        recordPFEntries.forEach((item) => {
          const currentItem = loanIdsList.filter(
            (x) => x.loan_id === item.loan_id,
          )[0];
          //Validate for the limit amount
          if (!currentItem.limit_amount) {
            limitAmountMissing.push(currentItem.loan_id);
          }
          let pfAmount;
          //Calculate processing fees on limit amount according to product config.
          pfAmount = locHelper.verifyPFCalculationByConfig(req, currentItem);
          pfAmountIncGST = getEPSILON(pfAmount * 1.18);
          if (!pfAmountIncGST || pfAmountIncGST < 1)
            missingPfAmountInBIC.push(item);
          if (pfAmountIncGST * 1 !== item.txn_amount * 1)
            mismatchPfAmountEntries.push(item);
            // Validate for the active loan status
            if (currentItem.stage < 4) mismatchStatusEntries.push(item);
        });
        if (mismatchStatusEntries.length)
        throw {
          success: false,
          message: 'Please set the credit limit first.',
          data: {
            mismatchStatusEntries: mismatchStatusEntries,
          },
          };
        if ( limitAmountMissing.length)
          throw {
            success: false,
            message: 'Please set the credit limit first.',
            data: { limitAmountMissingEntries: limitAmountMissing},
          };
        // check BIC have data for processing fees
        if (missingPfAmountInBIC.length)
          throw {
            success: false,
            message:
              'Few entries dont have processing_fees_amt in record or zero.',
            data: {
              missingPfAmountInBIC: missingPfAmountInBIC,
            },
          };

        // If any record txn_amount and BIC amount of pf is missmatch
        if (mismatchPfAmountEntries.length)
          throw {
            success: false,
            message: `Processing fees set in product is set to - ${pfAmountIncGST}`,
            data: {
              mismatchPfAmountEntries: mismatchPfAmountEntries,
            },          
          };
        let locAdvanceEMIRecords = [];
        let recordAdvanceEMIInLOC = [];
        let future_txn_reference_datetime_date_records = [];
        let future_utr_date_time_stamp_date_records = [];
        reqData.forEach((item) => {
          const today = moment().format('YYYY-MM-DD');
          const txn_reference_datetime = moment(
            new Date(item.txn_reference_datetime),
          ).format('YYYY-MM-DD');
          const utr_date_time_stamp = moment(
            new Date(item.utr_date_time_stamp),
          ).format('YYYY-MM-DD');

          if (txn_reference_datetime > today)
            future_txn_reference_datetime_date_records.push(item);
          if (utr_date_time_stamp > today)
            future_utr_date_time_stamp_date_records.push(item);
          if (item.label === 'Advance EMI') locAdvanceEMIRecords.push(item);
          if (
            item.label === 'Advance EMI' &&
            Number(req.product.allow_loc) === 1
          )
            recordAdvanceEMIInLOC.push(item);
        });
        if (future_txn_reference_datetime_date_records.length)
          throw {
            success: false,
            message: `some txn_reference_datetime of loan ids ${future_txn_reference_datetime_date_records
              .map((item) => item.loan_id)
              .toString()} are of future`,
          };

        if (future_utr_date_time_stamp_date_records.length)
          throw {
            success: false,
            message: `some utr_date_time_stamp_date of loan ids ${future_utr_date_time_stamp_date_records
              .map((item) => item.loan_id)
              .toString()} are of future`,
          };
        if (recordAdvanceEMIInLOC.length)
          throw {
            message:
              'Some loan ids are of loc, hence record with Advance EMI label not allowed',
            success: false,
            data: locAdvanceEMIRecords,
          };

        let nonAdvanceEMIRecords = [];
        reqData.forEach((item) => {
          if (item.label !== 'Advance EMI' && item.label !== 'pf')
            nonAdvanceEMIRecords.push(item);
        });

        //Loan Status validation (Disbursed Status)
        const loanIdsNonAdvanceEMIRecords = nonAdvanceEMIRecords.map((item) => {
          return String(item.loan_id);
        });
        // Make array of all unique loan ids so that there is no repetition of ids
        const uniqueLoanIdsNonAdvanceEMIRecords = [
          ...new Set(loanIdsNonAdvanceEMIRecords),
        ];
        // Check if all the unique loan ids are present in borrowerinfo
        const loanIdsListNonAdvanceEMIRecords =
          await BorrowerinfoCommon.findKLIByIds(
            uniqueLoanIdsNonAdvanceEMIRecords,
          );
        
        //----------------------Segregate Term Loan and LOC------------------------//
        const loanIdsListNonAdvanceEMIRecordsLOC = [];
        const loanIdsListNonAdvanceEMIRecordsTermLoan = [];

        for (const loanRecord of loanIdsListNonAdvanceEMIRecords) {
          const product = await ProductSchema.findById(loanRecord.product_id);

          if (product.allow_loc && product.allow_loc === 1) {
            loanIdsListNonAdvanceEMIRecordsLOC.push(loanRecord);
          } else {
            loanIdsListNonAdvanceEMIRecordsTermLoan.push(loanRecord);
          }
        }

        //----------------------Loan Stage Check------------------------//
        if (loanIdsListNonAdvanceEMIRecordsLOC.length === 0 && loanIdsListNonAdvanceEMIRecordsTermLoan.length > 0) {
          const onlyStageCheckedPushNonAdvanceEMIRecordsTermLoan = loanIdsListNonAdvanceEMIRecordsTermLoan.filter((item) => item.stage === 4 || item.stage === 6 || item.stage === 999);

          if (loanIdsListNonAdvanceEMIRecordsTermLoan.length !== onlyStageCheckedPushNonAdvanceEMIRecordsTermLoan.length) {
            throw {
              message: 'Invalid loan status, loan status should be one of the following - [disbursed, cancelled, closed], kindly contact administrator.',
            };
          }
        } else if (loanIdsListNonAdvanceEMIRecordsLOC.length > 0 && loanIdsListNonAdvanceEMIRecordsTermLoan.length === 0) {
          const onlyDisbursedPushNonAdvanceEMIRecordsLOC = loanIdsListNonAdvanceEMIRecordsLOC.filter((item) => item.stage === 4 || item.stage === 7 || item.stage === 8);

          if (loanIdsListNonAdvanceEMIRecordsLOC.length !== onlyDisbursedPushNonAdvanceEMIRecordsLOC.length) {
            throw {
              message: 'Invalid loan status, loan status should be one of following - [disbursed, line_in_use, expired], kindly contact administrator.',
            };
          }
        }

        //Validate usage_id if passed in payload.

        let usageIdMissingRecords = [];
        let loanIdMismatchRecords = [];
        let usageIdNotExistRecords = [];
        for (let i = 0; i < result.validatedRows.length; i++) {
          const row = result.validatedRows[i];
          if (
            (req.product.force_usage_convert_to_emi === 1 ||
              (row.label.toLowerCase() === 'repayment' &&
                req.product?.recon_type === 'Invoice')) &&
            !row.usage_id &&
            row.label !== 'Advance EMI'
          )
            usageIdMissingRecords.push(row);
          if (row.usage_id && row.label !== 'Advance EMI') {
            //Check if data exist by usage_id in loan_transaction_ledger.
            const usageIdExist = await LoanTransactionSchema.findByUsageId(
              row.usage_id,
            );
            if (!usageIdExist) {
              usageIdNotExistRecords.push(row);
            }
            //If data exist then validate if it is associated with provided loan_id.
            if (usageIdExist && usageIdExist.loan_id !== row.loan_id) {
              loanIdMismatchRecords.push(row);
            }
          }
        }
        if (usageIdMissingRecords.length)
          throw {
            success: false,
            message: 'usage_id is missing in some records.',
          };
        if (usageIdNotExistRecords.length)
          throw {
            success: false,
            message: 'No transaction found against usage_id',
          };
        if (loanIdMismatchRecords.length)
          throw {
            success: false,
            message: 'loan_id is not associated with the transaction.',
          };
        //------------------Unique UTR Check----------------------------------------//
        const loanIdwithTxn =
          await LoanTransactionSchema.findKLIByIdsWithUtrNumber(utrNumbers);
        if (req.product?.recon_type === 'Invoice') {
          const invalidRepayment = loanIdwithTxn.find(
            (transaction) => transaction.product_id !== req.product._id,
          );
          if (invalidRepayment) {
            throw {
              message: 'Some utr numbers are duplicate',
              data: [invalidRepayment],
            };
          }
        } else {
          const duplicateUtrNumbers = utrNumbers.filter(
            (item, index) => utrNumbers.indexOf(item) !== index,
          );

          if (duplicateUtrNumbers.length !== 0) {
            throw { message: 'Some utr numbers are duplicate' };
          }

          if (loanIdwithTxn.length !== 0) {
            throw {
              message: 'Some utr numbers are duplicate',
              data: loanIdwithTxn,
            };
          }
        }
        const ledgerDataArray = [];
        result.validatedRows.forEach((row) => {
          let ledgerObj = {};
          ledgerObj.loan_id = row?.loan_id.toString().replace(/\s/g, '');
          ledgerObj.partner_loan_id = row?.partner_loan_id;
          ledgerObj.payment_mode = row?.payment_mode;
          ledgerObj.created_by = req.user.username;
          ledgerObj.txn_entry = 'cr';
          ledgerObj.txn_amount = getEPSILON(row?.txn_amount);
          ledgerObj.txn_reference = row?.txn_reference
            ? row?.txn_reference
            : '';
          ledgerObj.txn_reference_datetime = row?.txn_reference_datetime;
          ledgerObj.label = row?.label;
          ledgerObj.utr_number = row?.utr_number;
          ledgerObj.utr_date_time_stamp = row?.utr_date_time_stamp;
          ledgerObj.company_id = req.company._id;
          ledgerObj.company_name = req.company.name;
          ledgerObj.product_id = req.product._id;
          ledgerObj.product_key = req.product.name;
          ledgerObj.usage_id = row?.usage_id;
          ledgerObj.amount_net_of_tds =
            row?.tds_amount > 0
              ? getEPSILON(row.txn_amount - row.tds_amount)
              : getEPSILON(row.txn_amount);
          ledgerObj.tds_amount =
            row?.tds_amount > 0 ? getEPSILON(row?.tds_amount) : 0;
          ledgerDataArray.push(ledgerObj);
        });
        loanIdsList.forEach((borrower) => {
          const elementPos = ledgerDataArray
            .map(function (x) {
              return x.loan_id;
            })
            .indexOf(borrower.loan_id);
          ledgerDataArray[elementPos].product_id = borrower.product_id;
        });

        var addedTransaction = await LoanTransactionSchema.addInBulk;
        const respUsageAdd = await addedTransaction(ledgerDataArray);
        const count = [respUsageAdd];
        if (!respUsageAdd)
          throw {
            message: 'Error while adding bulk repayment data in ledger',
          };
        return res.status(200).send({
          success: true,
          message: `Successfully inserted ${ledgerDataArray.length} records in loan  transaction ledger`,
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).send(error);
      }
    },
  );

  //Api to fetch repayment information
  app.get(
    '/api/repayment-record-v2/:loanId',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const { loanId } = req.params;
        const repaymentRecords = await LoanTransactionSchema.findAllTxnWithKlid(
          loanId,
          'cr',
        );
        if (!repaymentRecords.length)
          throw {
            success: false,
            message: 'No repayment records found against provided  loan id',
          };
        if (repaymentRecords)
          return res.status(200).send({
            success: true,
            count: repaymentRecords.length,
            repaymentData: repaymentRecords,
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

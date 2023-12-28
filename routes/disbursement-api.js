bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const AccessLog = require('../util/accessLog');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
let reqUtils = require('../util/req.js');
const middlewares = require('../utils/middlewares');
const calculation = require('../util/calculation');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const CreditLimitDetails = require('../models/credit-limit-schema.js');
const clInoviceDetails = require('../models/cl-invoice-schema');
const LoanValidityCheck = require('../models/loan-validity-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const Product = require('../models/product-schema');
const thirdPartyHelper = require('../util/thirdPartyHelper.js');
const {
  successResponse,
  failResponse,
  errorResponse,
} = require('../utils/responses');

module.exports = (app, connection) => {
  var checkLoanValidity = async (clUsageRecord) => {
    try {
      const loanIds = clUsageRecord.map((item) => {
        return String(item.loan_id);
      });
      const uniqueLoanIds = [...new Set(loanIds)];
      const validityResp = await LoanValidityCheck.findKLIByIds(uniqueLoanIds);
      if (!validityResp) return true;
      if (validityResp) {
        for (let index = 0; index < clUsageRecord.length; index++) {
          let loanValidateRecord = validityResp.filter(
            (ele) => ele.loan_id === String(clUsageRecord[index].loan_id),
          );
          if (
            loanValidateRecord.length &&
            loanValidateRecord[0].valid_from_date &&
            loanValidateRecord[0].valid_till_date &&
            (clUsageRecord[index].txn_date <
              loanValidateRecord[0].valid_from_date ||
              clUsageRecord[index].txn_date >
                loanValidateRecord[0].valid_till_date)
          )
            return 'txn_date should be in between the loan validity date.';
          if (clUsageRecord.length - 1 === index) return true;
        }
      }
    } catch (error) {
      return 'Something went wrong.';
    }
  };

  //loan disbursement API
  app.post(
    '/api/disbursement_record',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog, //middlewares.injectLoanRequestFromArrayToParseAndEval,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');
        //request data will be validated according to this data
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid loan_id.',
          },
          {
            field: 'borrower_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid borrower_id.',
          },
          {
            field: 'partner_loan_app_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid partner_loan_app_id.',
          },
          {
            field: 'partner_borrower_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid partner_borrower_id.',
          },
          {
            field: 'disbursement_status',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid disbursement_status.',
          },
          {
            field: 'utr_number',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid utr_number.',
          },
          {
            field: 'utr_date_time_stamp',
            type: 'date',
            checked: 'TRUE',
            validationmsg: 'Please enter valid utr_date_time_stamp.',
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
            field: 'txn_entry',
            type: 'string',
            checked: 'FALSE',
            validationmsg: 'Please enter valid transaction entry type eg dr',
          },
          {
            field: 'label',
            type: 'string',
            checked: 'FALSE',
            validationmsg: 'Please enter valid transaction label',
          },
          {
            field: 'record_method',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid record_method.',
          },
          {
            field: 'note',
            type: 'string',
            checked: 'FALSE',
            validationmsg: 'Please enter valid note.',
          },
        ];

        // Validate product type is not loc
        if (req.product.allow_loc) {
          throw {
            success: false,
            message:
              'disbursemnet is not enabled for this product as product is of type LOC.',
          };
        }

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

        let negative_amount_records = reqData.filter((item) => {
          return item.txn_amount < 1;
        });

        if (negative_amount_records.length)
          return reqUtils.json(req, res, next, 400, {
            message: 'txn_amount should be greater than zero.',
            errorCode: '01',
            data: negative_amount_records,
          });

        result.validatedRows.forEach((row) => {
          row.company_id = req.company._id;
        });

        let futureTxnDates = [];
        result.validatedRows.forEach((item) => {
          let txnDate = item.txn_date;
          if (txnDate > currentDate) {
            futureTxnDates.push(txnDate);
          }
        });
        if (futureTxnDates.length)
          throw {
            message:
              'some txn_dates are from future hence we can not add records in transaction ledger.',
            data: futureTxnDates,
          };

        var groupBy = function (xs, key) {
          return xs.reduce(function (rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
          }, {});
        };

        var txnAmountSumOnKLID = function (object, attr) {
          let keys = Object.keys(object);
          let txnArray = [];
          let txnObject = {};
          for (let i = 0; i < keys.length; i++) {
            let sum = 0;
            object[keys[i]].map((ele) => (sum = sum + parseInt(ele[attr])));
            txnArray.push(sum);
            txnObject[keys[i]] = sum;
          }
          return txnObject;
        };

        var compareObject = function (object1, object2) {
          //both the object should have same keys
          let keys1 = Object.keys(object1);
          let txnObject = {};
          for (let i = 0; i < keys1.length; i++) {
            if (object1[keys1[i]] < object2[keys1[i]])
              txnObject[keys1[i]] = object1[keys1[i]];
          }
          return txnObject;
        };

        var subTwoTxnObject = (object1, object2) => {
          //both the object should have same keys
          let keys1 = Object.keys(object1);
          let txnObject = {};
          for (let i = 0; i < keys1.length; i++) {
            let sum = 0;
            sum = object2[keys1[i]]
              ? object1[keys1[i]] - object2[keys1[i]]
              : object1[keys1[i]];
            txnObject[keys1[i]] = sum;
          }
          return txnObject;
        };

        //make array off all loan ids
        const loanIds = await result.validatedRows.map((item) => {
          return String(item.loan_id);
        });

        const TxnDate = await result.validatedRows.map((item) => {
          return String(item.txn_date);
        });

        const utrNumbers = await result.validatedRows.map((item) => {
          return String(item.utr_number);
        });
        const groupedbyLoanIDFromDoc = await groupBy(
          result.validatedRows,
          'loan_id',
        );
        const totalUsageAmountFromDoc = await txnAmountSumOnKLID(
          groupedbyLoanIDFromDoc,
          'txn_amount',
        );
        // Make array of all unique loan ids so that there is no repetition of ids
        const uniqueLoanIds = [...new Set(loanIds)];
        const mapKLIDwithProductId = (array) => {
          let object = {};
          array.map((ele) => {
            const key = ele.loan_id;
            const value = ele.product_id;
            object[key] = value;
          });
          return object;
        };
        // Check if all the unique loan ids are present in borrowerinfo
        const loanIdsList =
          await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
        if (!loanIdsList)
          throw {
            message: 'Error finding loan ids in borrower info',
          };
        const checkProductAssociated = loanIdsList.filter(
          (item) => item.product_id !== req.product._id,
        );
        if (checkProductAssociated.length)
          throw {
            message:
              'Few loan ids are not asociated with this product. Use appropriate token against that product for loan id',
            data: {
              checkProductAssociated: checkProductAssociated,
            },
          };

        const productIdsObject = mapKLIDwithProductId(loanIdsList);

        const biPresentIds = loanIdsList.map((record) => {
          return record.loan_id.toString().replace(/\s/g, '');
        });
        const biMissingIds = uniqueLoanIds
          .filter((loanId) => {
            return biPresentIds.indexOf(String(loanId)) <= -1;
          })
          .map((id) => {
            return {
              loan_id: id,
            };
          });
        if (biMissingIds.length)
          throw {
            message: `Some loan ids do not exist.`,
            data: {
              missingIds: biMissingIds,
            },
          };
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
        const onlyDisbursedPush = loanIdsList.filter(
          (item) =>
            item.status === 'disbursal_approved' || item.status === 'disbursed',
        );
        if (uniqueLoanIds.length != onlyDisbursedPush.length)
          throw {
            message:
              'Some Loan Ids Loan status is not disbursal approved or disbursed.Kindly contact administrator.',
          };
        const biPresentId = loanIdwithCompany.map((record) => {
          return record.loan_id.toString().replace(/\s/g, '');
        });
        const biMissingId = uniqueLoanIds
          .filter((loanId) => {
            return biPresentId.indexOf(String(loanId)) <= -1;
          })
          .map((id) => {
            return {
              loan_id: id,
            };
          });
        if (biMissingId.length)
          throw {
            message: 'Some loan ids are not associated with selected company',
            data: {
              missingIds: biMissingIds,
            },
          };

        const creditLimitResult =
          await CreditLimitDetails.checkMultipleCreditLimit(uniqueLoanIds);
        if (!creditLimitResult)
          throw {
            message: 'Error finding credit limit details',
          };
        if (creditLimitResult.length != uniqueLoanIds.length)
          throw {
            message: 'Sanction limit is not set for some loan ids .',
          };
        const validityResp = await checkLoanValidity(result.validatedRows);
        if (!validityResp)
          throw {
            message: validityResp,
          };
        const allTxnBasedonKlid =
          await LoanTransactionSchema.findAllTxnWithKlid(uniqueLoanIds, 'dr');
        if (!allTxnBasedonKlid)
          throw {
            message: 'Error finding transaction ids in cl usage transaction',
          };
        const allTxnBasedonKlidRepay =
          await LoanTransactionSchema.findAllTxnWithKlid(uniqueLoanIds, 'cr');
        if (!allTxnBasedonKlidRepay)
          throw {
            message: 'Error finding transaction ids in cl repay transaction',
          };

        const loanIdwithTxn =
          await LoanTransactionSchema.findKLIByIdsWithUtrNumber(utrNumbers);
        if (
          utrNumbers.filter((item, index) => utrNumbers.indexOf(item) != index)
            .length != 0
        )
          throw {
            message: 'Some utr numbers are duplicate',
          };
        if (loanIdwithTxn.length != 0)
          throw {
            message: 'Some utr numbers are duplicate ',
            data: loanIdwithTxn,
          };
        const allInvoice = await clInoviceDetails.findAllInvoiceWithKlid(
          uniqueLoanIds,
          'pending',
        );
        if (!allInvoice)
          throw {
            message: 'Error finding invoice in cl invoice',
          };
        const totalUsageAmountFromDatabase = await txnAmountSumOnKLID(
          groupBy(allTxnBasedonKlid, 'loan_id'),
          'txn_amount',
        );
        const totalRepayAmountFromDatabase = await txnAmountSumOnKLID(
          groupBy(allTxnBasedonKlidRepay, 'loan_id'),
          'txn_amount',
        );
        const limitAgainstKlid = await txnAmountSumOnKLID(
          groupBy(creditLimitResult, 'loan_id'),
          'limit_amount',
        );
        const invoiceSumAgaintsKlid = await txnAmountSumOnKLID(
          groupBy(allInvoice, 'loan_id'),
          'total_amount',
        );
        const availableBalance = await subTwoTxnObject(
          subTwoTxnObject(limitAgainstKlid, invoiceSumAgaintsKlid),
          subTwoTxnObject(
            totalUsageAmountFromDatabase,
            totalRepayAmountFromDatabase,
          ),
        );
        const check = await compareObject(
          availableBalance,
          totalUsageAmountFromDoc,
        );
        if (Object.keys(check).length > 0)
          throw {
            message: 'Few loan ids have insufficient balance ',
            data: {
              available: check,
              usage: totalUsageAmountFromDoc,
            },
          };
        const ledgerDataArray = [];
        const nonDisbursedLoans = loanIdsList.filter(
          (item) => item.stage <= 3 && item.status != 'disbursed',
        );
        if (nonDisbursedLoans.length) {
          helper.markLoansDisbursed(nonDisbursedLoans);
        }
        result.validatedRows.forEach((row) => {
          let ledgerObj = {};
          ledgerObj.loan_id = row.loan_id.toString().replace(/\s/g, '');
          ledgerObj.borrower_id = row.borrower_id;
          ledgerObj.partner_loan_app_id = row.partner_loan_app_id;
          ledgerObj.partner_borrower_id = row.partner_borrower_id;
          ledgerObj.txn_amount = row.txn_amount;
          ledgerObj.txn_entry = 'dr';
          ledgerObj.txn_reference = row.txn_reference ? row.txn_reference : '';
          ledgerObj.label = row.label;
          ledgerObj.disbursement_status = row.disbursement_status;
          ledgerObj.utr_number = row.utr_number;
          ledgerObj.utr_date_time_stamp =
            row.utr_date_time_stamp || moment().format('YYYY-MM-DD');
          ledgerObj.record_method = row.record_method;
          ledgerObj.note = row.note;
          ledgerObj.company_id = req.company._id;
          ledgerObj.company_name = req.company.name;
          ledgerObj.product_id = req.product_id;
          ledgerObj.product_key = req.product.name;
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
        const thirdPartyDisbursementResp =
          await thirdPartyHelper.thirdPartyDisbursement(
            req,
            ledgerDataArray[0],
            res,
          );
        if (thirdPartyDisbursementResp) {
          if (!thirdPartyDisbursementResp?.success) {
            throw {
              message: thirdPartyDisbursementResp?.data,
            };
          }

          var addedTransaction = await LoanTransactionSchema.addInBulk;
          const respUsageAdd = await addedTransaction(ledgerDataArray);
          const count = [respUsageAdd];
          if (!respUsageAdd)
            throw {
              message: 'Error while adding disbursement data in ledger',
            };
          return res.status(200).send({
            success: true,
            message: `Successfully inserted ${count.length} records in loan  transaction ledger`,
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.get(
    '/api/disbursement_record/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const { loan_id } = req.params;
        const disbursementRecords =
          await LoanTransactionSchema.findAllTxnWithKlid(loan_id, 'dr');
        if (!disbursementRecords.length)
          return failResponse(req, res, {}, 'No records founds.');
        if (disbursementRecords)
          return successResponse(req, res, disbursementRecords);
      } catch (error) {
        return errorResponse(req, res, error);
      }
    },
  );

  app.get(
    '/api/disbursement_record/:company_id/:product_id/:record_method',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const { company_id, product_id, record_method } = req.params;
        const disbursementRecords =
          await LoanTransactionSchema.findAllByCompanyAndProduct(
            company_id,
            product_id,
            record_method,
            'dr',
          );
        if (!disbursementRecords.length)
          return failResponse(req, res, {}, 'No records founds.');
        await disbursementRecords.map(async (record) => {
          await BorrowerinfoCommon.updateLoanStatus(
            { status: 'disbursement_initiated' },
            record.loan_id,
          );
        });

        if (disbursementRecords)
          return successResponse(req, res, disbursementRecords);
      } catch (error) {
        return errorResponse(req, res, error);
      }
    },
  );
};

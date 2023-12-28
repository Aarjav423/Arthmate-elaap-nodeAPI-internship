bodyParser = require('body-parser');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const AccessLog = require('../util/accessLog');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
let reqUtils = require('../util/req.js');
const middlewares = require('../utils/middlewares');
const calculation = require('../util/calculation');
const s3helper = require('../util/s3helper');
const LoanTemplatesSchema = require('../models/loan-templates-schema.js');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const CreditLimitDetails = require('../models/credit-limit-schema.js');
const clInoviceDetails = require('../models/cl-invoice-schema');
const LoanValidityCheck = require('../models/loan-validity-schema.js.js');
const CLTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const CustomDue = require('../models/custom-dues-schema');
const Product = require('../models/product-schema');

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

  //loan transactions API
  app.post(
    '/api/loantransactions',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyLoanSchema,
      AccessLog.maintainAccessLog,
      middlewares.injectLoanRequestFromArrayToParseAndEval,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body;
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');
        const loanTransactionTemplates =
          await LoanTemplatesSchema.findByNameTmplId(
            req.loanSchema.loan_custom_templates_id,
            'loantransactions',
          );
        if (!loanTransactionTemplates)
          throw {
            message: 'No records found for loan transaction template',
          };
        const resultLoanTransactionJson = await s3helper.fetchJsonFromS3(
          loanTransactionTemplates.path.substring(
            loanTransactionTemplates.path.indexOf('templates'),
          ),
        );
        if (!resultLoanTransactionJson)
          throw {
            message: 'Error fetching json from s3',
          };

        const result = await helper.nonstrictValidateDataWithTemplate(
          resultLoanTransactionJson,
          reqData,
        );
        if (!result)
          throw {
            message: 'Error while validating data',
          };
        if (result.unknownColumns.length)
          return reqUtils.json(req, res, next, 400, {
            message: 'Few columns are unknown',
            errorCode: '03',
            data: {
              unknownColumns: result.unknownColumns,
            },
          });
        if (result.missingColumns.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Few columns are missing',
            errorCode: '01',
            data: {
              missingColumns: result.missingColumns,
            },
          });
        if (result.errorRows.length)
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: 'Few fields have invalid data',
            errorCode: '02',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
          });
        let negative_amount_records = reqData.filter((item) => {
          return item.txn_amount < 0;
        });

        if (negative_amount_records.length)
          return reqUtils.json(req, res, next, 400, {
            message: 'txn_amount should be greater than or equal to zero.',
            errorCode: '01',
            data: negative_amount_records,
          });

        //Check if txn_amount and sum of dues principal_amount is matching
        let principalNotMatchingUsage = [];
        reqData.forEach((item) => {
          if (item.dues) {
            let usageDuesPricipalSum = 0;
            item.dues.forEach((dueItem) => {
              usageDuesPricipalSum += dueItem.principal_amount * 1;
            });
            if (
              item.txn_amount > usageDuesPricipalSum
                ? item.txn_amount - usageDuesPricipalSum > 10
                : usageDuesPricipalSum - item.txn_amount > 10
            ) {
              principalNotMatchingUsage.push(item);
            }
          }
        });
        if (principalNotMatchingUsage.length)
          throw {
            message:
              'Few usage txn_amount and there dues principal_amount is not matching',
            data: {
              principalNotMatchingUsage: principalNotMatchingUsage,
            },
          };

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

        //Check passed dues array is all ok
        let duesVerified = false;
        let duesFound = false;
        let erroredUsage = [];
        reqData.forEach((item) => {
          if (item.dues) {
            duesFound = true;
            if (!item.dues.length)
              throw {
                message: 'Dues should have at least 1 element',
              };
            item.dues.forEach(async (due) => {
              const validationDues = await helper.checkDuesArray(due);
              if (validationDues.items.length) {
                erroredUsage.push({
                  usage: item,
                  validationError: validationDues.items,
                });
              }
            });
            duesVerified = true;
          }
        });

        //Check if any usage has error
        if (erroredUsage.length)
          throw {
            message: 'Dues element have incorrect data',
            items: erroredUsage,
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

        const TxnIds = await result.validatedRows.map((item) => {
          return String(item.txn_id);
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
            message: 'Limit is not set for some loan ids .',
          };
        const validityResp = await checkLoanValidity(result.validatedRows);
        if (!validityResp)
          throw {
            message: validityResp,
          };
        const allTxnBasedonKlid = await CLTransactionSchema.findAllTxnWithKlid(
          uniqueLoanIds,
          'usage',
          'pending',
        );
        if (!allTxnBasedonKlid)
          throw {
            message: 'Error finding transaction ids in cl usage transaction',
          };
        const allTxnBasedonKlidRepay =
          await CLTransactionSchema.findAllTxnWithKlid(
            uniqueLoanIds,
            'repayment',
            'pending',
          );
        if (!allTxnBasedonKlidRepay)
          throw {
            message: 'Error finding transaction ids in cl repay transaction',
          };

        const loanIdwithTxn =
          await CLTransactionSchema.findKLIByIdsWithTxnId(TxnIds);
        if (
          TxnIds.filter((item, index) => TxnIds.indexOf(item) != index)
            .length != 0
        )
          throw {
            message: 'Some transaction ids are duplicate',
          };
        if (loanIdwithTxn.length != 0)
          throw {
            message: 'Some transaction ids are duplicate ',
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
          row.label = row.label ? row.label : 'usage';
          if (row.label.toLowerCase() == 'usage') {
            const capturedBI = loanIdsList.filter((itemBI) => {
              return itemBI.loan_id === row.loan_id;
            });
            const chargesRes = calculation.calculateUpfrontCharges(
              capturedBI[0],
              req.product,
              row.txn_amount,
              row.txn_date,
            );
            try {
              row.upfront_deducted_charges =
                chargesRes.upfront_deducted_charges;
              row.upfront_fees = chargesRes.upfront_fees;
              row.upfront_processing_fees = chargesRes.upfront_processing_fees;
              row.upfront_interest_amount = chargesRes.upfront_interest_amount;
              row.upfront_subvention_fees = chargesRes.upfront_subvention_fees;
              row.upfront_usage_fee = chargesRes.upfront_usage_fee;
              row.fees = chargesRes['fees'];
              row.processing_fees = chargesRes['processing_fees'];
              row.upfront_interest = chargesRes['upfront_interest'];
              row.subvention_fees = chargesRes['subvention_fees'];
              row.usage_fee = chargesRes['usage_fee'];
              ledgerObj.upfront_deducted_charges = row.upfront_deducted_charges;
              ledgerObj.upfront_fees = row.upfront_fees;
              ledgerObj.upfront_processing_fees = row.upfront_processing_fees;
              ledgerObj.upfront_interest_amount = row.upfront_interest_amount;
              ledgerObj.upfront_subvention_fees = row.upfront_subvention_fees;
              ledgerObj.upfront_usage_fee = row.upfront_usage_fee;
              ledgerObj.fees = row['fees'];
              ledgerObj.processing_fees = row['processing_fees'];
              ledgerObj.upfront_interest = row['upfront_interest'];
              ledgerObj.subvention_fees = row['subvention_fees'];
              ledgerObj.usage_fee = row['usage_fee'];
            } catch (errorConversion) {
              return reqUtils.json(req, res, next, 400, {
                message:
                  'Error while calculating deductions, kindly check calculations',
              });
            }
          }
          ledgerObj.loan_id = row.loan_id.toString().replace(/\s/g, '');
          ledgerObj.borrower_id = row.borrower_id;
          ledgerObj.partner_loan_id = row.partner_loan_id;
          ledgerObj.partner_borrower_id = row.partner_borrower_id;
          ledgerObj.txn_amount = row.txn_amount;
          ledgerObj.txn_date = row.txn_date || moment().format('YYYY-MM-DD');
          ledgerObj.vpa_id = row.vpa_id;
          ledgerObj.ac_holder_name = row.ac_holder_name;
          ledgerObj.account_number = row.account_number
            ? row.account_number
            : '';
          ledgerObj.bank_name = row.bank_name ? row.bank_name : '';
          ledgerObj.disbursement_channel = row.disbursement_channel;
          ledgerObj.txn_id =
            'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9999);
          ledgerObj.type = row.label;
          ledgerObj.txn_entry = row.label === 'usage' ? 'dr' : 'cr';
          ledgerObj.company_id = req.company._id;
          ledgerObj.company_name = req.company.name;
          ledgerObj.product_id =
            productIdsObject[`${row.loan_id.toString().replace(/\s/g, '')}`];
          ledgerObj.txn_id = row.txn_id;
          ledgerObj.txn_reference = row.txn_reference ? row.txn_reference : '';
          ledgerObj.invoice_status = 'pending';
          ledgerObj.label = row.label;
          ledgerObj.txn_stage = row.txn_stage ? row.txn_stage : '01';
          ledgerObj.initiated_date =
            row.txn_date || moment().format('YYYY-MM-DD');
          ledgerObj.custom_due = duesVerified ? 1 : 0;
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

        var addedTransaction = await CLTransactionSchema.addInBulk;

        const respUsageAdd = await addedTransaction(ledgerDataArray);
        const count = [respUsageAdd];
        if (!respUsageAdd)
          throw {
            message: 'Error while adding bulk data in ledger',
          };
        const customDuesArray = [];
        result.validatedRows.forEach((row) => {
          if (row.dues && row.dues.length) {
            row.dues.map((item) => {
              let customDuesobject = {};
              for (i = 0; i < 1; i++) {
                customDuesobject = {
                  loan_id: row.loan_id,
                  partner_loan_id: row.partner_loan_id,
                  usage_id: respUsageAdd ? respUsageAdd._id : null,
                  company_id: req.company._id,
                  product_id: req.product._id,
                  txn_id: row.txn_id,
                  txn_date: row.txn_date,
                  due_date: item.date
                    ? item.date
                    : moment(row.txn_date)
                        .add(item.tenure_in_days * 1, 'days')
                        .format('YYYY-MM-DD'),
                  principal_amount: item.principal_amount,
                  emi_amt: item.emi_amt ? item.emi_amt : 0,
                  fees: item.fees,
                  subvention_fees: item.subvention_fees,
                  processing_fees: item.processing_fees,
                  usage_fee: item.usage_fee,
                  upfront_interest: item.upfront_interest,
                  int_value: item.int_value,
                  interest_free_days: item.interest_free_days,
                  exclude_interest_till_grace_period:
                    item.exclude_interest_till_grace_period === 'true' ? 1 : 0,
                  tenure_in_days: item.tenure_in_days,
                  grace_period: item.grace_period,
                  overdue_charges_per_day: item.overdue_charges_per_day,
                  penal_interest: item.penal_interest,
                  overdue_days: item.overdue_days,
                  penal_interest_days: item.penal_interest_days,
                  status: 'pending',
                };
              }
              customDuesArray.push(customDuesobject);
            });
          }
        });

        if (customDuesArray.length && duesVerified) {
          const respCustomDueAdd = await CustomDue.addInBulk(customDuesArray);
          if (!respCustomDueAdd)
            throw {
              message: 'Error while adding custom dues data in ledger',
            };
          return reqUtils.json(req, res, next, 200, {
            success: true,
            message: `Successfully inserted ${count.length} records in loan  transaction ledger`,
          });
        } else {
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

  app.post(
    '/api/get_new_cl_repay_and_credit',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const requestData = req.body;
        requestData.company_id = req.company._id;
        requestData.product_id = req.product._id;
        if (requestData.str) {
          requestData.loan_id = requestData.str;
        }
        delete requestData.str;
        const currDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
        let fromDate = moment(requestData.from_date)
          .startOf('day')
          .format('YYYY-MM-DD');
        let toDate = moment(requestData.to_date)
          .endOf('day')
          .format('YYYY-MM-DD');
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        if (!requestData.company_id)
          throw {
            success: false,
            message: 'Please select company.',
          };
        if (!requestData.product_id)
          throw {
            success: false,
            message: 'Please select product.',
          };
        if (
          !requestData.loan_id &&
          !requestData.utr_number &&
          (!requestData.from_date || !requestData.to_date)
        )
          throw {
            message: 'Please select from date and to date.',
            success: false,
          };
        if (!requestData.utr_number) delete requestData.utr_number;
        if (!requestData.type) delete requestData.type;
        if (!requestData.loan_id) delete requestData.loan_id;
        if (requestData.from_date || requestData.to_date) {
          let txn_date = {};
          if (requestData.from_date) {
            if (fromDate > currDate)
              throw {
                message:
                  'From Date should be less than or equal to current date.',
                success: false,
              };
            delete requestData.from_date;
            Object.assign(txn_date, {
              $gte: moment(fromDate).format('YYYY-MM-DD'),
            });
          }
          if (requestData.to_date) {
            if (fromDate && fromDate > toDate)
              return res.status(400).json({
                message: 'From date should be less than to date',
              });
            delete requestData.to_date;
            Object.assign(txn_date, {
              $lte: moment(toDate).format('YYYY-MM-DD'),
            });
          }
          requestData.txn_date = txn_date;
        }
        if (requestData.loan_id) {
          const RespBorro = await BorrowerinfoCommon.findOneWithKLID(
            requestData.loan_id,
          );
          if (!RespBorro)
            throw {
              success: false,
              message: 'This loan id does not exist.',
            };
          if (RespBorro.company_id !== req.company._id)
            throw {
              success: false,
              message: 'loan id is not associated with this company.',
            };
          if (RespBorro.product_id !== req.product._id)
            throw {
              success: false,
              message: 'loan id is not associated with this product.',
            };
          get_cl_data(req, res, next, requestData);
        } else {
          get_cl_data(req, res, next, requestData);
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  const get_cl_data = async (req, res, next, requestData) => {
    try {
      const response = await CLTransactionSchema.getClTransactionData(
        requestData,
        0,
        0,
      );
      if (!response)
        throw {
          message: 'Error while fetching cl transaction data',
          success: false,
        };
      if (response.length == 0)
        throw {
          message: 'No Record found',
          success: false,
        };
      let total_usage_amount = 0;
      let total_repayment_amount = 0;
      const loanIds = response
        .filter((item) => item.type == 'usage')
        .map((item) => {
          return String(item.loan_id);
        });
      const uniqueLoanIds = [...new Set(loanIds)];
      loanIdsList = await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
      response.forEach(async (row, index) => {
        if (row.txn_entry === 'dr') {
          total_usage_amount += parseFloat(row.txn_amount);
        }
        if (row.txn_entry === 'cr') {
          total_repayment_amount += parseFloat(row.txn_amount);
        }
        //find bi and product config
        if (row.type == 'usage') {
          const capturedBI = await loanIdsList.filter((itemBI) => {
            return itemBI.loan_id === row.loan_id;
          });
          const chargesRes = await calculation.calculateUpfrontCharges(
            capturedBI[0],
            req.product,
            row.txn_amount,
            row.txn_date,
          );
          try {
            row.upfront_deducted_charges = chargesRes.upfront_deducted_charges;
            row.upfront_fees = chargesRes.upfront_fees;
            row.upfront_processing_fees = chargesRes.upfront_processing_fees;
            row.upfront_interest_amount = chargesRes.upfront_interest_amount;
            row.upfront_subvention_fees = chargesRes.upfront_subvention_fees;
            row.upfront_usage_fee = chargesRes.upfront_usage_fee;
            row.fees = chargesRes['fees'];
            row.processing_fees = chargesRes['processing_fees'];
            row.upfront_interest = chargesRes['upfront_interest'];
            row.subvention_fees = chargesRes['subvention_fees'];
            row.usage_fee = chargesRes['usage_fee'];
          } catch (errorConversion) {
            throw errorConversion;
          }
        }
      });
      return res.send({
        data: response,
        total_usage_amount,
        total_repayment_amount,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  };

  app.post(
    '/api/get_borrower_product_dues',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        loan_id = req.body.loan_id;
        const borrowerResp = await BorrowerinfoCommon.findOneWithKLID(loan_id);
        if (!borrowerResp)
          throw {
            message: 'Error while finding borrower info data by loan id',
          };
        const prodRes = await Product.findById(req.product._id);
        if (!prodRes)
          throw {
            message: 'Error while finding product data',
          };
        let duesData = {};
        duesData.fees = borrowerResp.fees
          ? borrowerResp.fees
          : prodRes.fees
          ? prodRes.fees
          : '0UA';
        duesData.subvention_fees = borrowerResp.subvention_fees
          ? borrowerResp.subvention_fees
          : prodRes.subvention_fees
          ? prodRes.subvention_fees
          : '0UA';
        duesData.processing_fees = borrowerResp.processing_fees
          ? borrowerResp.processing_fees
          : prodRes.processing_fees
          ? prodRes.processing_fees
          : '0UA';
        duesData.usage_fee = borrowerResp.usage_fee
          ? borrowerResp.usage_fee
          : prodRes.usage_fee
          ? prodRes.usage_fee
          : '0UA';
        duesData.upfront_interest = borrowerResp.upfront_interest
          ? borrowerResp.upfront_interest
          : prodRes.upfront_interest
          ? prodRes.upfront_interest
          : '0UA';
        duesData.int_value = borrowerResp.int_value
          ? borrowerResp.int_value
          : prodRes.int_value
          ? prodRes.int_value
          : '0A';
        duesData.interest_free_days = borrowerResp.interest_free_days
          ? borrowerResp.interest_free_days
          : prodRes.interest_free_days
          ? prodRes.interest_free_days
          : 0;
        duesData.exclude_interest_till_grace_period =
          borrowerResp.exclude_interest_till_grace_period == 0
            ? prodRes.exclude_interest_till_grace_period == 0
              ? 'false'
              : prodRes.exclude_interest_till_grace_period
            : borrowerResp.exclude_interest_till_grace_period;
        duesData.tenure_in_days = borrowerResp.tenure_in_days
          ? borrowerResp.tenure_in_days
          : prodRes.tenure_in_days
          ? prodRes.tenure_in_days
          : 0;
        duesData.grace_period = borrowerResp.grace_period
          ? borrowerResp.grace_period
          : prodRes.grace_period
          ? prodRes.grace_period
          : 0;
        duesData.overdue_charges_per_day = borrowerResp.overdue_charges_per_day
          ? borrowerResp.overdue_charges_per_day
          : prodRes.overdue_charges_per_day
          ? prodRes.overdue_charges_per_day
          : '0RA';
        duesData.penal_interest = borrowerResp.penal_interest
          ? borrowerResp.penal_interest
          : prodRes.penal_interest
          ? prodRes.penal_interest
          : '0RA';
        duesData.overdue_days = borrowerResp.overdue_days
          ? borrowerResp.overdue_days
          : prodRes.overdue_days
          ? prodRes.overdue_days
          : 0;
        duesData.penal_interest_days = borrowerResp.penal_interest_days
          ? borrowerResp.penal_interest_days
          : prodRes.penal_interest_days
          ? prodRes.penal_interest_days
          : 0;

        return reqUtils.json(req, res, next, 200, {
          success: true,
          dues: duesData,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/transaction_history_list/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const requestData = req.body;
        const page = req.body.page;
        const limit = req.body.limit;
        if (!requestData.loan_id)
          throw {
            success: false,
            message: 'Please provide a valid loan id.',
          };

        const errors = validationResult(req);

        if (!errors.isEmpty())
          return reqUtils.json(req, res, next, 400, {
            success: false,
            message: errors.errors[0]['msg'],
          });
        if (!requestData.company_id)
          throw {
            success: false,
            message: 'Company Id is not valid.',
          };
        if (!requestData.product_id)
          throw {
            success: false,
            message: 'Product Id is not valid.',
          };

        if (requestData.loan_id) {
          const RespBorro = await BorrowerinfoCommon.findOneWithKLID(
            requestData.loan_id,
          );
          if (!RespBorro)
            throw {
              success: false,
              message: 'No loan found against provided loan_id.',
            };
          requestData['is_received'] = { $ne: 'rejected' };

          const response =await CLTransactionSchema.findAllWithCondition(requestData);
          const responseData =await CLTransactionSchema
          .findAllWithCondition(requestData)  
          .sort({ created_at: -1 })
          .limit(limit)
          .skip((page) * limit)
          .exec();

          if (response.length < 1)
            throw {
              success: false,
              message: 'No transaction history found for the data.',
            };

          return res.status(200).send({
            success: true,
            data: {
              rows: responseData,
              count: response.length,
              page: page
            },
          });
        } else {
          throw {
            success: false,
            message: 'Please provide valid loan_id.',
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

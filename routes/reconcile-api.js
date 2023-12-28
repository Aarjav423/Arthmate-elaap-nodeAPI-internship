bodyParser = require('body-parser');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const LoanTransactionSchema = require('../models/loan-transaction-ledger-schema.js');
const LoanValidityCheck = require('../models/loan-validity-schema.js');
const CustomDue = require('../models/custom-dues-schema.js');
const jwt = require('../util/jwt');
const helper = require('../util/helper');
const validate = require('../util/validate-req-body.js');
const AccessLog = require('../util/accessLog');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
let reqUtils = require('../util/req.js');

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
  const processUsage = (usages, usage, repayment) => {
    const lastUsages = usages.filter(
      (x) => x.loan_id == usage.loan_id && x.mapped,
    );
    if (lastUsages.length) {
      lastUsage = lastUsages[lastUsages.length - 1];
      usage['opening_balance'] = (lastUsage['balance_amount'] * 1).toFixed(2);
    } else {
      usage['opening_balance'] = 0;
    }
    let txnAmount = usage.txn_amount - usage['opening_balance'];
    var repayment_date = moment();
    usage['repaid_amount'] = 0;
    if (repayment) {
      usage['repayment_date'] = repayment.txn_date;
      usage['repaid_amount'] = repayment.txn_amount;
      repayment_date = moment(repayment.txn_date, 'YYYY-MM-DD');
    }
    var usageDate = moment(usage.txn_date, 'YYYY-MM-DD');
    var daysPassed = repayment_date.diff(usageDate, 'days');
    var intrest_days = 0;
    var start_charges_day = usage.tenure_in_days * 1 + usage.grace_period * 1;
    if (usage.exclude_interest_till_grace_period * 1) {
      intrest_days =
        daysPassed * 1 > start_charges_day * 1
          ? daysPassed * 1 - start_charges_day * 1
          : 0;
    } else {
      intrest_days =
        daysPassed > usage.interest_free_days
          ? daysPassed * 1 - usage.interest_free_days * 1
          : 0;
    }
    usage['interest_payable'] = 0;
    usage['interest_payable'] =
      usage.int_value.indexOf('P') > -1
        ? txnAmount *
          1 *
          ((usage.int_value.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
          intrest_days
        : usage.int_value.replace(/[a-zA-Z]+/g, '');
    var dpd_days =
      daysPassed > start_charges_day ? daysPassed - start_charges_day : 0;
    if (daysPassed > usage.overdue_days * 1) dpd_days = usage.overdue_days * 1;
    usage['dpd_days'] = dpd_days;
    usage['dpd_payable'] = 0;
    if (dpd_days)
      usage['dpd_payable'] =
        usage.overdue_charges_per_day.indexOf('P') > -1
          ? usage.txn_amount *
            1 *
            ((usage.overdue_charges_per_day.replace(/[a-zA-Z]+/g, '') * 1) /
              100) *
            dpd_days
          : usage.overdue_charges_per_day.replace(/[a-zA-Z]+/g, '') * dpd_days;
    var penal_int_days =
      daysPassed > start_charges_day ? daysPassed - start_charges_day : 0;
    if (daysPassed > usage.penal_interest_days * 1)
      penal_int_days = usage.penal_interest_days * 1;
    usage['penal_interest_payable'] = 0;
    if (penal_int_days)
      usage['penal_interest_payable'] =
        usage.penal_interest.indexOf('P') > -1
          ? usage.txn_amount *
            1 *
            ((usage.penal_interest.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
            penal_int_days
          : usage.penal_interest.replace(/[a-zA-Z]+/g, '') * penal_int_days;
    usage['balance_amount'] = (
      Number(usage['repaid_amount']) -
      (Number(usage['dpd_payable']) +
        Number(usage['penal_interest_payable']) +
        Number(usage['interest_payable']) +
        Number(txnAmount))
    ).toFixed(2);
    usage['mapped'] = true;
    return usage;
  };

  const processNonProcessedRepayment = (lastUsage, repayment) => {
    let positiveBalance = lastUsage['balance_amount'] >= 0;
    var repayment_date = moment();
    lastUsage['repaid_amount'] = 0;
    lastUsage['interest_payable'] = 0;
    lastUsage['dpd_payable'] = 0;
    lastUsage['penal_interest_payable'] = 0;
    if (repayment) {
      lastUsage['repayment_date'] = repayment.txn_date;
      lastUsage['repaid_amount'] = repayment.txn_amount;
      repayment_date = moment(repayment.txn_date, 'YYYY-MM-DD');
    }
    var usageDate = moment(lastUsage.txn_date, 'YYYY-MM-DD');
    var daysPassed = repayment_date.diff(usageDate, 'days');
    var intrest_days = 0;
    var start_charges_day =
      lastUsage.tenure_in_days * 1 + lastUsage.grace_period * 1;
    if (lastUsage.exclude_interest_till_grace_period * 1) {
      intrest_days =
        daysPassed * 1 > start_charges_day * 1
          ? daysPassed * 1 - start_charges_day * 1
          : 0;
    } else {
      intrest_days =
        daysPassed > lastUsage.interest_free_days
          ? daysPassed * 1 - lastUsage.interest_free_days * 1
          : 0;
    }

    lastUsage['interest_payable'] =
      lastUsage.int_value.indexOf('P') > -1
        ? lastUsage.opening_balance *
          1 *
          ((lastUsage.int_value.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
          intrest_days
        : lastUsage.int_value.replace(/[a-zA-Z]+/g, '');

    var dpd_days =
      daysPassed > start_charges_day ? daysPassed - start_charges_day : 0;
    if (daysPassed > lastUsage.overdue_days * 1)
      dpd_days = lastUsage.overdue_days * 1;

    var penal_int_days =
      daysPassed > start_charges_day ? daysPassed - start_charges_day : 0;
    if (daysPassed > lastUsage.penal_interest_days * 1)
      penal_int_days = lastUsage.penal_interest_days * 1;
    if (positiveBalance) {
      if (dpd_days)
        lastUsage['dpd_payable'] =
          lastUsage.overdue_charges_per_day.indexOf('P') > -1
            ? lastUsage.opening_balance *
              1 *
              ((lastUsage.overdue_charges_per_day.replace(/[a-zA-Z]+/g, '') *
                1) /
                100) *
              dpd_days
            : lastUsage.overdue_charges_per_day.replace(/[a-zA-Z]+/g, '') *
              dpd_days;
      if (penal_int_days)
        record['penal_interest_payable'] =
          lastUsage.penal_interest.indexOf('P') > -1
            ? lastUsage.opening_balance *
              1 *
              ((lastUsage.penal_interest.replace(/[a-zA-Z]+/g, '') * 1) / 100) *
              penal_int_days
            : lastUsage.penal_interest.replace(/[a-zA-Z]+/g, '') *
              penal_int_days;
    }

    lastUsage['balance_amount'] =
      Number(lastUsage['repaid_amount']) -
      (Number(lastUsage['dpd_payable']) +
        Number(lastUsage['penal_interest_payable']) +
        Number(lastUsage['interest_payable']) +
        Number(lastUsage['txn_amount']));
    lastUsage['mapped'] = true;
    return lastUsage;
  };

  const processRowLoanWise = (
    processedDataRows,
    lastUsage,
    usage_txn_amount,
    usageCount,
    repay_txn_amount,
    repayCount,
    req,
  ) => {
    const indexProcessed = processedDataRows.findIndex(
      (x) => x.loan_id == lastUsage.loan_id,
    );
    if (indexProcessed > -1) {
      processedDataRows[indexProcessed]['usagesSum'] += usage_txn_amount * 1;
      processedDataRows[indexProcessed]['usagesCount']++;
      processedDataRows[indexProcessed]['reconUsagesSum'] +=
        usage_txn_amount * 1;
      processedDataRows[indexProcessed]['reconUsagesCount'] += usageCount;
      processedDataRows[indexProcessed]['reconRepaymentSum'] +=
        repay_txn_amount * 1;
      processedDataRows[indexProcessed]['reconRepaymentCount'] += repayCount;
      processedDataRows[indexProcessed]['balance_amount'] =
        lastUsage['balance_amount'] || 0;
      processedDataRows[indexProcessed]['txn'].push(lastUsage);
    } else {
      var tempObject = {
        kudos_loan_id: lastUsage.loan_id,
        company_name: req.company.name,
        product_name: req.product.name,
        usagesSum: 0,
        usagesCount: 0,
        repaymentSum: 0,
        repaymentCount: 0,
        reconUsagesSum: 0,
        reconUsagesCount: 0,
        reconRepaymentSum: 0,
        reconRepaymentCount: 0,
      };
      tempObject['usagesSum'] = usage_txn_amount * 1;
      tempObject['usagesCount'] = usageCount;
      tempObject['reconUsagesSum'] = usage_txn_amount * 1;
      tempObject['reconUsagesCount'] = usageCount;
      tempObject['reconRepaymentSum'] = repay_txn_amount * 1;
      tempObject['reconRepaymentCount'] = repayCount;
      tempObject['balance_amount'] = lastUsage['balance_amount'] || 0;
      tempObject['txn'] = [];
      tempObject['txn'].push(lastUsage);
      processedDataRows.push(tempObject);
    }
  };

  app.post('/api/get_cl_demand_data', [
    jwt.verifyToken,
    jwt.verifyCompany,
    jwt.verifyProduct,
    async (req, res, next) => {
      try {
        const reqData = req.body;
        let fromDate = moment(reqData.from_date)
          .startOf('day')
          .format('YYYY-MM-DD');
        let toDate = moment(reqData.to_date).endOf('day').format('YYYY-MM-DD');
        let where = ` `;
        const currDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');

        var query = {};
        if (reqData) {
          query['$and'] = [];
          query['$and'].push({
            company_id: reqData.company_id,
          });
        }
        if (reqData.product_id)
          query['$and'].push({
            product_id: reqData.product_id,
          });
        if (reqData.loan_id)
          query['$and'].push({
            loan_id: reqData.loan_id,
          });

        const respUsageRepayment =
          await CLTransactionSchema.findAllWithCondition(query);

        const loanIds = respUsageRepayment.map((item) => {
          return item.loan_id;
        });
        // Make array of all unique loan ids so that there is no repetition of ids
        const uniqueLoanIds = [...new Set(loanIds)];

        // Check if all the unique loan ids are present in borrower info
        const loanIdsList =
          await BorrowerinfoCommon.findKLIByIds(uniqueLoanIds);
        if (!loanIdsList)
          throw {
            message: 'Error while finding loan ids in borrower info',
          };
        let usages = respUsageRepayment.filter(
          (item) => item.type == 'usage' && item.txn_stage == '06',
        );
        let repayments = respUsageRepayment.filter(
          (item) => item.type == 'repayment' && item.txn_stage == '06',
        );

        usages.sort((a, b) => {
          var dateA = new Date(a.txn_date),
            dateB = new Date(b.txn_date);
          return dateA - dateB;
        });

        repayments.sort((a, b) => {
          var dateA = new Date(a.txn_date),
            dateB = new Date(b.txn_date);
          return dateA - dateB;
        });

        const demandData = {};
        const totalData = {
          usagesSum: 0,
          usagesCount: 0,
          repaymentSum: 0,
          repaymentCount: 0,
          reconUsagesSum: 0,
          reconUsagesCount: 0,
          reconRepaymentSum: 0,
          reconRepaymentCount: 0,
          processedUsagesSum: 0,
          processedUsagesCount: 0,
          processedRepaymentSum: 0,
          processedRepaymentCount: 0,
        };
        let dataRows = [];
        let processedDataRows = [];
        let processedUsage = [];
        const duesToInsert = await helper.createDuesDataOnDemand({
          productData: req.product,
          usages: usages,
          BIList: loanIdsList,
          req,
        });
        if (!duesToInsert)
          throw {
            message: ' Error creating due',
          };
        let lastUsage = null;
        duesToInsert.forEach((usageItem) => {
          //Search for repayment in repayment and mark it as used.
          const index = repayments.findIndex(
            (x) => x.loan_id == usageItem.loan_id && !x.mapped,
          );
          let repayment = null;
          if (index > -1) repayment = repayments[index];
          totalData.processedUsagesSum += usageItem.txn_amount * 1;
          const txnAmount = usageItem.txn_amount * 1;
          totalData.processedUsagesCount =
            totalData.processedUsagesCount * 1 + 1;
          lastUsage = processUsage(processedUsage, usageItem, repayment);
          processedUsage.push(lastUsage);
          var repaid_amount = 0;
          if (repayment) {
            totalData.processedRepaymentSum += repayment.txn_amount * 1;
            totalData.processedRepaymentCount =
              totalData.processedRepaymentCount * 1 + 1;
            repayments[index]['mapped'] = true;
            repaid_amount = repayment.txn_amount * 1;
          }
          processRowLoanWise(
            processedDataRows,
            lastUsage,
            txnAmount,
            1,
            repaid_amount,
            repayment ? 1 : 0,
            req,
          );
        });
        let nonProcessedRepayments = repayments.filter(
          (item) => !item['mapped'],
        );
        nonProcessedRepayments.forEach((repaymentItem) => {
          const lastUsages = usages.filter(
            (x) => x.loan_id == repaymentItem.loan_id && x.mapped,
          );
          totalData.processedRepaymentSum += repaymentItem.txn_amount * 1;
          totalData.processedRepaymentCount =
            totalData.processedRepaymentCount * 1 + 1;
          if (lastUsages.length) {
            const repayAmount = repaymentItem.txn_amount;
            processNonProcessedRepayment(
              lastUsages[lastUsages.length - 1],
              repaymentItem,
            );
            let lastRepayment = processUsage(
              processedUsage,
              usageItem,
              repayment,
            );
            processedUsage.push(lastRepayment);
            repaymentItem['mapped'] = true;
            processRowLoanWise(
              processedDataRows,
              lastUsage,
              0,
              0,
              repayAmount,
              1,
              req,
            );
          }
        });
        return reqUtils.json(req, res, next, 200, {
          success: true,
          processedDataRows: processedDataRows,
          totalData,
          success: true,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  ]);

  app.post(
    '/api/make_loan',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const reqData = req.body[0];
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');
        //request data will be validated according to this data
        const template = [
          {
            field: 'loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid loan id.',
          },
          {
            field: 'borrower_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid  borrower id.',
          },
          {
            field: 'partner_loan_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid partner loan id.',
          },
          {
            field: 'partner_borrower_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid partner borrower id.',
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
            field: 'txn_id',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter valid txn_id.',
          },
          {
            field: 'type',
            type: 'usage',
            checked: 'FALSE',
            validationmsg: 'Please enter valid transaction type usage',
          },
          {
            field: 'txn_date',
            type: 'date',
            checked: 'TRUE',
            validationmsg: 'Please enter valid txn_date (YYYY-MM-DD).',
          },
          {
            field: 'ac_holder_name',
            type: 'string',
            checked: 'TRUE',
            validationmsg: 'Please enter account holder name',
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
            field: 'dues',
            type: 'duesArray',
            checked: 'TRUE',
            validationmsg:
              'dues array should have at least 1 element, and should have all fields with values.',
          },
          {
            field: 'vpa_id',
            type: 'vpa',
            checked: 'FALSE',
            validationmsg: 'Please enter valid vpa_id.',
          },
          {
            field: 'txn_stage',
            type: 'string',
            checked: 'FALSE',
            validationmsg: 'Please enter valid txn_stage.',
          },
          {
            field: 'txn_ids',
            type: 'duesArray',
            checked: 'TRUE',
            validationmsg: 'txn_ids array should have at least 1 element.',
          },
        ];
        const result = await validate.validateDataWithTemplate(template, [
          reqData,
        ]);
        if (!result)
          throw {
            message: 'Error while validating data.',
          };
        if (result.unknownColumns.length) {
          return reqUtils.json(req, res, next, 400, {
            message: 'Few columns are unknown',
            errorCode: '03',
            data: {
              unknownColumns: result.unknownColumns,
            },
            success: false,
          });
        }
        if (result.missingColumns.length) {
          return reqUtils.json(req, res, next, 400, {
            message: 'Few columns are missing',
            errorCode: '01',
            data: {
              missingColumns: result.missingColumns,
            },
            success: false,
          });
        }
        if (result.errorRows.length) {
          return reqUtils.json(req, res, next, 400, {
            message: 'Few fields have invalid data',
            errorCode: '02',
            data: {
              exactErrorRows: result.exactErrorColumns,
              errorRows: result.errorRows,
            },
            success: false,
          });
        }

        //Check if txn_amount and sum of dues principal_amount is matching
        let principalNotMatchingUsage = [];
        let erroredUsage = [];
        if (reqData.dues) {
          let usageDuesPricipalSum = 0;
          reqData.dues.forEach((dueItem) => {
            const validationDues = helper.checkDuesArray(dueItem);
            if (validationDues.items.length)
              erroredUsage.push({
                usage: reqData,
                validationError: validationDues.items,
              });
            usageDuesPricipalSum += dueItem.principal_amount * 1;
          });
          if (
            Math.round(usageDuesPricipalSum) * 1 !==
            Math.round(reqData.txn_amount) * 1
          )
            principalNotMatchingUsage.push(reqData);
        }
        if (erroredUsage.length) {
          return reqUtils.json(req, res, next, 400, {
            message: 'Dues element have incorrect data',
            items: erroredUsage,
            success: false,
          });
        }

        if (principalNotMatchingUsage.length) {
          return reqUtils.json(req, res, next, 400, {
            message:
              'Usage txn_amount and dues principal_amount is not matching',
            errorCode: '01',
            data: {
              principalNotMatchingUsage: principalNotMatchingUsage,
            },
            success: false,
          });
        }

        if (reqData.txn_date > currentDate)
          return reqUtils.json(req, res, next, 400, {
            message:
              'txn_dates are from future hence we can not add records in transaction ledger.',
            errorCode: '01',
            data: reqData.txn_date,
            success: false,
          });

        const borrowResp = await BorrowerinfoCommon.findOneWithKLID(
          reqData.loan_id,
        );
        if (!borrowResp)
          throw {
            message: 'Error finding  loan ids in borrower info',
          };
        if (req.company._id !== borrowResp.company_id)
          throw {
            message: 'Company id is not associated with loan ids',
          };
        if (req.product._id !== borrowResp.product_id)
          throw {
            message: 'Product id is not associated with  loan ids.',
          };

        const validityResp = await checkLoanValidity(result.validatedRows);
        if (!validityResp)
          throw {
            message: 'Error while checking loan validity',
          };

        const loanIdWithTxn = await LoanTransactionSchema.findByTransactionids(
          reqData.txn_ids,
        );
        if (!loanIdWithTxn)
          throw {
            message: 'Error while finding transactions id',
          };
        if (
          loanIdWithTxn.filter(
            (item, index) => loanIdWithTxn.indexOf(item) != index,
          ).length != 0
        )
          throw {
            message: 'Some transaction ids are duplicate',
          };
        if (loanIdWithTxn.length != reqData.txn_ids.length)
          throw {
            message: 'Some transaction ids are incorrect.',
            data: loanIdWithTxn,
            success: false,
          };

        const txnResp = await LoanTransactionSchema.findOneTxnId(
          reqData.txn_id,
        );
        if (txnResp)
          throw {
            message: 'txn_id is already exists.',
          };

        let loanIds = [];
        let sameMonth = [];
        let txn_amount = 0;
        let checkMakeLoan = [];
        let stage = [];
        loanIdWithTxn.forEach((item) => {
          loanIds.push(item.loan_id);
          const date = new Date(item.txn_date);
          const month = date.getMonth() + 1;
          sameMonth.push(month);
          txn_amount += parseFloat(item.txn_amount);
          if (item.loan_usage_id) checkMakeLoan.push(item.loan_usage_id);
          if (item.txn_stage !== '01') stage.push(item.txn_id);
        });
        if (stage.length)
          throw {
            message: ' Some txn_ids are not in a Initiated stage.',
          };

        const uniqueLoanIds = [...new Set(loanIds)];
        if (uniqueLoanIds.length > 2)
          throw {
            message:
              'txn_ids have different loan id. Please send only one loan id txn_ids list.',
          };
        const uniqueMonth = [...new Set(sameMonth)];
        if (uniqueMonth.length > 2)
          throw {
            message: 'txn_dates should be in a same month. ',
          };
        if (
          parseFloat(reqData.txn_amount).toFixed(2) !=
          parseFloat(txn_amount).toFixed(2)
        )
          throw {
            message: 'txn_amount is not matched with txn_ids amount',
          };

        if (checkMakeLoan.length)
          throw {
            message: 'Some txn_ids has already loan booked. ',
          };

        if (borrowResp.stage <= 2 && borrowResp.status != 'disbursed')
          helper.markLoansDisbursed([
            {
              loan_id: reqData.loan_id,
              borrower_id: reqData.borrower_id,
            },
          ]);
        let ledgerObj = {};
        ledgerObj.loan_id = reqData.loan_id.toString().replace(/\s/g, '');
        ledgerObj.borrower_id = reqData.borrower_id;
        ledgerObj.partner_loan_id = reqData.partner_loan_id;
        ledgerObj.partner_borrower_id = reqData.partner_borrower_id;
        ledgerObj.txn_amount = reqData.txn_amount;
        ledgerObj.txn_date = reqData.txn_date || moment().format('YYYY-MM-DD');
        ledgerObj.vpa_id = reqData.vpa_id || '';
        ledgerObj.ac_holder_name = reqData.ac_holder_name;
        ledgerObj.bookking_txn_id =
          'BOKTXN' + Date.now() + Math.floor(1000 + Math.random() * 9999);
        ledgerObj.type = reqData.type || 'usage';
        ledgerObj.txn_entry = 'dr';
        ledgerObj.company_id = req.company._id;
        ledgerObj.company_name = req.company.name;
        ledgerObj.product_id = req.product._id;
        ledgerObj.txn_id = reqData.txn_id;
        ledgerObj.txn_reference = reqData.txn_reference
          ? reqData.txn_reference
          : '';
        ledgerObj.invoice_status = 'pending';
        ledgerObj.label = reqData.label;
        ledgerObj.txn_stage = reqData.txn_stage ? reqData.txn_stage : '08';
        ledgerObj.initiated_date =
          reqData.txn_date || moment().format('YYYY-MM-DD');
        ledgerObj.custom_due = 1;
        const respUsageAdd = await LoanTransactionSchema.addInBulk([ledgerObj]);
        if (!respUsageAdd)
          throw {
            message: 'Error while adding data in ledger',
          };
        const customDuesArray = [];
        reqData.dues.map((item) => {
          let customDuesobject = {};
          for (i = 0; i < 1; i++) {
            customDuesobject = {
              loan_id: reqData.loan_id,
              partner_loan_id: reqData.partner_loan_id,
              usage_id: respUsageAdd._id,
              company_id: req.company._id,
              product_id: req.product._id,
              txn_id: reqData.txn_id,
              txn_date: reqData.txn_date,
              due_date: moment(reqData.txn_date)
                .add(item.tenure_in_days * 1, 'days')
                .format('YYYY-MM-DD'),
              principal_amount: item.principal_amount,
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
        const respCustomAdd = await CustomDue.addInBulk(customDuesArray);
        if (!respCustomAdd)
          throw {
            message: 'Error while adding custom dues data in ledger.',
          };
        let txn_ids = [];
        reqData.txn_ids.forEach((item) => {
          let txn_id = {
            txn_id: item,
          };
          txn_ids.push(txn_id);
        });
        const clUpdateResp = await LoanTransactionSchema.bulkUpdate(txn_ids, {
          loan_usage_id: reqData.txn_id,
          txn_stage: '07',
        });
        if (!clUpdateResp)
          throw {
            message: 'Error while updating loan usage id.',
          };
        return reqUtils.json(req, res, next, 200, {
          message: `Successfully inserted records in transaction ledger`,
          success: true,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

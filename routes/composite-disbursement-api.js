bodyParser = require('body-parser');
const LoanTransactionLedgerSchema = require('../models/loan-transaction-ledger-schema');
const Disbursement = require('../models/disbursements-schema.js');
const DisbursementChannelConfig = require('../models/disbursement-channel-config-schema');
const LoanDocumentCommonSchema = require('../models/loandocument-common-schema.js');
const DisbursementChannelMasterScehema = require('../models/disbursement-channel-master-schema.js');
const DisbursementLedgerSchema = require('../models/disbursement-ledger-schema');
const BorrowerinfoCommonSchema = require('../models/borrowerinfo-common-schema');
const ColenderSchema = require('../models/co-lender-profile-schema');
const jwt = require('../util/jwt');

const AccessLog = require('../util/accessLog');
const { check, validationResult } = require('express-validator');
const CONSTANT = {
  type: 'Loan Disbursement',
};
const axios = require('axios');
const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const moment = require('moment');
const helper = require('../util/helper');
const borrowerHelper = require('../util/borrower-helper.js');

module.exports = (app, connection) => {
  const checkDisbursementChannelBalance = async (
    company_id,
    product_id,
    disbursement_channel,
  ) => {
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    const channelTransactions = await DisbursementLedgerSchema.findByCondition({
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

  app.get(
    '/api/disbursement_status/:_loan_id',
    [
      jwt.verifyToken,
      jwt.verifyUser,
      jwt.verifyCompany,
      jwt.verifyProduct,
      AccessLog.maintainAccessLog,
    ],
    async (req, res, next) => {
      try {
        const record = await BorrowerinfoCommonSchema.findOneWithKLID(
          req.params._loan_id,
        );
        if (!record)
          throw {
            success: false,
            message: 'No record found',
          };
        if (record.status !== 'disbursed')
          throw {
            success: false,
            message: `Loan is currently in ${record.status}`,
          };

        const colenderWithFullShareIds = Array.from(
          process.env.COLENDER_WITH_FULL_SHARE_IDS.split(','),
        ).map((number) => parseInt(number));
        if (colenderWithFullShareIds.includes(record.co_lender_id)) {
          const P2PLedgerRecord =
            await LoanTransactionLedgerSchema.findByLoanIDLabel(
              req.params._loan_id,
              'disbursement',
            );
          if (!P2PLedgerRecord) {
            throw {
              message:
                'No record found in loan transaction ledger,kindly contact administrator',
            };
          }
          const responseObj = {
            success: true,
            data: {
              loan_id: record.loan_id,
              partner_loan_id: record.partner_loan_id,
              status_code: P2PLedgerRecord.webhook_status_code || '',
              net_disbur_amt: P2PLedgerRecord.txn_amount || '',
              utr_number: P2PLedgerRecord.utr_number || '',
              utr_date_time_stamp: P2PLedgerRecord.utr_date_time_stamp || '',
            },
          };

          return res.status(200).send(responseObj);
        }
        const disbursementLedgerRecord =
          await DisbursementLedgerSchema.findByLoanId(req.params._loan_id);

        if (!disbursementLedgerRecord)
          throw {
            success: false,
            message: `No record found in disbursement ledger, kindly contact administrator`,
          };

        return res.status(200).send({
          success: true,
          data: {
            loan_id: record.loan_id,
            partner_loan_id: record.partner_loan_id,
            status_code: disbursementLedgerRecord.webhook_status_code || '',
            net_disbur_amt: disbursementLedgerRecord.amount || '',
            utr_number: disbursementLedgerRecord.utrn_number || '',
            utr_date_time:
              disbursementLedgerRecord.disbursement_date_time || '',
          },
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/get-loans-by-status',
    [jwt.verifyToken],
    [
      check('company_id').notEmpty().withMessage('company_id is required'),
      check('product_id').notEmpty().withMessage('product_id is required'),
    ],
    async (req, res) => {
      try {
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        const { company_id, product_id, page, limit } = req.body;
        // Fetch disbursal approved records according to the filters
        if (req.body?.co_lend_flag !== 'Y') {
          const disbursementChannel =
            await DisbursementChannelConfig.getDisburseChannel({
              company_id: company_id,
              product_id: product_id,
            });

          if (!disbursementChannel)
            throw {
              success: false,
              message: `Disburse channel is not configured for selected company,product and flag `,
            };
          const disbursementChannelMaster =
            await DisbursementChannelMasterScehema.findOneByTitle(
              disbursementChannel.disburse_channel,
            );
          if (!disbursementChannelMaster)
            throw {
              success: false,
              message: `Global disbursement channel not found`,
            };
          const availableChannelBalance = await checkDisbursementChannelBalance(
            company_id,
            product_id,
            disbursementChannelMaster.title,
          );

          const disbursalApprovedRecords =
            await BorrowerinfoCommonSchema.getFilteredDisbursalApprovedalRecords(
              req.body,
            );
          if (!disbursalApprovedRecords?.rows?.length)
            throw {
              success: false,
              message: `No ${
                helper.statusToDisplay[req.body.status]
              } records found against provided filter.`,
            };

          await Promise.all(
            disbursalApprovedRecords?.rows?.map(
              async (ele) =>
                (ele.channel = disbursementChannel?.disburse_channel),
            ),
          );

          disbursalApprovedRecords.availableBalance = availableChannelBalance;
          disbursalApprovedRecords.walletConfigCheck =
            disbursementChannel.wallet_config_check;

          return res.status(200).send(disbursalApprovedRecords);
        }
        if (req.body.co_lend_flag === 'Y') {
          const disbursalApprovedRecords =
            await BorrowerinfoCommonSchema.getFilteredDisbursalApprovedalRecords(
              req.body,
            );
          if (!disbursalApprovedRecords?.rows?.length)
            throw {
              success: false,
              message: `No ${
                helper.statusToDisplay[req.body.status]
              } records found against provided filter.`,
            };

          await Promise.all(
            disbursalApprovedRecords?.rows?.map(
              async (ele) =>
                (ele.channel = (
                  await DisbursementChannelConfig.findByColenderId(
                    ele.co_lender_id,
                  )
                )?.disburse_channel),
            ),
          );

          for await (let ele of disbursalApprovedRecords?.rows) {
            let disbursementChannelConfig =
              await DisbursementChannelConfig.findByColenderId(
                ele.co_lender_id,
              );
            if (!disbursementChannelConfig) {
              throw {
                success: false,
                message: `Disburse channel is not configured for selected colender`,
              };
            }
            let disbChannel = (
              await DisbursementChannelConfig.findByColenderId(ele.co_lender_id)
            )?.disburse_channel;
            if (!disbChannel) {
              throw {
                success: false,
                message: `Global disbursement channel not found`,
              };
            }
          }
          disbursalApprovedRecords.availableBalance = '';
          disbursalApprovedRecords.walletConfigCheck = '0';

          return res.status(200).send(disbursalApprovedRecords);
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.post(
    '/api/composite_disbursement',
    [
      check('loan_id').notEmpty().withMessage('loan_id is required'),
      check('loan_app_id').notEmpty().withMessage('loan_id is required'),
      check('borrower_id').notEmpty().withMessage('borrower_id is required'),
      check('partner_loan_id')
        .notEmpty()
        .withMessage('partner_loan_id is required'),
      check('partner_borrower_id')
        .notEmpty()
        .withMessage('partner_borrower_id is required'),
      check('borrower_mobile')
        .notEmpty()
        .withMessage('borrower_mobile is required')
        .isLength({
          min: 10,
          max: 10,
        })
        .withMessage('Please enter valid 10 digit borrower_mobile')
        .isNumeric()
        .withMessage('borrower_mobile should be numeric'),
      check('txn_date')
        .notEmpty()
        .withMessage('txn_date is required')
        .matches(/^(\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$)/)
        .withMessage('Please enter valid txn_date in YYYY-MM-DD format'),
      check('sanction_amount')
        .notEmpty()
        .withMessage('sanction_amount is required')
        .isLength({
          min: 2,
          max: 30,
        })
        .withMessage('Please enter valid sanction_amount')
        .isNumeric()
        .withMessage('sanction_amount should be numeric'),
      check('net_disbur_amt')
        .notEmpty()
        .withMessage('net_disbur_amt is required')
        .isLength({
          min: 2,
          max: 30,
        })
        .withMessage('Please enter valid net_disbur_amount')
        .isNumeric()
        .withMessage('net_disbur_amount should be numeric'),
    ],
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      const reqData = req.body;
      //check whether the loan exist by ids provided in payload.
      const loanExist = await BorrowerinfoCommon.findByCondition({
        loan_id: reqData.loan_id,
        loan_app_id: reqData.loan_app_id,
        partner_loan_id: reqData.partner_loan_id,
        partner_borrower_id: reqData.partner_borrower_id,
        borrower_id: reqData.borrower_id,
      });
      if (!loanExist)
        throw {
          success: false,
          message: 'Loan does not exist for provided data',
        };
      let existingStatus = loanExist.status;
      try {
        //validate the data in api payload
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            success: false,
            message: errors.errors[0]['msg'],
          });
        // Return if allow_loc flag is true in product
        if (req.product.allow_loc === 1)
          throw {
            success: false,
            message:
              "As provided product is line of credit can't make call to composite disbursement ",
          };

        // Validate company_id and product_id with token
        const validateCompanyProductWithLAID =
          await jwt.verifyLoanAppIdCompanyProduct(req, loanExist.loan_app_id);
        if (!validateCompanyProductWithLAID.success)
          throw validateCompanyProductWithLAID;

        //validate if the loan status is disbursal_approved.
        if (loanExist.status !== 'disbursal_approved' || loanExist.stage !== 3)
          throw {
            success: false,
            message:
              'Unable to initiate the disbursement as loan is not in disbursal_approved status',
          };

        //validate the sanction_amount with the sanction_amount in existing loan.
        if (
          Number(reqData.sanction_amount) !== Number(loanExist.sanction_amount)
        ) {
          throw {
            success: false,
            message: 'Sanctioned Amount does not match for Loan ID.',
          };
        }
        // validate the net_disbur_amount with the net_disbur_amount in existing loan.
        if (
          Number(reqData.net_disbur_amt) !== Number(loanExist.net_disbur_amt)
        ) {
          throw {
            success: false,
            message: 'Net Disbursement Amount does not match for Loan ID.',
          };
        }
        //validate if the agreement is uploaded in the loandocuments
        const validateAgreement =
          await LoanDocumentCommonSchema.findByCondition({
            loan_app_id: reqData.loan_app_id,
            file_type: 'agreement',
          });

        //validate if the loan_sanction_letter is uploaded in the loandocuments
        const validateLoanSactionLetter =
          await LoanDocumentCommonSchema.findByCondition({
            loan_app_id: reqData.loan_app_id,
            file_type: 'loan_sanction_letter',
          });
        if (!validateAgreement || !validateLoanSactionLetter)
          throw {
            success: false,
            message:
              'Agreement and loan sanction letter is required to initiate disbursement.',
          };
        //validate if the repayment_schedule is uploaded before disbursement initiate
        //after successful validations make the loan status as disbursal_pending
        let updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
          { status: 'disbursal_pending', stage: '31' },
          reqData.loan_id,
        );
        //Record loan status change logs

        const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
          req,
          reqData.loan_id,
          existingStatus,
          'disbursal_pending',
          req.authData.type === 'service' ? 'system' : req.authData.type,
        );
        if (!maintainStatusLogs.success) throw maintainStatusLogs;
        existingStatus = updateLoanStatus.status;
        let disbursementChannel;

        //If loan is booked under colender check for the disbursement channel configured for colender.
        if (loanExist.co_lend_flag === "Y") {
          //Check if colender exist by id.
          const colenderData = await ColenderSchema.findByColenderId(
            loanExist.co_lender_id,
          );
          if (!colenderData)
            throw {
              success: false,
              message: 'No records found against colender_id.',
            };
          disbursementChannel =
            await DisbursementChannelConfig.findByColenderId(
              loanExist.co_lender_id,
            );
          if (!disbursementChannel) {
            throw {
              success: false,
              message: `Disburse channel is not configured for ${colenderData.co_lender_name}.`,
            };
          }
        } else {
          //Check whether the disbursement channel is configured against company and product.
          disbursementChannel =
            await DisbursementChannelConfig.getDisburseChannel({
              company_id: req.company._id,
              product_id: req.product._id,
            });
          if (!disbursementChannel) {
            throw {
              success: false,
              message: `Disburse channel is not configured for ${req.company.name} `,
            };
          }
        }
        const disbursementChannelMaster =
          await DisbursementChannelMasterScehema.findOneByTitle(
            disbursementChannel.disburse_channel,
          );
        if (!disbursementChannelMaster)
          throw {
            success: false,
            message: `Global disbursement channel not found`,
          };

        if (!Number(disbursementChannelMaster.status))
          throw {
            success: false,
            message: `Global disbursement channel is not active, kindly contact system administrator.`,
          };
        if (!disbursementChannel)
          throw {
            success: false,
            message: `Product don't have this channel configured , kindly contact system administrator.`,
          };

        if (!Number(disbursementChannel.status))
          throw {
            success: false,
            message: `Disburse channel config for this product is not active, kindly contact system administrator.`,
          };

        if (disbursementChannel.wallet_config_check === '1') {
          const availableChannelBalance = await checkDisbursementChannelBalance(
            req.company._id,
            req.product._id,
            disbursementChannelMaster.title,
          );
          if (
            parseFloat(availableChannelBalance) <
            parseFloat(reqData.net_disbur_amt)
          ) {
            throw {
              success: false,
              message:
                'Insufficient balance, kindly top up disbursement channel',
            };
          }
        }
        //Check if disbursement request already in progress
        const disbursementAlreadyInitiated =
          await DisbursementLedgerSchema.findNonFailedRequest(reqData.loan_id);
        if (disbursementAlreadyInitiated)
          throw {
            success: false,
            message: 'disbursement request is already initiated',
          };
        reqData.product_id = req.product._id;
        reqData.company_name = req.company.name;
        reqData.code = req.company.code;
        reqData.company_id = req.company._id;
        reqData.txn_id = `${reqData.loan_id}${new Date().getTime()}`;
        reqData.disburse_channel = disbursementChannelMaster.title;
        reqData.amount = reqData.net_disbur_amt;
        reqData.debit_account_no = disbursementChannel.debit_account;
        reqData.debit_ifsc = disbursementChannel.debit_account_ifsc;
        reqData.debit_trn_remarks = reqData.loan_id;
        reqData.beneficiary_ifsc = loanExist.bene_bank_ifsc;
        reqData.beneficiary_account_no = loanExist.bene_bank_acc_num;
        reqData.beneficiary_name = loanExist.bene_bank_account_holder_name;
        reqData.mode_of_pay = 'PA';
        reqData.webhook_link = process.env.WIREOUT_URL;
        reqData.access_token = process.env.WIREOUT_SECRET;
        const config = {
          method: 'post',
          url: disbursementChannelMaster.endpoint,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${disbursementChannelMaster.secret_key}`,
          },
          data: reqData,
        };
        const disbursementResponse = await axios(config);
        if (disbursementResponse.data) {
          //after response from bank disbursement api make the loan status as disbursement_initiated
          updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
            { status: 'disbursement_initiated', stage: '32' },
            reqData.loan_id,
          );

          //Record loan status change logs
          const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
            req,
            reqData.loan_id,
            existingStatus,
            'disbursement_initiated',
            req.authData.type === 'service' ? 'system' : req.authData.type,
          );
          if (!maintainStatusLogs.success) throw maintainStatusLogs;

          //Make debit entry in  disbursement_and_topup schema
          const disbursementDebitData = {
            company_id: req.company._id,
            product_id: req.product._id,
            disbursement_channel: disbursementChannelMaster.title,
            txn_id: reqData.txn_id,
            amount: reqData.net_disbur_amt,
            loan_id: reqData.loan_id,
            borrower_id: reqData.borrower_id,
            partner_loan_id: reqData.partner_loan_id,
            partner_borrower_id: reqData.partner_borrower_id,
            txn_date: reqData.txn_date,
            bank_name: loanExist.bene_bank_account_holder_name,
            bank_account_no: loanExist.bene_bank_acc_num,
            bank_ifsc_code: loanExist.bene_bank_ifsc,
            borrower_mobile: reqData.borrower_mobile,
            txn_entry: 'dr',
            txn_stage: '',
            label_type: reqData.label_type,
          };

          const recordDebit = await DisbursementLedgerSchema.addNew(
            disbursementDebitData,
          );
          return res.status(200).send({
            loan_id: reqData.loan_id,
            partner_loan_id: reqData.partner_loan_id,
            response: disbursementResponse.data,
          });
        } else {
          throw { success: false, message: 'Error while disbursing the loan' };
        }
      } catch (error) {
        if (error.response?.status.toString().indexOf('4') > -1) {
          let updateLoanStatus = await BorrowerinfoCommon.updateLoanStatus(
            { status: 'disbursal_approved', stage: '3' },
            reqData.loan_id,
          );
          //Record loan status change logs
          const maintainStatusLogs = await borrowerHelper.recordStatusLogs(
            req,
            reqData.loan_id,
            existingStatus,
            'disbursal_approved',
            req.user.email,
          );
          if (!maintainStatusLogs.success) throw maintainStatusLogs;
        }
        if (error.code === 'ECONNREFUSED') {
          return res.status(400).send({
            success: false,
            message: 'Service unavailable. Please try again later.',
          });
        }
        return res.status(400).send(error);
      }
    },
    AccessLog.maintainAccessLog,
  );
};

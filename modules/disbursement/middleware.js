const {
  verifyToken,
  verifyProduct,
  verifyCompany,
  verifyUser,
} = require('../../util/jwt');

const {
  findLoanDocumentByCondition,
  isLoanExistByLID,
  findByColenderId,
  getDisburseChannel,
  findDisbursementChannelMasterByTitle,
  findNonFailedRequest,
  findEntryForDebit,
  findEntry,
  findCashCollaterals,
  findByLIDAndUsageId,
  findByLoanIdAndRequestId,
} = require('./helper');
const { validationResult } = require('express-validator');
const { checkDisbursementChannelBalance } = require('./utils');

const { disbursementType } = require('./constant');
const validateReq = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({
        success: false,
        message: errors.errors[0]['msg'],
      });

    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while validating Request Body',
    });
  }
};

const isProductLoc = async (req, res, next) => {
  try {
    // await verifyProduct();
    if (req.product.allow_loc == 1) {
      if (
        !req.body.loc_drawdown_usage_id ||
        !req.body.loc_drawdown_request_id
      ) {
        throw {
          success: false,
          message:
            'Product is Loc ,please provide usage Id and drawdown request id',
        };
      }
      //find DrawdownRequest ID
      let locData = await findByLoanIdAndRequestId(
        req.body.loan_id,
        req.body.loc_drawdown_request_id,
      );
      if (!locData) {
        throw {
          success: false,
          message:
            'Product is Loc ,no Drawdown Data found against the provided Loan Id and Drawdown Request Id',
        };
      }
      req.locDrawdownData = locData;
    }
    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while validating Product is Loc',
    });
  }
};

const isProductCashCollateral = async (req, res, next) => {
  try {
    // await verifyProduct();
    if (!req.product.cash_collateral) {
      throw {
        success: false,
        message: 'Product is not cash Collateral',
      };
    }
    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while validating Product is Loc',
    });
  }
};

//validate loan status is in disbursal_approved and Net disbursment Amount.
const validateLoanStatusAndNetDisbursmentAmount = async (req, res, next) => {
  try {
    // await isLoanExistByLID();
    if (
      req.body.disbursmentType &&
      req.body.disbursmentType == disbursementType.CASHCOLLATERAL &&
      req.product.cash_collateral
    ) {
      let filter = {
        loan_id: req.body.loan_id,
      };
      if (req.product.allow_loc == 1) {
        filter['loc_drawdown_usage_id'] = req.body.loc_drawdown_usage_id;
      }
      const findCashCollateralsData = await findCashCollaterals({
        ...filter,
      });
      if (findCashCollateralsData.length == 0) {
        throw {
          success: false,
          message: 'Data not found for cash collateral',
        };
      }
      if (findCashCollateralsData[0].is_processed == 'Y') {
        throw {
          success: false,
          message: 'Withheld amount already processed',
        };
      }
      //Validate net disbursment amount with witheld amount
      let withheld_amt;
      if (req.product.allow_loc == 1) {
        //Validate amount here
        let {withheld_amount}=req.locDrawdownData
        withheld_amt = withheld_amount;
      } else {
        withheld_amt = req.loanData.withheld_amt;
      }
      if (
        req.body &&
        req.body.net_disbur_amt &&
        Number(req.body.net_disbur_amt) !== Number(withheld_amt)
      ) {
        throw {
          success: false,
          message: 'Withheld amount does not match for Loan ID.',
        };
      }
    } else if (req.body.disbursmentType) {
      throw {
        success: false,
        message: 'Not a Valid disbursmentType Provided',
      };
    }

    //Applicable for checking on first-Disbursement

    if (
      req.isFirstRequest &&
      (req.loanData.status !== 'disbursal_approved' || req.loanData.stage !== 3)
    )
      throw {
        success: false,
        message:
          'Unable to initiate the disbursement as loan is not in disbursal_approved status',
      };

    // if (
    //   req.body &&req.product.isLoc!=1&&
    //   req.body.net_disbur_amt &
    //   (Number(req.body.net_disbur_amt) !== Number(req.loanData.net_disbur_amt))
    // ) {
    //   throw {
    //     success: false,
    //     message: 'Net Disbursement Amount does not match for Loan ID.',
    //   };
    // }

    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message:
        error.message ||
        'Error while validating loan status and net disbursment Amount',
    });
  }
};

const validateAgreementAndValidateSanctionLetter = async (req, res, next) => {
  try {
    if (!req.body.loan_app_id) {
      throw {
        success: false,
        message: 'Please provide Lead ID',
      };
    }
    const validateAgreement = await findLoanDocumentByCondition({
      loan_app_id: req.body.loan_app_id,
      file_type: 'agreement',
    });

    //validate if the loan_sanction_letter is uploaded in the loandocuments
    const validateLoanSactionLetter = await findLoanDocumentByCondition({
      loan_app_id: req.body.loan_app_id,
      file_type: 'loan_sanction_letter',
    });

    if (!validateAgreement || !validateLoanSactionLetter)
      throw {
        success: false,
        message:
          'Agreement and loan sanction letter is required to initiate disbursement.',
      };

    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message:
        error.message || 'Error while validating agreement and sanction letter',
    });
  }
};

const findDisbursmentChannelAndBalance = async (req, res, next) => {
  try {
    let loanData = req.loanData;
    if (!loanData) {
      throw {
        success: false,
        message: no,
      };
    }
    let { co_lender_id, co_lend_flag, product_id, company_id } = loanData;
    let disbursementChannel;
    if (co_lend_flag === 'Y') {
      disbursementChannel = await findByColenderId(co_lender_id);
    } else {
      disbursementChannel = await getDisburseChannel({
        company_id,
        product_id,
      });
    }
    if (!disbursementChannel) {
      throw {
        success: false,
        message: `Disburse channel is not configured.`,
      };
    }
    const disbursementChannelMaster =
      await findDisbursementChannelMasterByTitle(
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
        parseFloat(req.body.net_disbur_amt)
      ) {
        throw {
          success: false,
          message: 'Insufficient balance, kindly top up disbursement channel',
        };
      }
    }

    req.disbursementChannel = disbursementChannel;
    req.disbursementChannelMaster = disbursementChannelMaster;

    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while finding disbursment channel',
    });
  }
};

const checkForExistingDisbursedLoan = async (req, res, next) => {
  try {
    if (
      req.body.disbursmentType &&
      req.body.disbursmentType == disbursementType.CASHCOLLATERAL &&
      req.product.cash_collateral
    ) {
      const disbursementAlreadyInitiated = await findEntryForDebit(
        req.body.loan_id,
      );
      if (disbursementAlreadyInitiated.length == 0) {
        throw {
          success: false,
          message: 'No primary disbursement found',
        };
      }
      req.isFirstRequest =
        disbursementAlreadyInitiated.length > 0 ? false : true;
      next();
    } else {
      await findIfNonFailedRequestAlreadyExists(req, res, next);
    }
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while finding disbursment channel',
    });
  }
};
//This function is used for first disbursement tranches
const findIfNonFailedRequestAlreadyExists = async (req, res, next) => {
  try {
    if (!req.body.loan_id) {
      throw {
        success: false,
        message: 'Please provide loan Id',
      };
    }
    const disbursementAlreadyInitiated = await findEntryForDebit(
      req.body.loan_id,
    );
    if (disbursementAlreadyInitiated.length > 0)
      throw {
        success: false,
        message: 'disbursement request is already initiated',
      };

    req.isFirstRequest = disbursementAlreadyInitiated.length > 0 ? false : true;
    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while finding disbursment channel',
    });
  }
};

const isLoanClosed = async (req, res, next) => {
  try {
    if (req.product.allow_loc == 1) {
      let data = await findByLIDAndUsageId({
        loan_id: req.body.loan_id,
        usage_id: req.body.loc_drawdown_usage_id,
      });
      if (!data) {
        throw {
          success: false,
          message: 'Data not found against provided Loan Id and usage Id',
        };
      } else if (data.status != 'Closed') {
        throw {
          success: false,
          message:
            'Unable to initiate the disbursement as line Drawdown Request is not in closed status',
        };
      }
    } else if (req.loanData.stage !== 999)
      throw {
        success: false,
        message:
          'Unable to initiate the disbursement as loan is not in closed status',
      };
    next();
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message || 'Error while checking loan closed',
    });
  }
};

module.exports = {
  verifyCompany,
  verifyUser,
  verifyProduct,
  verifyToken,
  isProductLoc,
  isLoanExistByLID,
  validateReq,
  validateLoanStatusAndNetDisbursmentAmount,
  validateAgreementAndValidateSanctionLetter,
  findDisbursmentChannelAndBalance,
  checkForExistingDisbursedLoan,
  isLoanClosed,
  isProductCashCollateral,
};

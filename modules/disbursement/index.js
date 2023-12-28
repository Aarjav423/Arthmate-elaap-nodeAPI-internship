const {
  updateLoanStatus: loanStatusUpdate,
  updateCashCollateral,
} = require('./helper');
const { disbursedLoan, handleLoanAfterDisbursement } = require('./loan');
const { recordStatusLogs } = require('./utils');
const { disbursementType } = require('./constant');
//this will hold the controller for disbursment related ßßß
const compositeDisbursment = async (req, res, next) => {
  try {
    let reqBody = req.body;
    let existingStatus = req.loanData.status;
    //TODO:This need to be done on first Disbursment
    if (req.isFirstRequest) {
      let updateLoanStatus = await loanStatusUpdate(
        { status: 'disbursal_pending', stage: '31' },
        reqBody.loan_id,
      );
      //Record loan status change logs
      const maintainStatusLogs = await recordStatusLogs(
        req.user,
        req.company,
        reqBody.loan_id,
        existingStatus,
        'disbursal_pending',
        req.authData.type === 'service' ? 'system' : req.authData.type,
      );
      if (!maintainStatusLogs.success) throw maintainStatusLogs;
      existingStatus = updateLoanStatus.status;
    }
    const { disbursementResponse, reqData, channelName } = await disbursedLoan(
      reqBody.loan_id,
      {
        loanData: req.loanData,
        productData: req.product,
        companyData: req.company,
        disbursementChannel: req.disbursementChannel,
        disbursementChannelMaster: req.disbursementChannelMaster,
        net_disbur_amt: req.body.net_disbur_amt,
      },
      req.body.disbursmentType,
    );
    if (disbursementResponse.data) {
      await handleLoanAfterDisbursement(
        reqBody.loan_id,
        req.user,
        req.company,
        req.product._id,
        existingStatus,
        req.loanData,
        channelName,
        reqData,
        disbursementResponse.data,
        req.isFirstRequest,
        req.authData.type === 'service' ? 'system' : req.authData.type,
      );
      if (
        req.body.disbursmentType &&
        req.body.disbursmentType == disbursementType.CASHCOLLATERAL
      ) {
        await updateCashCollateral(
          { loan_id: reqBody.loan_id },
          {
            is_processed: 'Y',
            triggered_by:
              req.authData.type === 'api'
                ? req.company.name
                : req.authData.type === 'dash' ||
                  req.authData.type === 'dash-api'
                ? req.user.username
                : '',
            disbursement_status: 'Initiated',
          },
        );
      }
      return res.status(200).send({
        loan_id: reqData.loan_id,
        partner_loan_id: reqData.partner_loan_id,
        response: disbursementResponse.data,
      });
    } else {
      throw {
        success: false,
        message: 'No data found in response object',
      };
    }
  } catch (error) {
    //this will be handled latter
    return res.status(400).send({ error });
  }
};

const disburseAmount = async (req, res, next) => {
  let isCashCollateralUpdate = false;
  let reqBody = req.body;
  try {
    let existingStatus = req.loanData.status;
    const { disbursementResponse, reqData, channelName } = await disbursedLoan(
      reqBody.loan_id,
      {
        loanData: req.loanData,
        productData: req.product,
        companyData: req.company,
        disbursementChannel: req.disbursementChannel,
        disbursementChannelMaster: req.disbursementChannelMaster,
        net_disbur_amt: req.body.net_disbur_amt,
      },
      req.body.disbursmentType,
    );
    reqData.loc_drawdown_request_id=req.body.loc_drawdown_request_id?req.body.loc_drawdown_request_id:null
    reqData.loc_drawdown_usage_id=req.body.loc_drawdown_usage_id?req.body.loc_drawdown_usage_id:null
    if (disbursementResponse.data) {
      await handleLoanAfterDisbursement(
        reqBody.loan_id,
        req.user,
        req.company,
        req.product,
        existingStatus,
        req.loanData,
        channelName,
        reqData,
        disbursementResponse.data,
        req.isFirstRequest,
        req.authData.type === 'service' ? 'system' : req.authData.type,
      );
      if (req.body.disbursmentType == disbursementType.CASHCOLLATERAL) {
        isCashCollateralUpdate = true;
        await updateCashCollateral(
          { loan_id: reqBody.loan_id },
          {
            is_processed: 'Y',
            triggered_by:
              req.authData.type === 'api'
                ? req.company.name
                : req.authData.type === 'dash' ||
                  req.authData.type === 'dash-api'
                ? req.user.username
                : '',
            disbursement_status: 'Initiated',
          },
        );
      }
      return res.status(200).send({
        loan_id: reqBody.loan_id,
        partner_loan_id: reqData.partner_loan_id,
        response: disbursementResponse.data,
      });
    } else {
      throw {
        success: false,
        message: 'No data found in response object',
      };
    }
  } catch (error) {
    if (
      !isCashCollateralUpdate ||
      error.response?.status.toString().indexOf('4') > -1
    ) {
      await updateCashCollateral(
        { loan_id: reqBody.loan_id },
        {
          is_processed: 'N',
          triggered_by:
            req.authData.type === 'api'
              ? req.company.name
              : req.authData.type === 'dash' || req.authData.type === 'dash-api'
              ? req.user.username
              : '',
          disbursement_status: 'Failure',
        },
      );
    }
    if (error.code === 'ECONNREFUSED') {
      return res.status(400).send({
        success: false,
        message: 'Service unavailable. Please try again later.',
      });
    } else {
      return res.status(400).send({
        success: false,
        message: 'Some error occured',
      });
    }
  }
};

module.exports = {
  compositeDisbursment,
  disburseAmount,
};

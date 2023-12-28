const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const ForeclosureRequest = require('../models/foreclosure-request-schema.js');
const RepaymentInstallment = require('../models/repayment-installment-schema.js');
const LoanStates = require('../models/loan-state-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');
const foreclosureHelper = require('../util/foreclosure-helper.js');
const moment = require('moment');
const jwt = require('../util/jwt');
let reqUtils = require('../util/req.js');
const foreclosureEvent = require('../util/foreclosure-request-event.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/foreclosure-requests/:company_id/:product_id/:request_type/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { company_id, product_id, request_type, page, limit } =
          req.params;
        if (company_id != req.company._id)
          throw {
            success: false,
            message: 'company_id mismatch with authorization.',
          };
        if (product_id != req.product._id)
          throw {
            success: false,
            message: 'product_id mismatch with authorization.',
          };

        const forecloserResp =
          await ForeclosureRequest.getFilteredForeclosureRequest({
            company_id,
            product_id,
            is_approved: request_type,
            page,
            limit,
          });
        if (!forecloserResp.rows.length)
          throw {
            sucess: false,
            message: 'No Foreclosure request exist for provided filter',
          };

        return res.status(200).send({
          success: true,
          data: {
            rows: forecloserResp.rows,
            count: forecloserResp.count,
          },
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  // API to fetch foreclosure request detals
  app.get(
    '/api/foreclosure-request-detail/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    foreclosureHelper.fetchRepayInstallment,
    foreclosureHelper.fetchLoanStateData,
    foreclosureHelper.validateForeclosureRequest,
    foreclosureHelper.foreclosureCalculations,
    async (req, res) => {
      try {
        let respObj = {};
        const { loan_id } = req.params;
        //Prepare response data to return
        let requestDate = moment(Date.now()).endOf('day').format('YYYY-MM-DD');
        let validityDate = moment().add(3, 'd').format('YYYY-MM-DD');

        let interestRate = req.loanData.loan_int_rate
          ? req.loanData.loan_int_rate
          : 0;

        let perDayInt =
          (Number(req.loanStateData.prin_os) * interestRate) / 100 / 365;

        respObj.loan_id = loan_id;
        respObj.request_date = requestDate;
        respObj.validity_date = validityDate;
        respObj.prin_os = Number(req.loanStateData.prin_os);
        respObj.int_calculated = req.int_calculated;
        respObj.foreclosure_charge_calculated =
          req.foreclosure_charges_calculated;
        respObj.gst_foreclosure_charge_calculated =
          req.gst_foreclosure_charges_calculated;
        respObj.total_foreclosure_amt_calculated =
          req.total_foreclosure_amt_calculated;
        respObj.per_day_int =
          Math.round((perDayInt + Number.EPSILON) * 100) / 100;

        return res.status(200).send({ success: true, data: respObj });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  app.post(
    '/api/foreclosure-request',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    foreclosureHelper.validateForeclosurePayload,
    foreclosureHelper.validateData,
    borrowerHelper.isLoanExistByLID,
    foreclosureHelper.fetchRepayInstallment,
    foreclosureHelper.fetchLoanStateData,
    foreclosureHelper.validateForeclosureRequest,
    foreclosureHelper.foreclosureCalculations,
    foreclosureHelper.recordForeclosureData,
    async (req, res) => {
      try {
        const data = req.body;
        if (req.foreclosureRecord) {
          return res.status(200).send({
            success: true,
            message: `Foreclosure request accepted for loan id ${req.body.loan_id}.`,
          });
        } else {
          throw {
            success: false,
            message: 'Something went wrong while recording foreclosure request',
          };
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/foreclosure-approve/:loan_id/:id/:sr_req_id/:is_approved',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res, next) => {
      try {
        const { id, sr_req_id, is_approved, loan_id } = req.params;
        const loanData = await borrowerHelper.findLoanExist(loan_id, req);
        if (loanData.success === false) throw loanData;
        const requestExist = await ForeclosureRequest.findDataByIdAndReqId(
          id,
          sr_req_id,
        );

        if (!requestExist)
          throw {
            sucess: false,
            message: 'No foreclosure request found against provided id.',
          };
        if (requestExist) {
          if (
            moment().format('YYYY-MM-DD') >
            moment(requestExist.validity_date).format('YYYY-MM-DD')
          )
            throw { success: false, message: 'Request is expired.' };
          const query = {
            _id: id,
            sr_req_id,
          };
          const dataToUpdate = {
            is_approved,
            remarks_by_approver: req.body.remarks ? req.body.remarks : '',
          };
          const updateRequest = await ForeclosureRequest.updateDataById(
            query,
            dataToUpdate,
          );
          req.ForeclosureData = {
            foreclosureRequest: requestExist,
          };
          if (!updateRequest)
            throw {
              success: false,
              message: 'Error while updating foreclosure request.',
            };
          if (updateRequest) {
            reqUtils.json(req, res, next, 200, {
              success: true,
              message: 'Foreclosure request updated succefully.',
            });
          }
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
    foreclosureEvent.fireForeclosureRequestEvent,
  );
};

const LoanState = require('../../models/loan-state-schema.js');
const BorrowerInfoCommon = require('../../models/borrowerinfo-common-schema.js');
const RequestQueueSoaSchema = require('../../models/request-queue-soa-schema');
const RepaymentInstallment = require('../../models/repayment-installment-schema.js');
const ChargesSchema = require('../../models/charges-schema.js');
const moment = require('moment');
const jwt = require('../../util/jwt');
const soaHelper = require('../../util/soa-helper.js');
const s3helper = require('../../util/s3helper.js');
const LineStateSchema = require('../../models/line-state-schema');
const LocCreditLimitSchema = require('../../models/loc-credit-limit-schema.js');
const loan_transaction_ledgers = require('../../models/loan-transaction-ledger-schema.js');
const borrowerHelper = require('../../util/borrower-helper.js');
const LineStateAuditSchema = require('../../models/line-state-audit.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //api to get the summary data against loan id
  app.get(
    '/api/soa-request/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      borrowerHelper.isLoanExistByLID,
    ],
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        let { loanData } = req;
        let soaObject = {
          previousGenerated: {},
          currentGenerated: {},
          allowLoc: req.product.allow_loc,
        };
        if (req.product.allow_loc == 1) {
          let { limit_amount = 0, available_balance = 0 } =
            (await LocCreditLimitSchema.findOne( { loan_id })) || {};
          let used_amount = limit_amount - available_balance;
          let drawdown_count =
            await loan_transaction_ledgers.getClTransactionCountOnTxnEntry(
              loan_id,
              'dr',
            );
          let { status = 'NA' } =
            (await LineStateAuditSchema.findOne({ loan_id })) || {};
          let line_status = loanData.status;
          let expiry_date = loanData.expiry_date
            ? moment(loanData.expiry_date).format('YYYY-MM-DD')
            : '';

          soaObject = {
            ...soaObject,
            sanction_amount: parseFloat(limit_amount).toFixed(2),
            available_limit: parseFloat(available_balance).toFixed(2),
            used_amount: parseFloat(used_amount).toFixed(2),
            drawdown_count: drawdown_count ? drawdown_count : 0,
            line_status,
            expiry_date,
            status,
          };

          //get request id for latest genrated with status in progress (current)
          const soasInProgressRequest =
            await RequestQueueSoaSchema.findIfExistByLoanId(loan_id, '0');

          //get request id for latest genrated with status done (previous)
          const soasDoneRequest =
            await RequestQueueSoaSchema.findIfExistByLoanId(loan_id, '1');

          soaObject.previousGenerated['request_id'] = soasDoneRequest
            ? soasDoneRequest._id
            : '';
          soaObject.currentGenerated['request_id'] = soasInProgressRequest
            ? soasInProgressRequest._id
            : '';
          soaObject.requested_date = soasDoneRequest
            ? moment(soasDoneRequest.requested_date).format('YYYY-MM-DD')
            : '';
          return res.status(200).send({
            success: true,
            data: soaObject,
          });
        }
        //check for active status
        if (loanData.status != 'disbursed' && loanData.status != 'closed' && loanData.status != 'foreclosed' && req.product.allow_loc == 0) {
          throw {
            success: false,
            message: `Cannot generate statement as loan is in ${loanData.status} state.`,
          };
        }
        //fetch data from loan states
        const loanStatesResp = await LoanState.findByLID(loan_id);
        if (!loanStatesResp)
          throw {
            success: false,
            message:
              'No records found in loan states against provided loan_id.',
          };

        const charge_query = {
          loan_id: loan_id,
          charge_id: 1,
          $or: [
            { is_processed: 'null' },
            { is_processed: null },
            { is_processed: 'N' },
          ],
        };
        //fetch charges
        const charges = await ChargesSchema.findbyCondition(charge_query);
        let charge_amount = 0;
        let total_amount_waived = 0;
        let total_gst_paid = 0;
        let total_gst_reversed = 0;
        let gst = 0;
        let charges_total_amount_paid = 0;
        let excess_amount = 0;

        if (charges.length > 0) {
          charges.forEach((charge) => {
            charge_amount += parseFloat(charge?.charge_amount);
            total_amount_waived += parseFloat(charge?.total_amount_waived);
            total_gst_paid += parseFloat(charge?.total_gst_paid);
            total_gst_reversed += parseFloat(charge?.total_gst_reversed);
            gst += parseFloat(charge?.gst);
            charges_total_amount_paid += parseFloat(charge?.total_amount_paid);
          });
        }
        const currentDate = moment(Date.now())
          .endOf('day')
          .format('YYYY-MM-DD');

        const upcomingInstallments =
          await RepaymentInstallment.getFilteredRepaymentsOnLoanId({
            loan_id: loan_id,
            from_date: currentDate,
            to_date: currentDate,
          });

        const emi_date =
          upcomingInstallments.length > 0 ? upcomingInstallments[0] : 0;

        //get request id for latest genrated with status in progress (current)
        const soasInProgressRequest =
          await RequestQueueSoaSchema.findIfExistByLoanId(loan_id, '0');

        //get request id for latest genrated with status done (previous)
        const soasDoneRequest = await RequestQueueSoaSchema.findIfExistByLoanId(
          loan_id,
          '1',
        );

        // Prepare total paid data.
        const total_prin_paid = loanStatesResp.total_prin_paid
          ? loanStatesResp.total_prin_paid
          : 0;
        const total_lpi_paid = loanStatesResp.total_lpi_paid
          ? loanStatesResp.total_lpi_paid
          : 0;
        const total_int_paid = loanStatesResp.total_int_paid
          ? loanStatesResp.total_int_paid
          : 0;

        // const total_charges_paid = loanStatesResp.total_charges_paid ? loanStatesResp.total_charges_paid : 0

        const prin_os = loanStatesResp.prin_os ? loanStatesResp.prin_os : 0;
        const int_os = loanStatesResp.int_os ? loanStatesResp.int_os : 0;
        // const interest_due = loanStatesResp.current_int_due ? loanStatesResp.current_int_due : 0
        const lpi_due = loanStatesResp.current_lpi_due
          ? loanStatesResp.current_lpi_due
          : 0;

        const total_amount_paid =
          parseFloat(total_prin_paid) +
          parseFloat(total_lpi_paid) +
          parseFloat(total_int_paid) +
          parseFloat(total_gst_paid);

        const gst_on_bc =
          parseFloat(gst) -
          parseFloat(total_gst_reversed) -
          parseFloat(total_gst_paid);
        const bc_due =
          parseFloat(charge_amount) -
          parseFloat(total_amount_waived) -
          parseFloat(charges_total_amount_paid);

        excess_amount = parseFloat(
          loanStatesResp?.excess_payment_ledger
            ? loanStatesResp?.excess_payment_ledger?.txn_amount
            : 0,
        );

        const totalAmountOutstanding =
          parseFloat(prin_os) +
          parseFloat(int_os) +
          parseFloat(lpi_due) +
          parseFloat(bc_due) +
          parseFloat(gst_on_bc) -
          excess_amount;
        //prepare response object
        soaObject.total_amount_paid = total_amount_paid
          ? parseFloat(total_amount_paid + charges_total_amount_paid).toFixed(2)
          : 0;
        soaObject.total_loan_amount_disbursed = parseFloat(
          loanData.net_disbur_amt,
        )
          ? parseFloat(loanData.net_disbur_amt).toFixed(2)
          : 0;
        soaObject.current_outstanding = parseFloat(
          totalAmountOutstanding,
        ).toFixed(2);
        soaObject.loan_status = loanData.status;
        soaObject.emi_amount = emi_date.emi_amount
          ? parseFloat(emi_date.emi_amount)
          : 0;
        soaObject.next_emi_date = emi_date.due_date
          ? moment(emi_date.due_date).format('YYYY-MM-DD')
          : "NA";
        soaObject.previousGenerated['request_id'] = soasDoneRequest
          ? soasDoneRequest._id
          : '';
        soaObject.currentGenerated['request_id'] = soasInProgressRequest
          ? soasInProgressRequest._id
          : '';
        soaObject.requested_date = soasDoneRequest
          ? moment(soasDoneRequest.requested_date).format('YYYY-MM-DD')
          : '';

        return res.status(200).send({
          success: true,
          data: soaObject,
        });
      } catch (error) {
        console.log(error);
        return res.status(404).json(error);
      }
    },
  );

  //api to Generate a download request for SOA
  app.post(
    '/api/soa-request/generate/:loan_id',
    [
      jwt.verifyToken,
      jwt.verifyCompany,
      jwt.verifyProduct,
      jwt.verifyUser,
      borrowerHelper.isLoanExistByLID,
      soaHelper.dateDiffCheck,
    ],

    async (req, res) => {
      try {
        const { loan_id } = req.params;
        let { loanData } = req;
        let { allow_loc } = req.product;
        let product_type = allow_loc == 1 ? 'LOC' : 'TL';
        //check for active status
        if (loanData.status != 'disbursed' && loanData.status != 'closed' && loanData.status != 'foreclosed' && allow_loc == 0) {
          product_type = 'TL';
          throw {
            success: false,
            message:
              `Cannot generate statement as loan is not in ${loanData.status} state.`,
          };
        }

        if (
          loanData.status != 'line_in_use' &&
          loanData.status != 'closed' &&
          allow_loc == 1
        ) {
          product_type = 'TL';
          throw {
            success: false,
            message: 'Cannot generate statement as line is in active state.',
          };
        }
        // if(allow_loc==1)
        // {
        //     let { status = "NA" } = await LineStateAuditSchema.findOne({ loan_id }) || {}
        //     throw {
        //         success: false,
        //         message: "Cannot generate statement as loan is not active."
        //     };
        // }
        if (req.authData.type == 'api') {
          requestor_id = req?.company?.name;
        } else {
          requestor_id = req?.user?.email;
        }

        let insertObj = {
          company_id: JSON.parse(JSON.stringify(req.product)).company_id,
          product_id: JSON.parse(JSON.stringify(req.product))._id,
          loan_id: loan_id,
          requested_date: moment().format('YYYY-MM-DD'),
          status: '0',
          product_type,
          requested_by: requestor_id,
        };
        //insert into collection
        await RequestQueueSoaSchema.addNew(insertObj);
        return res.status(200).send({
          success: true,
          message: 'Request Successfully Accepted',
        });
      } catch (error) {
        console.log(error);
        return res.status(404).json(error);
      }
    },
  );

  //api to download generated PDF
  app.post(
    '/api/soa-request/download/:request_id',
    [jwt.verifyToken],
    async (req, res) => {
      try {
        const { request_id } = req.params;
        const resp_data = await RequestQueueSoaSchema.findById(request_id);
        if (!resp_data) {
          throw {
            success: false,
            message: ' No records found',
          };
        }

        if (!resp_data.file_url || resp_data.file_url == '') {
          throw {
            success: false,
            message: 'Your statement request is in progress',
          };
        }

        const url = resp_data.file_url.substring(
          resp_data.file_url.indexOf('SOA'),
        );

        const reportFromS3Resp = await s3helper.readFileFromS3(url);

        return res.status(200).send(reportFromS3Resp);
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  function stream2buffer(stream) {
    return new Promise((resolve, reject) => {
      const _buf = [];

      stream.on('data', (chunk) => _buf.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(_buf)));
      stream.on('error', (err) => reject(err));
    });
  }
};

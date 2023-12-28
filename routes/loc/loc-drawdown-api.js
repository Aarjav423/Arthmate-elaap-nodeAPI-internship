const BorrowerinfoCommon = require('../../models/borrowerinfo-common-schema.js');
const LocDrawDownSchema = require('../../models/loc-batch-drawdown-schema');
const MasterBankDetailList = require('../../models/master-bank-details-schema');
const ProductSchemeMappingSchema = require('../../models/product-scheme-mapping-schema.js');
const SchemeSchema = require('../../models/scheme-schema');
const jwt = require('../../util/jwt');
const moment = require('moment');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //api to get the drawdown requests against loan id
  app.get(
    '/api/loc-drawdown-request/:loan_id/:page/:limit',

    async (req, res) => {
      try {
        const { loan_id , page, limit} = req.params;
        //fetch data from loc drawdown
        const drawdownRequests =
          (await LocDrawDownSchema.getAllByLoanId(loan_id, page, limit)) || [];
        let productAndSchemeData =
          await BorrowerinfoCommon.getProductAndSchemeMappingByLoanId(loan_id);
        return res.status(200).send({
          success: true,
          data: drawdownRequests.rows,
          productAndSchemeMappingData: productAndSchemeData,
          count:drawdownRequests?.count || 0
        })
      } catch (error) {
        return res.status(404).json(error);
      }
    },
  );

  //api to get the drawdown requests details against loan id
  app.get(
    '/api/loc-drawdown-request/:loan_id/:request_id',
    [jwt.verifyToken, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_id, request_id } = req.params;
        //fetch data from loc drawdown
        let drawdownRequests =
          await LocDrawDownSchema.getAllByLoanIdAndRequestId(
            loan_id,
            parseInt(request_id),
          );

        if (drawdownRequests.length == 0) {
          throw {
            sucess: false,
            message: 'No records found for given request',
          };
        }
        drawdownRequests = drawdownRequests[0];
        let beneficiary_bank_details;
        //now check if beneficiary_bank_details_id is present or not;
        if (drawdownRequests.beneficiary_bank_details_id) {
          beneficiary_bank_details = await MasterBankDetailList.getBeneDetails(
            drawdownRequests.beneficiary_bank_details_id,
          );
          if (beneficiary_bank_details) {
            drawdownRequests.borrower_info_common_data.bene_bank_name =
              beneficiary_bank_details.bene_bank_name;
            drawdownRequests.borrower_info_common_data.bene_bank_acc_num =
              beneficiary_bank_details.bene_bank_acc_num;
            drawdownRequests.borrower_info_common_data.bene_bank_ifsc =
              beneficiary_bank_details.bene_bank_ifsc;
            drawdownRequests.borrower_info_common_data.bene_bank_account_holder_name =
              beneficiary_bank_details.bene_bank_account_holder_name;
            drawdownRequests.borrower_info_common_data.bene_bank_account_type =
              beneficiary_bank_details.bene_bank_account_type;
          }
        }
        if (drawdownRequests.product_scheme_id) {
          let product_scheme_resp = await ProductSchemeMappingSchema.getById(
            drawdownRequests.product_scheme_id,
          );
          let scheme_resp = await SchemeSchema.getById(
            product_scheme_resp.scheme_id,
          );
          if (scheme_resp) {
            drawdownRequests['schemeMapping'] = {};
            drawdownRequests.schemeMapping.interest_type =
              scheme_resp.interest_type;
            drawdownRequests.schemeMapping.penal_interest =
              scheme_resp.penal_rate;
            drawdownRequests.schemeMapping.bounce_charges =
              scheme_resp.bounce_charge;
            drawdownRequests.schemeMapping.loan_int_rate =
              scheme_resp.interest_rate;
          }
        }

        let respObj = [];
        respObj.push({
          key: 'Request ID',
          value: drawdownRequests?._id || 'N/A',
        });
        respObj.push({
          key: 'Loan App ID',
          value: drawdownRequests?.loan_app_id || 'N/A',
        });
        respObj.push({
          key: 'Loan ID',
          value: drawdownRequests?.loan_id || 'N/A',
        });
        respObj.push({
          key: 'First Name',
          value: drawdownRequests?.first_name || 'N/A',
        });
        respObj.push({
          key: 'Last Name',
          value: drawdownRequests?.last_name || 'N/A',
        });
        respObj.push({
          key: 'Usage Fee Including GST',
          value: drawdownRequests?.usage_fees_including_gst || 'N/A',
        });
        respObj.push({
          key: 'Usage Fee',
          value: drawdownRequests?.usage_fees || 'N/A',
        });
        respObj.push({
          key: 'GST Usage Fee',
          value: drawdownRequests?.gst_usage_fees || 'N/A',
        });
        respObj.push({
          key: 'CGST Usgae Fee',
          value: drawdownRequests?.cgst_usage_fees || 'N/A',
        });
        respObj.push({
          key: 'SGST Usage Fee',
          value: drawdownRequests?.sgst_usage_fees || 'N/A',
        });
        respObj.push({
          key: 'IGST Usage Fee',
          value: drawdownRequests?.igst_usage_fees || 'N/A',
        });
        respObj.push({
          key: 'No of EMI',
          value: drawdownRequests?.no_of_emi || 'N/A',
        });
        respObj.push({
          key: 'Repayment Days',
          value: drawdownRequests?.repayment_days || 'N/A',
        });
        respObj.push({
          key: 'Upfront Interest',
          value: drawdownRequests?.upfront_int || 'N/A',
        });
        respObj.push({
          key: 'Drawdown Request Date',
          value:
            moment(drawdownRequests?.drawadown_request_date).format(
              'DD-MM-YYYY',
            ) || 'N/A',
        });
        respObj.push({
          key: 'UTRN Number',
          value: drawdownRequests?.utrn_number || 'N/A',
        });
        respObj.push({
          key: 'Bene Bank Name',
          value:
            drawdownRequests?.borrower_info_common_data?.bene_bank_name ||
            'N/A',
        });
        respObj.push({
          key: 'Bene Bank A/C Number',
          value:
            drawdownRequests?.borrower_info_common_data?.bene_bank_acc_num ||
            'N/A',
        });
        respObj.push({
          key: 'Bene Bank IFSC',
          value:
            drawdownRequests?.borrower_info_common_data?.bene_bank_ifsc ||
            'N/A',
        });
        respObj.push({
          key: 'Bene Bank A/C Holder Name',
          value:
            drawdownRequests?.borrower_info_common_data
              ?.bene_bank_account_holder_name || 'N/A',
        });
        respObj.push({
          key: 'Bene Bank A/C Type',
          value:
            drawdownRequests?.borrower_info_common_data
              ?.bene_bank_account_type || 'N/A',
        });
        respObj.push({
          key: 'Interest Type',
          value: drawdownRequests?.schemeMapping?.interest_type
            ? drawdownRequests.schemeMapping.interest_type
            : drawdownRequests?.borrower_info_common_data?.int_type
            ? drawdownRequests?.borrower_info_common_data?.int_type
            : drawdownRequests?.productSchemeMapping?.upfront_interest_days ||
              'N/A',
        });
        respObj.push({
          key: 'Loan Interest Rate',
          value: drawdownRequests?.schemeMapping?.loan_int_rate
            ? drawdownRequests.schemeMapping.loan_int_rate
            : drawdownRequests?.borrower_info_common_data?.loan_int_rate
            ? drawdownRequests?.borrower_info_common_data?.loan_int_rate
            : drawdownRequests?.productSchemeMapping?.upfront_interest || 'N/A',
        });
        respObj.push({
          key: 'Invoice Number',
          value: drawdownRequests?.invoice_number || 'N/A',
        });
        respObj.push({
          key: 'Penal Interest Rate',
          value: drawdownRequests?.schemeMapping?.penal_interest || 'N/A',
        });
        respObj.push({
          key: 'Bounce Charges',
          value: drawdownRequests?.schemeMapping?.bounce_charges || 'N/A',
        });
        return res.status(200).send({
          success: true,
          data: respObj,
        });
      } catch (error) {
        return res.status(404).json(error);
      }
    },
  );
};

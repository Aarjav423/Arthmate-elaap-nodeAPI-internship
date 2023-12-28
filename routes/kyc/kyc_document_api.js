const jwt = require('../../util/jwt');
const LoanRequestSchema = require('../../models/loan-request-schema.js');
const ComplianceSchema = require('../../models/compliance-schema.js');
const kycBroadcastEvent = require('./kyc-broadcast-event.js');
const BorrowerInfoSchema = require('../../models/borrowerinfo-common-schema.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to get the kyc document parsed data
  app.get(
    '/api/kyc-document-data/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        //fetch data from loanrequest
        const loanDetails = await LoanRequestSchema.getByLoanId(loan_id);
        if (!loanDetails) {
          throw {
            sucess: false,
            message: 'No records found for loan id',
          };
        }
        return res.status(200).send({
          success: true,
          data: loanDetails,
        });
      } catch (error) {
        return res.status(400).json(error);
      }
    },
  );

  //api to update leads document data
  app.put(
    '/api/kyc-document-data/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    async (req, res) => {
      try {
        if (req?.body?.reupload && req.body.reupload === true) {
          let msg = '';
          if (
            req?.body?.reuploadDocuments?.pan === true &&
            req?.body?.reuploadDocuments?.aadhaar === false
          ) {
            msg = 'Reupload the Pan';
          }
          if (
            req?.body?.reuploadDocuments?.aadhaar === true &&
            req?.body?.reuploadDocuments?.pan === false
          ) {
            msg = 'Reupload the Aadhaar';
          }
          if (
            req?.body?.reuploadDocuments?.aadhaar === true &&
            req?.body?.reuploadDocuments?.pan === true
          ) {
            msg = 'Reupload the Pan and Aadhaar';
          }
          req.webhookData = {
            event_key: 'kyc',
            data: {
              status: 'manual',
              message: msg,
              loan_id: req.params.loan_id,
              partner_loan_id: req.body.partner_loan_app_id,
            },
          };
          //call webhook notify
          let webhookResp = await kycBroadcastEvent.partnerNotify(req);

          if (webhookResp !== true) {
            throw {
              sucess: false,
              message: 'Something went Wrong',
            };
          }
          return res.status(200).send({
            success: true,
            message: 'Partner notified successfully.',
          });
        }
        const { loan_id } = req.params;
        const data = req.body;
        //object to update
        let leadParsedData = {
          parsed_pan_number: req.body.pan_number,
          pan_dob: req.body.pan_dob,
          pan_fname: req.body.pan_first_name?.toUpperCase(),
          pan_lname: req.body.pan_last_name?.toUpperCase(),
          pan_mname: req.body.pan_middle_name?.toUpperCase(),
          pan_father_fname: req.body.pan_father_name?.toUpperCase(),
          pan_father_lname: req.body.pan_father_last_name?.toUpperCase(),
          parsed_aadhaar_number: `XXXXXXXX${req.body.aadhaar_number?.slice(
            -4,
          )}`,
          aadhaar_dob: req.body.aadhaar_dob,
          aadhaar_fname: req.body.aadhaar_first_name?.toUpperCase(),
          aadhaar_lname: req.body.aadhaar_last_name?.toUpperCase(),
          aadhaar_mname: req.body.aadhaar_middle_name?.toUpperCase(),
          aadhaar_pincode: req.body.aadhaar_pincode,
          isCkyc: req.body.isCkyc,
        };

        //delete keys with empty values
        for (const key in leadParsedData) {
          if (leadParsedData[key] == '' || leadParsedData[key] == null) {
            delete leadParsedData[key];
          }
        }

        //get compliance data
        const complianceData = await ComplianceSchema.findByLoanId(loan_id);

        let loan_data;
        if (data.isCkyc == '1' || data.isCkyc == 1 || data.isCkyc == true) {
          let data = {
            aadhaar_match: '',
            aadhaar_verified: '',
            ckyc_required: 'Y',
            manual_kyc: 'DC',
          };

          if (
            complianceData.ckyc_search &&
            complianceData.ckyc_search.toUpperCase() == 'Y' &&
            complianceData.ckyc_match.toUpperCase() == 'N'
          ) {
            data.aadhaar_match = 'Y';
            data.aadhaar_verified = 'Y';

            await ComplianceSchema.updateUserCompliance(data, loan_id);
          } else if (
            complianceData.ckyc_search &&
            complianceData.ckyc_search.toUpperCase() == 'N' &&
            (complianceData.ckyc_match == null ||
              complianceData.ckyc_match == 'N')
          ) {
            data.aadhaar_match = 'Y';
            data.aadhaar_verified = 'Y';
            data.pan_match = 'Y';
            data.pan_verified = 'Y';

            await ComplianceSchema.updateUserCompliance(data, loan_id);
          }

          //update manual state of loan and status to open
          loan_data = {
            status: 'open',
            stage: 0,
            kyc_app_or_rejected_by: req.user.email,
            remarks: req.body?.comment,
            reason: req.body?.reason?.id,
          };

          leadParsedData.loan_status = 'open';
        } else if (
          data.isCkyc == '0' ||
          data.isCkyc == 0 ||
          req.body.isCkyc == false
        ) {
          //update ckyc required as N
          await ComplianceSchema.updateUserCompliance(
            { ckyc_required: 'N', manual_kyc: 'DNC' },
            loan_id,
          );

          loan_data = {
            status: 'open',
            stage: 0,
            kyc_app_or_rejected_by: req.user.email,
            remarks: data.comment,
            reason: data?.reason?.id,
          };

          leadParsedData.loan_status = 'open';
        }
        //update manual state of loan and status to open
        await BorrowerInfoSchema.updateBorrowerInfoCommon(loan_data, {
          loan_id: loan_id,
        });
        //fetc data from loanrequest
        const loanDetails = await LoanRequestSchema.updateByLid(
          leadParsedData,
          loan_id,
        );

        if (!loanDetails) {
          throw {
            sucess: false,
            message: 'No records found for loan id',
          };
        }

        req.webhookData = {
          event_key: 'kyc',
          data: {
            status: 'open',
            message: 'Loan is kyc approved',
            loan_id: loan_id,
            partner_loan_id: req.body.partner_loan_app_id,
          },
        };
        // call the webhook
        let webhookResp = await kycBroadcastEvent.partnerNotify(req);
        if (webhookResp !== true) {
          throw {
            sucess: false,
            message: 'Something went Wrong',
          };
        }

        return res.status(200).send({
          success: true,
          message: 'kyc data updated successfully And Partner Notified.',
        });
      } catch (error) {
        console.log('error', error);
        return res.status(400).json(error);
      }
    },
  );
};

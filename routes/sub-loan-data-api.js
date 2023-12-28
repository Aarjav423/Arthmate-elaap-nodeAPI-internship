const bodyParser = require('body-parser');
const moment = require('moment');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const borrowerHelper = require('../util/borrower-helper.js');
const LOCRepaymentInstSchema = require('../models/loc-repayment-installment-schema.js');
module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(
    '/api/sub-loan-id-data/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        let responseObj = {};
        // fetch data from loc repayment installment table against loan id
        const locRepaymentInstallment =
          await LOCRepaymentInstSchema.findByLoanId(loan_id);
        if (!locRepaymentInstallment.length)
          throw {
            success: false,
            message: `Subloans not found against provided ${loan_id}`,
          };

        let subLoanIdArray = [];
        if (locRepaymentInstallment.length) {
          locRepaymentInstallment.map((item) => {
            subLoanIdArray.push(item.sub_loan_id);
          });
          const uniqueSubLoanIds = [...new Set(subLoanIdArray)];
          let emiRecords = [];

          locRepaymentInstallment.forEach((record) => {
            uniqueSubLoanIds.forEach((subLoanId) => {
              if (record.sub_loan_id == subLoanId) {
                emiRecords.push({
                  emi_no: record.emi_no,
                  due_date: moment(record.due_date).format('YYYY-MM-DD'),
                  emi_amount: record.emi_amount * 1,
                  prin: record.prin * 1,
                  int_amount: record.int_amount * 1,
                  principal_bal: record.principal_bal * 1,
                  principal_outstanding: record.principal_outstanding * 1,
                  sub_loan_id: record.sub_loan_id,
                  loan_id: record.loan_id,
                });
                responseObj[subLoanId] = emiRecords.filter(
                  (item) => item.sub_loan_id == record.sub_loan_id,
                );
              }
            });
          });
        }
        return res.status(200).send({
          success: true,
          loan_id: req.params.loan_id,
          subloan_data: responseObj,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

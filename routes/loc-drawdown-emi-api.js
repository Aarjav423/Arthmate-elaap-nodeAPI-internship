const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const jwt = require('../util/jwt');
const LOCEmiSchema = require('../models/loc-repayment-installment-schema.js');
const borrowerHelper = require('../util/borrower-helper.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  const getVal = (value) => {
    if (value?.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal.toString());
    } else if (typeof value === 'object') {
      return parseFloat(value.toString());
    }
    return value;
  };

  app.get(
    '/api/loc-repayment-schedule/:loan_id',
    [jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct],
    borrowerHelper.isLoanExistByLID,
    async (req, res) => {
      try {
        const { loan_id } = req.params;
        // fetch data from loc repayment installment table against loan_id
        const locEmiData = await LOCEmiSchema.findByLoanId(loan_id);
        if (!locEmiData.length)
          throw { success: false, message: 'No records found' };

        //Prepare response data to return
        const scheduleData = new Promise((resolve, reject) => {
          try {
            let getJson = [];
            let counter = 0;
            const newJson = JSON.parse(JSON.stringify(locEmiData));
            let repaymentInstallmentsJson = [];
            if (newJson) {
              Array.from(newJson).forEach((record) => {
                repaymentInstallmentsJson.push({
                  ...record,
                  emi_amount: getVal(record.emi_amount),
                  prin: getVal(record.prin),
                  int_amount: getVal(record.int_amount),
                  principal_bal: getVal(record.principal_bal),
                  principal_outstanding: getVal(record.principal_outstanding),
                });
              });
            }

            if (repaymentInstallmentsJson.length > 0)
              getJson = [...getJson, ...repaymentInstallmentsJson];
            const rowCount = getJson.length;
            const sortedJsonData = getJson.sort((a, b) => a.emi_no - b.emi_no);
            resolve({
              rows: sortedJsonData,
              count: rowCount,
            });
          } catch (error) {
            reject(error);
          }
        })
          .then((response) => {
            return res.status(200).send(response);
          })
          .catch((error) => {
            return res
              .status(400)
              .send({ success: false, message: 'Error while fetching data' });
          });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

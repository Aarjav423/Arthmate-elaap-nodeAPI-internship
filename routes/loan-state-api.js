'use strict';
const moment = require('moment');
const bodyParser = require('body-parser');
const LoanState = require('../models/loan-state-schema');
const jwt = require('../util/jwt');
const { check, validationResult } = require('express-validator');
const calculationHelper = require('../util/calculation.js');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  //API to fetch loan-state-schema fields by loan_id.

  app.get('/api/loan-state/:loan_id', async (req, res) => {
    try {
      const loan_id = req.params.loan_id;
      const loanStateData = await LoanState.findByCondition({ loan_id });
      const current_int_due = loanStateData?.current_int_due || 0;
      const current_lpi_due = loanStateData?.current_lpi_due || 0;
      const prin_os = loanStateData?.prin_os || 0;
      res.send({
        loan_id: loan_id,
        interest: calculationHelper.getVal(current_int_due),
        prin_os: calculationHelper.getVal(current_lpi_due),
        lpi: calculationHelper.getVal(current_lpi_due),
        success: true,
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
};

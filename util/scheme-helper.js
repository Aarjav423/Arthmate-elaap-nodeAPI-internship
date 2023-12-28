const SchemeSchema = require('../models/scheme-schema.js');
const checkSchemeAlreadyExist = async (req, res, next) => {
  try {
    // Fetch data from a_score by req_id
    if (!req.body.interest_rate && !req.body.interest_type) {
      throw {
        succes: false,
        message: 'Please provide interest type and interest rate',
      };
    }
    const checkSchemeExists = await SchemeSchema.findOne({
      interest_type: req.body.interest_type,
      interest_rate: req.body.interest_rate,
      penal_rate: req.body.penal_rate,
      bounce_charge: req.body.bounce_charge,
      repayment_days: req.body.repayment_days
    });
    if (checkSchemeExists) {
      throw { success: false, message: 'Scheme already exists.' };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
module.exports = {
  checkSchemeAlreadyExist,
};

const BorrowerinfoCommonSchema = require('../../models/borrowerinfo-common-schema');

const verifyLoanId = async (req, res, next) => {
  try {
    const loan_id = req.body.loan_details.lms_id;
    const loan = await BorrowerinfoCommonSchema.findOneWithKLID(loan_id);
    if (!loan)
      throw {
        success: false,
        message: `No loan found against loan id ${loan_id}`,
      };
    req.loan = loan;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = {
  verifyLoanId,
};

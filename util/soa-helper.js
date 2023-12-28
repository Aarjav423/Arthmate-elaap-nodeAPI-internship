const BorrowerinfoCommon = require('../models/borrowerinfo-common-schema.js');
const RequestQueueSoaSchema = require('../models/request-queue-soa-schema');
const BorrowerInfoCommon = require('../models/borrowerinfo-common-schema.js');
const moment = require('moment');

const dateDiffCheck = async (req, res, next) => {
  try {
    const loan_id = req?.body?.loan_id
      ? req?.body?.loan_id
      : req?.params?.loan_id;
    // Validate if loan_id exist in borrower_info table, if not throw error "loan_id does not exist."
    const loanExist = await BorrowerinfoCommon.findByCondition({
      loan_id,
    });

    if (!loanExist)
      throw {
        success: false,
        message: 'Loan does not exist for provided data.',
      };
    // Validate company_id and product_id with token
    let currDate = moment().format('YYYY-MM-DD');

    const validateSoaRequest =
      await RequestQueueSoaSchema.findIfExistByLoanIdAndDate(loan_id, currDate);

    if (validateSoaRequest) {
      throw {
        success: false,
        message: `Statement for  ${loan_id} as of ${currDate} is in progress or generated, kindly refer the same.`,
      };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = {
  dateDiffCheck,
};

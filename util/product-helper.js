const CompanySchema = require('../models/company-schema');
const ProductSchema = require('../models/product-schema');
const { generateSequentialNumbers } = require('../util/math-ops');

const generateLoanKey = async (req, res, next) => {
  const { product_id } = req.params;
  if (product_id === 'null' || product_id === 'undefined') {
    //A. Fetch all records in partner collection
    const existingLoanKeys = await ProductSchema.getAllExisting();

    //B. Get all custom code in loanKeyArray
    const loanKeyArray = existingLoanKeys.map((item) => item.loan_key);
    //C. Start creating loan_key from e.g.-aaa/001
    var sequentialStrings = generateSequentialNumbers();

    //D. Check if loan_key exist in custom code array
    for (let k = 0; k < sequentialStrings.length; k++) {
      //E. If Yes search next
      if (!loanKeyArray.includes(sequentialStrings[k])) {
        //F. If No then insert loan_key from request
        req.body.loan_key = sequentialStrings[k];
        break;
      }
    }
    next();
  } else {
    next();
  }
};
module.exports = { generateLoanKey };

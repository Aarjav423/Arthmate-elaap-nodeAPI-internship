const CompanySchema = require('../models/company-schema');
const { generateSequentialStrings } = require('../util/math-ops');

const generateCustomCode = async (req, res, next) => {
  //A. Fetch all records in company collection
  const existingCustomCodes = await CompanySchema.getAll();

  //B. Get all custom code in customCodeArray
  const customCodeArray = existingCustomCodes.map((item) => item.custom_code);
  //C. Start creating custom_code from e.g.-aaa
  var sequentialStrings = generateSequentialStrings();

  //D. Check if custom_code exist in custom code array
  for (let k = 0; k < sequentialStrings.length; k++) {
    //E. If Yes search next
    if (!customCodeArray.includes(sequentialStrings[k].toLowerCase()) || !customCodeArray.includes(sequentialStrings[k].toUpperCase())) {
      //F. If No then insert custom_code from request
      req.body.custom_code = sequentialStrings[k];
      break;
    }
  }
  next();
};
module.exports = { generateCustomCode };

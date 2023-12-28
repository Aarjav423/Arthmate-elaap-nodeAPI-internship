const kyc_data_validator = async (inputs) => {
  //Initialize errors object
  let errors = {};

  //Initialize all the acceptables from the request[]
  let required = ['base64pdfencodedfile', 'code', 'loan_app_id'];

  // Check if a key is missing from the request
  required.map((key) => {
    if (!inputs.hasOwnProperty(key)) {
      errors[key] = [`${key} is required`];
    } else {
      errors[key] = [];
    }
  });
  //Iterate through the inputs
  for (let key in inputs) {
    if (inputs.hasOwnProperty(key)) {
      value = inputs[key];
      // value = validator.trim(inputs[key]);

      switch (key) {
        case 'base64pdfencodedfile':
          if (typeof value != 'string' || value.length == 0) {
            errors[key].push('Invalid base64pdfencodedfile value');
          }
          break;

        case 'loan_app_id':
          if (typeof value != 'string' || value.length == 0) {
            errors[key].push('Invalid loan_app_id value');
          }
          break;

        case 'code':
          if (typeof value != 'string') {
            errors[key].push('Invalid code value type.');
          }
          if (value != '114' && value != '116') {
            errors[key].push('Invalid document code');
          }
          break;

        default:
          break;
      }
    }
  }
  for (let key in errors) {
    //Check for empty key value pair in errors object
    if (errors.hasOwnProperty(key)) {
      let value = errors[key];
      if (value.length == 0) {
        //Remove empty key
        delete errors[key];
      }
    }
  }
  //Return errors object
  return errors;
};

module.exports = {
  kyc_data_validator,
};

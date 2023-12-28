const p2p_data_validator = async (inputs) => {
  //Initialize errors object
  let errors = {};

  //Initialize all the acceptables from the request[]
  let required = ['partner_utr', 'loan_id', 'loan_amount', 'timestamp'];

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
        case 'partner_utr':
          if (typeof value != 'string' || value.length == 0) {
            errors[key].push('Invalid partner_utr value');
          }
          break;

        case 'loan_id':
          if (typeof value != 'string' || value.length == 0) {
            errors[key].push('Invalid loan_id value');
          }
          break;

        case 'timestamp':
          if (typeof value != 'string') {
            errors[key].push('Invalid timestamp value type.');
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
  p2p_data_validator,
};

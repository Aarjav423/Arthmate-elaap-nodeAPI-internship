const trackwizz_kyc_data_validator = async (inputs) => {
  //Initialize errors object
  let errors = {};

  //Initialize all the acceptables from the request[]
  let required = ['RequestId', 'CustomerNewCKYCStatusRequestDetails'];

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
        case 'RequestId':
          if (
            !Array.isArray(value) ||
            typeof value[0] != 'string' ||
            value[0].length == 0
          ) {
            errors[key].push('Invalid RequestId value');
          }
          break;

        case 'CustomerNewCKYCStatusRequestDetails':
          if (!Array.isArray(value) || value.length == 0) {
            errors[key].push(
              'Invalid CustomerNewCKYCStatusRequestDetails value',
            );
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
const trackwizz_kyc_inner_data_validator = async (inputs) => {
  //Initialize errors object
  let errors = {};

  //Initialize all the acceptables from the request[]
  let required = [
    'TransactionId',
    'SourceSystemName',
    'SourceSystemCustomerCode',
    'StepCode',
    'StepName',
    'StepCategory',
    'CaseUrl',
    'CaseId',
    'CoreWorkflowProgressId',
    'CKYCIDGenDate',
  ];

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
        case 'TransactionId':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid TransactionId value');
          }
          break;

        case 'SourceSystemName':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid SourceSystemName value');
          }
          break;
        case 'SourceSystemCustomerCode':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid SourceSystemCustomerCode value');
          }
          break;

        case 'StepCode':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid StepCode value');
          }
          break;
        case 'StepName':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid StepName value');
          }
          break;

        case 'StepCategory':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid StepCategory value');
          }
          break;
        case 'CaseUrl':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid CaseUrl value');
          }
          break;

        case 'CaseId':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid CaseId value');
          }
          break;

        case 'CoreWorkflowProgressId':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid CoreWorkflowProgressId value');
          }
          break;
        case 'CKYCIDGenDate':
          if (!Array.isArray(value) || value[0].length == 0) {
            errors[key].push('Invalid CKYCIDGenDate value');
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
  trackwizz_kyc_data_validator,
  trackwizz_kyc_inner_data_validator,
};

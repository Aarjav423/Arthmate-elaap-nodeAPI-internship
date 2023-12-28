const moment = require('moment');

/**
 *
 * @param {*} length
 * @returns generates random password
 */
const generateRandomPassword = (length = 12) => {
  if (process.env.ENVIRONMENT == 'sandbox') {
    return 'secret@1234';
  }

  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }

  return password;
};

/**
 *
 * @param {*} date
 * @param {*} formatString
 * @returns formats date according to format String Value
 */
const formatDate = (date, formatString = '') => {
  const newDate = `${moment(date).format(formatString)} (Indian Standard Time)`;
  return newDate;
};


/**
 * 
 * @param {*} arr 
 * @param {*} attribute 
 * @returns removes duplicate object having same attribute
 */
const removeDuplicates= (arr, attribute)=> {
  if(!Array.isArray(arr)){
    arr=[arr]
  };

  const seen = new Set();
  return arr.filter(obj => {
    if (!seen.has(obj[attribute])) {
      seen.add(obj[attribute]);
      return true;
    }
    return false;
  });
}

const uniqueValuesFromArrayOfObjects= (arrayOfObjects,attribute)=>{
  // Use a Set to store unique assigned_to values
  const uniqueAssignedToValues = new Set();

  // Iterate through the array and add assigned_to values to the Set
  arrayOfObjects.forEach(item => {
      uniqueAssignedToValues.add(item[attribute]);
  });

  // Convert the Set back to an array if needed
  const uniqueAssignedToArray = Array.from(uniqueAssignedToValues);

  return uniqueAssignedToArray
}

const isValidDate= (dateString)=>{
  // Define the regular expression pattern for yyyy-mm-dd
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  // Test the input string against the pattern
  return datePattern.test(dateString);
}

/**
 * Method to check valid mongoose ID
 * @param {*} _id 
 * @returns 
 */
const isValidMongooseId = (_id) =>  {
  // Regular expression to match a valid Mongoose _id
  const mongooseIdPattern = /^[0-9a-fA-F]{24}$/;

  // Use the test method to check if the input does not match the pattern
  return mongooseIdPattern.test(_id);
}
module.exports = {
  generateRandomPassword,
  formatDate,
  removeDuplicates,
  uniqueValuesFromArrayOfObjects,
  isValidDate,
  isValidMongooseId
};

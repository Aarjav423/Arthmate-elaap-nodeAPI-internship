const crypto = require('crypto');

const maskAadhaarNum = (aadhar_mask = '', new_aadhar = '') => {
  if (new_aadhar && new_aadhar?.toString()?.length === 12 && !isNaN(new_aadhar)) {
    return new_aadhar?.toString()?.replace(/.(?=.{4,}$)/g, '*');
  } else {
    return aadhar_mask;
  }
};

const compareAadharNum = (aadhar_hash = '', new_aadhar = '') => {
  if (new_aadhar && new_aadhar?.toString()?.length === 12 && !isNaN(new_aadhar)) {
    return crypto.createHash('sha256').update(new_aadhar).digest('hex');
  } else {
    return aadhar_hash;
  }
};

const hashAadhaarNum = (aadhaarNum) => {
    return aadhaarNum && aadhaarNum.match(/^\d{12}$/)
        ? crypto.createHash('sha256').update(aadhaarNum).digest('hex')
        : ''
};

module.exports = {
  maskAadhaarNum,
  hashAadhaarNum,
  compareAadharNum
};

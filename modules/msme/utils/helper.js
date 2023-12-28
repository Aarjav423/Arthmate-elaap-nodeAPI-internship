const crypto = require('crypto');

const getLoanAppID = (name = '') => {
  return `${name?.split(' ')?.join('-')}-${Math.floor(1000000000000 + Math.random() * 9000000000000)}`.toUpperCase();
};

const getBorrowerID = (appl_pan = '') => {
  return `${appl_pan.substring(0, 5)}${crypto.randomBytes(2).toString('hex')}${appl_pan.substring(9, 10)}`.toUpperCase();
};

const getGuarantorID = (appl_pan = '') => {
  return `${appl_pan.substring(0, 5)}${crypto.randomBytes(2).toString('hex')}${appl_pan.substring(9, 10)}`.toUpperCase();
};

const fetchInnerSectionName = (innerSectionName) => {
  let name = innerSectionName;

  if (innerSectionName == 'FINANCIAL_STATEMENT_1') {
    name = calculateFinancialYear(innerSectionName);
  } else if (innerSectionName == 'FINANCIAL_STATEMENT_2') {
    name = calculateFinancialYear(innerSectionName);
  } else if (innerSectionName == 'FINANCIAL_STATEMENT_3') {
    name = calculateFinancialYear(innerSectionName);
  }

  return name;
};

function calculateFinancialYear(name) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  let startYear, endYear;

  switch (name) {
    case 'FINANCIAL_STATEMENT_1':
      startYear = currentMonth > 2 ? currentYear : currentYear - 1;
      endYear = startYear + 1;
      break;

    case 'FINANCIAL_STATEMENT_2':
      startYear = currentMonth > 2 ? currentYear - 1 : currentYear - 2;
      endYear = currentMonth > 2 ? currentYear : currentYear - 1;
      break;

    case 'FINANCIAL_STATEMENT_3':
      startYear = currentMonth > 2 ? currentYear - 2 : currentYear - 3;
      endYear = currentMonth > 2 ? currentYear - 1 : currentYear - 2;
      break;

    default:
      return 'N/a';
  }

  return `${startYear}-${endYear}`;
}

const leadSubSectionFetch = (leadSection) => {
  let subSectionStatus = {};
  let subSectionValidationRemarks = {};
  if (leadSection['subsections']) {
    for (let subSection of leadSection['subsections']) {
      if (subSection['validation_checklist']) {
        for (let innerSection of subSection['validation_checklist']) {
          let innerSectionName = fetchInnerSectionName(innerSection.validation_name);
          subSectionStatus = {
            ...subSectionStatus,
            [innerSectionName]: innerSection.validation_status == 'deviation' ? 'in_review' : innerSection.validation_status,
          };
          subSectionValidationRemarks = {
            ...subSectionValidationRemarks,
            [innerSectionName]: innerSection.validation_remarks,
          };
        }
      }
    }
  }

  return {
    subSectionStatus,
    subSectionValidationRemarks,
  };
};

module.exports = {
  getLoanAppID,
  getBorrowerID,
  getGuarantorID,
  leadSubSectionFetch,
};

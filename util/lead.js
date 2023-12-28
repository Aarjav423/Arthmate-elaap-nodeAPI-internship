const LoanRequestSchema = require('../models/loan-request-schema.js');
const crypto = require('crypto');

const coborrowerFields = [
  {
    field: 'coborr_first_name',
    mandatory: 'Y',
  },
  {
    field: 'coborr_last_name',
    mandatory: 'Y',
  },
  {
    field: 'coborr_middle_name',
    mandatory: '',
  },
  {
    field: 'coborr_addr_line_1',
    mandatory: 'Y',
  },
  {
    field: 'coborr_addr_line_2',
    mandatory: '',
  },
  {
    field: 'coborr_city',
    mandatory: 'Y',
  },
  {
    field: 'coborr_state',
    mandatory: 'Y',
  },
  {
    field: 'coborr_pincode',
    mandatory: 'Y',
  },
  {
    field: 'coborr_country',
    mandatory: 'Y',
  },
  {
    field: 'coborr_landmark',
    mandatory: '',
  },
  {
    field: 'coborr_pan',
    mandatory: 'Y',
  },
  {
    field: 'coborr_aadhaar',
    mandatory: 'Y',
  },
  {
    field: 'coborr_phone',
    mandatory: '',
  },
  {
    field: 'coborr_gender',
    mandatory: 'Y',
  },
  {
    field: 'coborr_dob',
    mandatory: 'Y',
  },
  {
    field: 'coborr_email',
    mandatory: '',
  },
  {
    field: 'coborr_relationship_with_borrower',
    mandatory: 'Y',
  },
];

const fetchLead = async (loan_app_id, req, res) => {
  try {
    var lead = await LoanRequestSchema.findByLId(loan_app_id);
    if (!lead)
      throw {
        message: 'No records found for lead',
      };
    req.lead = lead;
    //next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

const checkLeadExists = async (req, res,next) => {
  try {
    if(!req.body.loan_app_id)
    {
      throw {
        message: 'Please provide lead id',
      };
    }
    var lead = await LoanRequestSchema.findByLId(req.body.loan_app_id);
    if (!lead)
      throw {
        message: 'No records found for lead',
      };
    req.lead = lead;
    next();
  } catch (err) {
    console.log(err)
    return res.status(400).send(err);
  }
};



const validateCoBorrowerDetails = async (leadData) => {
  try {
    let missingCoBorrowerFields = [];
    let coBorrowerFieldflag = false;
    //Make an array of the keys of coborrower fields.
    const coBorrowerKeys = coborrowerFields.map((ele) => ele.field);
    //Check for the missing coborrower fields.
    for (let i = 0; i < leadData.length; i++) {
      const leadkeys = Object.keys(leadData[i]);
      coborrowerFields.map((ele) => {
        if (ele.mandatory === 'Y') {
          if (Array.from(leadkeys).includes(ele.field)) {
            coBorrowerFieldflag = true;
          }
        }
      });
      if (coBorrowerFieldflag) {
        coborrowerFields.map((ele) => {
          if (ele.mandatory === 'Y') {
            if (
              (Array.from(leadkeys).includes(ele.field) &&
                leadData[i][ele.field] == '') ||
              !Array.from(leadkeys).includes(ele.field)
            ) {
              missingCoBorrowerFields.push(ele.field);
            }
          }
        });
      }
    }
    if (missingCoBorrowerFields.length) {
      throw {
        success: false,
        message: 'Some coborrower field have invalid data.',
        data: missingCoBorrowerFields,
      };
    }
    //generate coborrower id.
    if (coBorrowerFieldflag) {
      const coBorrowerId = await generateCoBorrowerId(leadData);
    }
    return { success: true };
  } catch (error) {
    return error;
  }
};

const generateCoBorrowerId = (data) => {
  data.forEach(async (item) => {
    if (item.hasOwnProperty('appl_pan') && item.appl_pan) {
      item['coborrower_id'] = `${item.appl_pan.substring(0, 5)}${crypto
        .randomBytes(2)
        .toString('hex')}${item.appl_pan.substring(9, 10)}`;
    } else if (item.hasOwnProperty('aadhar_card_num') && item.aadhar_card_num) {
      item['coborrower_id'] = `${item.aadhar_card_num.substring(0, 5)}${crypto
        .randomBytes(2)
        .toString('hex')}${item.aadhar_card_num.substring(9, 10)}`;
    } else {
      return res.status(400).json({
        message: 'PAN number or AADHAR number is required ',
      });
    }
  });
};

module.exports = {
  checkLeadExists,
  fetchLead,
  validateCoBorrowerDetails,
  coborrowerFields,
};

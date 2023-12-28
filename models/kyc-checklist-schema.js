var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var KycCheckListOcrSchema = mongoose.Schema({
  company_id: {
    type: Number,
  },
  loan_app_id: {
    type: String,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  parsed_pan_number: {
    type: String,
    allowNull: true,
  },
  parsed_aadhaar_number: {
    type: String,
    allowNull: true,
  },
  pan_received: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  pan_verified: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  pan_match: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  aadhaar_received: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  aadhaar_verified: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  aadhaar_match: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
});
var collectionName = 'kyc_checklist';
var KycCheckListOcr = (module.exports = mongoose.model(
  'kyc_checklist',
  KycCheckListOcrSchema,
  collectionName,
));

//insert singleaadhaar_verified
module.exports.addNew = async (kycData) => {
  return KycCheckListOcr.create(kycData);
};

module.exports.findByLoanId = async (loan_id) => {
  return await KycCheckListOcr.findOne({ loan_app_id: loan_id });
};

module.exports.alreadyExists = async (loan_id) => {
  return KycCheckListOcr.findOne({ loan_app_id: loan_id }).count();
};

module.exports.updatePanReceivedByLoanId = async (loan_id, pan_received) => {
  return await KycCheckListOcr.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        pan_received: pan_received,
        // pan_verified:pan_verified
      },
    },
  );
};

module.exports.updatePanVerifiedByLoanId = async (loan_id, pan_verified) => {
  return await KycCheckListOcr.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // pan_received:pan_received,
        pan_verified: pan_verified,
      },
    },
  );
};

module.exports.updateAadhaarReceivedByLoanId = async (
  loan_id,
  aadhaar_received,
) => {
  return await KycCheckListOcr.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        aadhaar_received: aadhaar_received,
        // aadhaar_verified:aadhaar_verified
      },
    },
  );
};

module.exports.updateAadhaarVerifiedByLoanId = async (
  loan_id,
  aadhaar_verified,
) => {
  return await KycCheckListOcr.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // aadhaar_received:aadhaar_received,
        aadhaar_verified: aadhaar_verified,
      },
    },
  );
};
module.exports.XMLFindAndUpdate = async (loan_id, data) => {
  let temp = await KycCheckListOcr.findOneAndUpdate(
    {
      loan_app_id: loan_id,
    },
    {
      ...data,
    },
  );
  if (!temp) {
    temp = await KycCheckListOcr.create(data);
  }
  return temp;
};

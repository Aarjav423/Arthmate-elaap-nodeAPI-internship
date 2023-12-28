var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const ComplianceSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_created_at: {
    type: Date,
    allowNull: true,
  },
  user_id: {
    type: String,
    allowNull: false,
  },
  pan: {
    type: String,
    allowNull: false,
  },
  okyc_required: {
    type: String,
    allowNull: true,
  },
  okyc_link_sent_datetime: {
    type: String,
    allowNull: true,
  },
  okyc_validation_datetime: {
    type: String,
    allowNull: true,
  },
  okyc_status: {
    type: String,
    allowNull: true,
  },
  okyc_failed_otp_attempts: {
    type: String,
    allowNull: true,
  },
  dob: {
    type: String,
    allowNull: true,
  },
  ckyc_status: {
    type: String,
    allowNull: true,
  },
  ckyc_match: {
    type: String,
    allowNull: true,
  },
  ckyc_number: {
    type: String,
    allowNull: true,
  },
  ckyc_search: {
    type: String,
    allowNull: true,
  },
  pan_match: {
    type: String,
    allowNull: true,
  },
  aadhaar_match: {
    type: String,
    allowNull: true,
  },
  pan_status: {
    type: String,
    allowNull: true,
  },
  bureau_status: {
    type: String,
    allowNull: false,
  },
  name_match: {
    type: String,
    allowNull: true,
  },
  name_match_conf: {
    type: Number,
    allowNull: true,
  },
  pincode_match: {
    type: String,
    allowNull: true,
  },
  pincode_match_add_type: {
    type: String,
    allowNull: true,
  },
  cust_id: {
    type: String,
    allowNull: true,
  },
  download_ckyc: {
    type: String,
    allowNull: true,
    default: 'N',
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  okyc_completed: {
    type: String,
    allowNull: true,
    default: 'N',
  },
  flag: {
    type: String,
    enum: ['ok', 'error'],
    allowNull: true,
  },
  ckyc_uploaded_at: {
    type: String,
    allowNull: false,
    default: null,
  },
  ckyc_updated_at: {
    type: String,
    allowNull: false,
    default: null,
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

  created_by: {
    type: String,
    allowNull: true,
    default: null,
  },
  updated_by: {
    type: String,
    allowNull: true,
    default: null,
  },
  selfie_received: {
    type: String,
    enum: ['Y', 'N'],
    allowNull: true,
  },
  ckyc_required: {
    type: String,
    allowNull: true,
    default: null,
  },
  manual_kyc: {
    type: String,
    enum: ['Y', 'N', 'DC', 'DNC'],
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
ComplianceSchema.plugin(autoIncrement.plugin, 'id');
var Compliance = (module.exports = mongoose.model(
  'compliance',
  ComplianceSchema,
));

module.exports.addNew = (data) => {
  return Compliance.create(data);
};

module.exports.getAll = () => {
  return Compliance.find({});
};

module.exports.findByCondition = (condition) => {
  return Compliance.findOne(condition).sort({
    _id: -1,
  });
};

module.exports.updateData = (data, condition) => {
  return Compliance.findOneAndUpdate(condition, data, {});
};

module.exports.findByLoanAppId = (loan_app_id) => {
  return Compliance.find({
    loan_app_id: loan_app_id,
  })
    .sort({ _id: -1 })
    .limit(1);
};

module.exports.findBySingleLoanAppId = (loan_app_id) => {
  return Compliance.findOne({
    loan_app_id: loan_app_id,
  })
    .sort({ _id: -1 })
    .limit(1);
};

module.exports.findIfExistAndRecord = async (loan_app_id, data) => {
  const alreadyExist = await Compliance.findOne({ loan_app_id });
  if (alreadyExist) {
    delete data.loan_app_id;
    delete data.company_id;
    delete data.product_id;
    delete data.pan;
    delete data.dob;
    return Compliance.findOneAndUpdate({ loan_app_id }, data, {});
  } else {
    return Compliance.create(data);
  }
};

module.exports.updateCompliance = async (loan_app_id, data) => {
  const alreadyExist = await Compliance.findOne({ loan_app_id });
  if (alreadyExist) {
    return Compliance.findOneAndUpdate({ loan_app_id }, data, {});
  } else {
    return Compliance.create(data);
  }
};
module.exports.getFilteredKycComplianceRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;
  query['$and'] = [];
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id) {
    query['$and'].push({
      product_id,
    });
  }
  if (
    from_date !== null &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== ''
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      created_at: {
        $gte: date,
      },
    });
  }
  if (
    to_date !== null &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== ''
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      created_at: {
        $lte: date,
      },
    });
  }
  if (status === 'compliant') {
    query['$or'] = [];
    query['$or'].push(
      {
        ckyc_status: 'Y',
      },
      {
        pan_status: 'Y',
      },
    );
    query['$and'].push({
      bureau_status: 'Y',
    });
  }
  if (status === 'non_compliant') {
    query['$or'] = [];
    query['$or'].push({ bureau_status: 'N' });
    query['$or'].push({ $and: [{ ckyc_status: 'N' }, { pan_status: 'N' }] });
  }

  if (status === 'ckyc_status') {
    query['$or'] = [];
    query['$or'].push({ ckyc_status: 'N' });
  }

  if (query['$and'] == '') {
    delete query['$and'];
  }
  return Compliance.find(query);
};

module.exports.updatePanMatch = async (loan_id, pan_match) => {
  return await Compliance.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // pan_received:pan_received,
        pan_match: pan_match,
      },
    },
  );
};

module.exports.updatePanMatchAndAadhaarMatch = async (
  loan_id,
  pan_match,
  aadhaar_match,
) => {
  return await Compliance.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        pan_match: pan_match,
        aadhaar_match: aadhaar_match,
      },
    },
  );
};

module.exports.updateAadhaarMatch = async (loan_id, aadhaar_match) => {
  return await Compliance.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // pan_received:pan_received,
        aadhaar_match: aadhaar_match,
      },
    },
  );
};
module.exports.findByLoanCustId = (cust_id) => {
  return Compliance.find({
    cust_id: cust_id,
  }).count();
};

module.exports.updateManyRows = (data, condition) => {
  let query;
  if (condition.mode === 'upload') {
    query = {
      $and: [
        { cust_id: condition.cust_id },
        { download_ckyc: 'Y' },
        { ckyc_uploaded_at: null },
        { ckyc_number: null },
      ],
    };
  } else {
    query = {
      $and: [
        { cust_id: condition.cust_id },
        { download_ckyc: 'Y' },
        { ckyc_updated_at: null },
      ],
    };
  }

  let update = {
    $set: data,
  };
  return Compliance.updateMany(query, update, {});
};

// module.exports.findByLoanId = async (loan_id) => {
//   return await Compliance.findOne({ loan_app_id:loan_id });
// };

module.exports.alreadyExists = async (loan_id) => {
  return Compliance.findOne({ loan_app_id: loan_id }).count();
};

module.exports.updatePanReceivedByLoanId = async (loan_id, pan_received) => {
  return await Compliance.updateOne(
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
  return await Compliance.updateOne(
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
  return await Compliance.updateOne(
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
  return await Compliance.updateOne(
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
  let temp = await Compliance.findOneAndUpdate(
    {
      loan_app_id: loan_id,
    },
    {
      ...data,
    },
  );
  if (!temp) {
    temp = await Compliance.create(data);
  }
  return temp;
};

module.exports.updateAadharParsedOcrNumber = async (
  loan_id,
  parsed_aadhaar,
) => {
  return await Compliance.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // aadhaar_received:aadhaar_received,
        parsed_aadhaar_number: parsed_aadhaar,
      },
    },
  );
};

module.exports.updatePanParsedOcrNumber = async (loan_id, parsed_pan) => {
  return await Compliance.updateOne(
    {
      loan_app_id: loan_id,
    },
    {
      $set: {
        // aadhaar_received:aadhaar_received,
        parsed_pan_number: parsed_pan,
      },
    },
  );
};

module.exports.updateSelfie = async (loan_id, data) => {
  let selfie = await Compliance.findOneAndUpdate(
    {
      loan_app_id: loan_id,
    },
    {
      ...data,
    },
  );
  if (!selfie) {
    selfie = await Compliance.create(data);
  }
  return selfie;
};

module.exports.updateLoanIdsBulk = (data) => {
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      data.forEach((row) => {
        let query = {
          loan_app_id: row?.loan_app_id,
        };

        Compliance.findOneAndUpdate(query, row)
          .then((result) => {
            counter++;
            if (counter == data.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.updateUserCompliance = (data, loanId) => {
  let query = {
    loan_id: loanId,
  };

  return Compliance.findOneAndUpdate(query, data);
};

module.exports.findByLoanId = (loanId) => {
  let query = {
    loan_id: loanId,
  };

  return Compliance.findOne(query);
};

module.exports.findIfExistAndUpdateKey = async (loan_app_id, value) => {
  let data = {
    manual_kyc: value,
  };
  return Compliance.findOneAndUpdate({ loan_app_id: loan_app_id }, data, {});
};

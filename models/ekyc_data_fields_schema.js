var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const EkycDataFieldsSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  doc_s3_url: {
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  ekyc_type: {
    type: String,
    allowNull: true,
  },
  aadhaar_kyc_id: {
    type: String,
    allowNull: true,
  },
  name: {
    type: String,
    allowNull: true,
  },
  address: {
    type: String,
    allowNull: true,
  },
  pincode: {
    type: Number,
    allowNull: true,
  },
  dob: {
    type: String,
    allowNull: true,
  },
  doc_id: {
    type: String,
    allowNull: true,
  },
  city: {
    type: String,
    allowNull: true,
  },
  state: {
    type: String,
    allowNull: true,
  },
  bank_acc_no: {
    type: String,
    allowNull: true,
  },
  ifsc_code: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  kyc_vendor: {
    type: String,
    allowNull: true,
  },
  name_check: {
    type: Boolean,
    allowNull: true,
  },
  address_check: {
    type: Boolean,
    allowNull: true,
  },
  pincode_check: {
    type: Boolean,
    allowNull: true,
  },
  dob_check: {
    type: Boolean,
    allowNull: true,
  },
  city_check: {
    type: Boolean,
    allowNull: true,
  },
  state_check: {
    type: Boolean,
    allowNull: true,
  },
  bank_acc_no_check: {
    type: Boolean,
    allowNull: true,
  },
  ifsc_code_check: {
    type: Boolean,
    allowNull: true,
  },
  kyc_date: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  name_match_percent: {
    type: Number,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
EkycDataFieldsSchema.plugin(autoIncrement.plugin, 'id');
var EkycDataFields = (module.exports = mongoose.model(
  'ekyc_data_fields',
  EkycDataFieldsSchema,
));

module.exports.addNew = (data) => {
  return EkycDataFields.create(data);
};

module.exports.findOneRecord = (condition) => {
  return EkycDataFields.findOne(condition, callback).sort({
    _id: -1,
  });
};

module.exports.getPanDetails = (condition) => {
  return EkycDataFields.findOne(condition).sort({
    _id: -1,
  });
};

module.exports.getEkycList = (loan_id) => {
  return EkycDataFields.find({
    loan_id: loan_id,
  });
};

module.exports.getAll = (loan_id) => {
  const promise = new Promise((resolve, reject) => {
    try {
      EkycDataFields.aggregate([
        {
          $match: {
            loan_id: loan_id,
          },
        },
        {
          $group: {
            _id: '$_id',
            ekyc_type: {
              $first: '$ekyc_type',
            },
            loan_id: {
              $first: '$loan_id',
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ])
        .then((response) => {
          if (!response.length) resolve(null);
          const bookkingLoanIds = response.map((record) => {
            return record.id;
          });
          EkycDataFields.find({
            _id: {
              $in: bookkingLoanIds,
            },
          })
            .then((result) => {
              resolve(result);
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch((err) => {
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.updateRecord = (data, id) => {
  const query = {
    _id: id,
  };
  return EkycDataFields.findOneAndUpdate(query, data, {});
};

module.exports.getEkycList = (loan_id) => {
  return EkycDataFields.find({
    loan_id: loan_id,
  });
};

module.exports.findByAadhaarKycId = (aadhaar_kyc_id) => {
  return EkycDataFields.findOne({
    aadhaar_kyc_id: aadhaar_kyc_id,
  }).select('aadhaar_kyc_id');
};

module.exports.updateBookkingLaonIdByAadhaarKycId = (aadhaar_kyc_id, data) => {
  const query = {
    aadhaar_kyc_id: aadhaar_kyc_id,
  };
  return EkycDataFields.findOneAndUpdate(query, data, {});
};

module.exports.updateData = (data, condition) => {
  return EkycDataFields.findOneAndUpdate(condition, data, {});
};

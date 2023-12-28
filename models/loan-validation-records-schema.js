var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const LoanValidationRecordsSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  pennydrop_verify_id: {
    type: String,
    allowNull: true,
  },
  document_uploaded_count: {
    type: Number,
    allowNull: true,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  ckyc_kyc_id: {
    type: String,
    allowNull: true,
  },
  aadharkyc_kyc_id: {
    type: String,
    allowNull: true,
  },
  pan_kyc_id: {
    type: String,
    allowNull: true,
  },
  experian_bureau_id: {
    type: String,
    allowNull: true,
  },
  cibil_bureau_id: {
    type: String,
    allowNull: true,
  },
  crif_bureau_id: {
    type: String,
    allowNull: true,
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
});

autoIncrement.initialize(mongoose.connection);
LoanValidationRecordsSchema.plugin(autoIncrement.plugin, 'id');
var LoanValidationRecords = (module.exports = mongoose.model(
  'loan_validation_records',
  LoanValidationRecordsSchema,
));

module.exports.addNew = (data, callback) => {
  LoanValidationRecords.create(data)
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.updateData = (loan_id, data, callback) => {
  LoanValidationRecords.update(data, {
    where: {
      loan_id: loan_id,
    },
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.checkAlreadyExists = (where, callback) => {
  LoanValidationRecords.findOne({
    where: where,
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      if (err) {
        callback(err, null);
      }
    });
};

module.exports.findByLoanId = (loan_id) => {
  return LoanValidationRecords.findOne({
    loan_id: loan_id,
  });
};

module.exports.getPaginateddata = (data, callback) => {
  LoanValidationRecords.findAndCountAll({
    where: data,
    order: [['id', 'DESC']],
  })
    .then((response) => {
      callback(null, response);
    })
    .catch((err) => {
      callback(err, null);
    });
};

module.exports.deleteById = (id) => {
  return LoanValidationRecords.deleteOne({
    loan_id: id,
  });
};

module.exports.upsert = (condition, values, cb) => {
  LoanValidationRecords.findOne({
    where: condition,
  })
    .then(function (obj) {
      if (obj)
        return cb(
          null,
          LoanValidationRecords.update(values, {
            where: condition,
          }),
        );
      return cb(null, LoanValidationRecords.create(values));
    })
    .catch((err) => {
      cb(err, null);
    });
};

module.exports.asyncUpsert = (condition, values) => {
  return new Promise(function (resolve, reject) {
    LoanValidationRecords.findOne({
      where: condition,
    })
      .then(function (obj) {
        if (obj)
          return resolve(
            LoanValidationRecords.update(values, {
              where: condition,
            }),
          );
        return resolve(LoanValidationRecords.create(values));
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

module.exports.findRecord = (condition) => {
  return new Promise((resolve, reject) => {
    LoanValidationRecords.findOne(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

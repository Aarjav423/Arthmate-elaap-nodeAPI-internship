var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const PloandocumentSchema = mongoose.Schema({
  //const Ploandocument = sequelize.define('pl_loandocument', {
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
  ld_common_id: {
    type: Number,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  borrower_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  partner_borrower_id: {
    type: String,
    allowNull: false,
  },
  doc_stage: {
    type: String,
    allowNull: true,
  },
  app_perm_addr_prf: {
    type: String,
    allowNull: true,
  },
  app_ebill: {
    type: String,
    allowNull: true,
  },
  app_photo_id_prf: {
    type: String,
    allowNull: true,
  },
  app_rent_agree: {
    type: String,
    allowNull: true,
  },
  app_gas_bill: {
    type: String,
    allowNull: true,
  },
  app_other: {
    type: String,
    allowNull: true,
  },
  repay_track: {
    type: String,
    allowNull: true,
  },
  fi_report: {
    type: String,
    allowNull: true,
  },
  insurance_frm: {
    type: String,
    allowNull: true,
  },
  insurance_calculator_page: {
    type: String,
    allowNull: true,
  },
  borro_itr_1: {
    type: String,
    allowNull: true,
  },
  borro_itr_2: {
    type: String,
    allowNull: true,
  },
  borro_bank_stmt: {
    type: String,
    allowNull: true,
  },
  borro_other: {
    type: String,
    allowNull: true,
  },
  borro_sal_slip: {
    type: String,
    allowNull: true,
  },
  employee_id_card: {
    type: String,
    allowNull: true,
  },
  cibil_borro: {
    type: String,
    allowNull: true,
  },
  business_addr_prf: {
    type: String,
    allowNull: true,
  },
  business_perm_addr_prf: {
    type: String,
    allowNull: true,
  },
  business_pan_card: {
    type: String,
    allowNull: true,
  },
  business_ebill: {
    type: String,
    allowNull: true,
  },
  business_rent_agree: {
    type: String,
    allowNull: true,
  },
  business_shop_act: {
    type: String,
    allowNull: true,
  },
  business_gst_certifi: {
    type: String,
    allowNull: true,
  },
  business_itr_1: {
    type: String,
    allowNull: true,
  },
  business_itr_2: {
    type: String,
    allowNull: true,
  },
  business_audit_report: {
    type: String,
    allowNull: true,
  },
  business_bank_stmt: {
    type: String,
    allowNull: true,
  },
  business_other: {
    type: String,
    allowNull: true,
  },
  co_app_addr_prf: {
    type: String,
    allowNull: true,
  },
  co_app_perm_addr_prf: {
    type: String,
    allowNull: true,
  },
  co_app_pan_card: {
    type: String,
    allowNull: true,
  },
  co_app_aadhar_card: {
    type: String,
    allowNull: true,
  },
  co_app_ebill: {
    type: String,
    allowNull: true,
  },
  co_app_photo_id_prf: {
    type: String,
    allowNull: true,
  },
  co_app_rent_agree: {
    type: String,
    allowNull: true,
  },
  co_app_gas_bill: {
    type: String,
    allowNull: true,
  },
  co_app_other: {
    type: String,
    allowNull: true,
  },
  cibil_co_borro: {
    type: String,
    allowNull: true,
  },
  co_app_bank_stmt: {
    type: String,
    allowNull: true,
  },
  foir: {
    type: String,
    allowNull: true,
  },
  student_kyc: {
    type: String,
    allowNull: true,
  },
  receipt: {
    type: String,
    allowNull: true,
  },
  other_1: {
    type: String,
    allowNull: true,
  },
  other_2: {
    type: String,
    allowNull: true,
  },
  other_3: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
PloandocumentSchema.plugin(autoIncrement.plugin, 'id');
var Ploandocument = (module.exports = mongoose.model(
  'pl_loandocument',
  PloandocumentSchema,
));

//bulk insert
module.exports.addInBulk = (loandocumentData) => {
  return Ploandocument.insertMany(loandocumentData);
};

module.exports.addNew = (loandocumentData) => {
  return Ploandocument.create(loandocumentData);
};

module.exports.updateExisting = (data, loan_id, borrower_id, doc_stage) => {
  const query = {
    loan_id: loan_id,
    borrower_id: borrower_id,
    doc_stage: doc_stage,
  };
  return Ploandocument.findOneAndUpdate(query, data, {});
};

module.exports.findIfExists = (loan_id, borrower_id, doc_stage) => {
  const query = {
    loan_id: loan_id,
    borrower_id: borrower_id,
    doc_stage: doc_stage,
  };
  return Ploandocument.findOne(query);
};

module.exports.findAllRecord = (condition) => {
  return new Promise((resolve, reject) => {
    Ploandocument.find(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const LoandocumentClSchema = mongoose.Schema({
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
  cibil: {
    type: String,
    allowNull: true,
  },
  bank_stmnts: {
    type: String,
    allowNull: true,
  },
  business_addr_prf: {
    type: String,
    allowNull: true,
  },
  business_pan_card: {
    type: String,
    allowNull: true,
  },
  business_rent_agrmnt: {
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
  business_audit_report_1: {
    type: String,
    allowNull: true,
  },
  business_audit_report_2: {
    type: String,
    allowNull: true,
  },
  business_register_certifi: {
    type: String,
    allowNull: true,
  },
  business_bank_stmnts: {
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
  app_perm_addr_prf: {
    type: String,
    allowNull: true,
  },
  foir: {
    type: String,
    allowNull: true,
  },
  pennydrop_scrsht: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  app_photo_id_prf: {
    type: String,
    allowNull: true,
  },
  receipt: {
    type: String,
    allowNull: true,
  },
  co_app_pan_card: {
    type: String,
    allowNull: true,
  },
  co_app_addr_prf: {
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
});

autoIncrement.initialize(mongoose.connection);
LoandocumentClSchema.plugin(autoIncrement.plugin, 'id');
var LoandocumentCl = (module.exports = mongoose.model(
  'cl_loandocument',
  LoandocumentClSchema,
));

//bulk insert
module.exports.addInBulk = (LoandocumentClData) => {
  return LoandocumentCl.insertMany(LoandocumentClData);
};

module.exports.addNew = (loandocumentData) => {
  return LoandocumentCl.create(loandocumentData);
};

module.exports.updateExisting = (data, loan_id, borrower_id, doc_stage) => {
  let query = {
    loan_id: loan_id,
    borrower_id: borrower_id,
    doc_stage: doc_stage,
  };
  return LoandocumentCl.findOneAndUpdate(query, data, {});
};

module.exports.findIfExists = (loan_id, borrower_id, doc_stage) => {
  let query = {
    loan_id: loan_id,
    borrower_id: borrower_id,
    doc_stage: doc_stage,
  };
  return LoandocumentCl.findOne(query);
};

module.exports.findByKLID = (loan_id) => {
  return LoandocumentCl.find({
    loan_id: loan_id,
  });
};

module.exports.findAllRecord = (condition) => {
  return new Promise((resolve, reject) => {
    LoandocumentCl.find(condition)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

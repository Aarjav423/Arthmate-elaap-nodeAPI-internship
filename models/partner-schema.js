var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const partnerSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  name: {
    type: String,
    allowNull: false,
  },
  email: {
    type: String,
    allowNull: false,
  },
  billing_name: {
    type: String,
    allowNull: false,
  },
  cin: {
    type: String,
    allowNull: false,
  },
  directors: {
    type: Array,
    allowNull: false,
    required: true,
  },
  code: {
    type: String,
    allowNull: true,
  },
  business_phone: {
    type: String,
    allowNull: false,
  },
  company_address: {
    type: String,
    allowNull: false,
  },
  billing_address: {
    type: String,
    allowNull: false,
  },
  pin_code: {
    type: Number,
    allowNull: false,
  },
  city: {
    type: String,
    allowNull: false,
  },
  state: {
    type: String,
    allowNull: false,
  },
  service_delivery_state: {
    type: String,
    allowNull: false,
  },
  is_igst_applicable: {
    type: Number,
    allowNull: false,
  },
  website: {
    type: String,
    allowNull: true,
  },
  gstin: {
    type: String,
    allowNull: false,
  },
  is_parent_company_in_abroad: {
    type: String,
    allowNull: false,
    enum: ['yes', 'no'],
    default: 'no',
  },
  ab_company_name: {
    type: String,
    allowNull: true,
  },
  ab_company_address: {
    type: String,
    allowNull: true,
  },
  ab_company_website: {
    type: String,
    allowNull: true,
  },
  ab_company_country: {
    type: String,
    allowNull: true,
  },
  ab_spoc_name: {
    type: String,
    allowNull: true,
  },
  ab_spoc_email: {
    type: String,
    allowNull: true,
  },
  ab_spoc_phone: {
    type: String,
    allowNull: true,
  },
  ab_spoc_mobile: {
    type: String,
    allowNull: true,
  },
  ab_spoc_designation: {
    type: String,
    allowNull: true,
  },
  ab_spoc_whatsapp_id: {
    type: String,
    allowNull: true,
  },
  ab_wechat_id: {
    type: String,
    allowNull: true,
  },
  ab_skype_id: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  updated_by: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'INACTIVE',
  },
  lms_version: {
    type: String,
    allowNull: false,
  },
  custom_code: {
    type: String,
    allowNull: true,
    uppercase: true,
  },
  auto_loan_status_change: {
    type: Number,
    allowNull: true,
  },
  short_code: {
    type: String,
    allowNull: true,
  },
  gro_name: {
    type: String,
    allowNull: true,
  },
  gro_designation: {
    type: String,
    allowNull: true,
  },
  gro_address: {
    type: String,
    allowNull: true,
  },
  gro_email_id: {
    type: String,
    allowNull: true,
  },
  gro_contact_number: {
    type: String,
    allowNull: true,
  },
  digital_lending_app_name: {
    type: String,
    allowNull: true,
  },
});

autoIncrement.initialize(mongoose.connection);
partnerSchema.plugin(autoIncrement.plugin, 'id');
var partner = (module.exports = mongoose.model('partner', partnerSchema));

module.exports.search = (data) => {
  //Find record by name, email, phone
  return partner.findOne({
    $or: [
      {
        name: data.name,
      },
      {
        website: data.website,
      },
      {
        business_phone: data.business_phone,
      },
    ],
  });
};

module.exports.listAll = () => {
  return partner.find();
};

module.exports.isPartnerIdExistByName = (partner_name) => {
  return partner.findOne({
    name: partner_name,
  });
};

module.exports.addPartner = (partnerdata, callback) => {
  return partner.create(partnerdata);
};

module.exports.fetchAllCustomCodes = () => {
  return partner.find({});
};

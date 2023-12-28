var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var IHServiceReqResLogSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      allowNull: false,
    },
    request_id: {
      type: String,
      allowNull: true,
    },
    book_entity_id: {
      type: Number,
      allowNull: true,
    },
    company_id: {
      type: Number,
      allowNull: true,
    },
    company_code: {
      type: String,
      allowNull: true,
    },
    company_name: {
      type: String,
      allowNull: true,
    },
    sub_company_code: {
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
    borrower_id: {
      type: String,
      allowNull: true,
    },
    partner_loan_id: {
      type: String,
      allowNull: true,
    },
    partner_borrower_id: {
      type: String,
      allowNull: true,
    },
    kyc_id: {
      type: String,
      allowNull: true,
    },
    vendor_name: {
      type: String,
      allowNull: true,
    },
    service_id: {
      type: Number,
      allowNull: false,
    },
    api_name: {
      type: String,
      allowNull: true,
    },
    raw_data: {
      type: String,
      allowNull: true,
    },
    response_type: {
      type: String,
      enum: ['success', 'error', ''],
      allowNull: true,
    },
    request_type: {
      type: String,
      enum: ['request', 'response'],
      allowNull: true,
    },
    timestamp: {
      type: Date,
      allowNull: true,
      defaultValue: Date.now,
    },
    is_cached_response: {
      type: String,
      allowNull: true,
      defaultValue: 'FALSE',
    },
    pan_card: {
      type: String,
      allowNull: true,
    },
    id_number: {
      type: String,
      allowNull: true,
    },
    consent: {
      type: String,
      enum: ['Y', 'N'],
      allowNull: true,
    },
    consent_timestamp: {
      type: Date,
      allowNull: true,
    },
    document_uploaded_s3: {
      type: String,
      allowNull: false,
      defaultValue: 0,
    },
    api_response_type: {
      type: String,
      allowNull: false,
      defaultValue: 'FAIL',
    },
    api_response_status: {
      type: String,
      allowNull: false,
      defaultValue: 'FAIL',
    },
    is_cache: {
      type: String,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

var IHServiceReqResLog = (module.exports = mongoose.model(
  'IH_service_req_res_log',
  IHServiceReqResLogSchema,
));

//insert single
module.exports.addNew = (serviceData) => {
  var insertdata = new IHServiceReqResLog(serviceData);
  return insertdata.save();
};

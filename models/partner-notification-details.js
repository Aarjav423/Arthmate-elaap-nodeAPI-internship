var mongoose = require('mongoose');
const PartnerNotificationDetailsSchema = mongoose.Schema(
  {
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
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    request_id: {
      type: String,
      allowNull: true,
    },
    request_s3_url: {
      type: String,
      allowNull: false,
    },
    stage: {
      type: Number,
      allowNull: false,
    },
    remarks: {
      type: String,
      allowNull: true,
    },
    key: {
      type: String,
      allowNull: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

var PartnerNotificationDetails = (module.exports = mongoose.model(
  'partner_notification_details',
  PartnerNotificationDetailsSchema,
));

module.exports.recordAScoreRequestData = async (data) => {
  try {
    return PartnerNotificationDetails.create(data);
  } catch (error) {
    return error;
  }
};

module.exports.recordLoanDocumentRequestData = async (data) => {
  try {
    return PartnerNotificationDetails.create(data);
  } catch (error) {
    return error;
  }
};

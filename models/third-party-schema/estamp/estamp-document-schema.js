const { ObjectId } = require('mongodb');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var firstPartySchema = mongoose.Schema(
  {
    street_address: {
      type: String,
      allowNull: true,
    },
    locality: {
      type: String,
      allowNull: true,
    },
    city: {
      type: String,
      allowNull: true,
    },
    pin_code: {
      type: String,
      allowNull: true,
    },
    state: {
      type: String,
      allowNull: true,
    },
    country: {
      type: String,
      allowNull: true,
    },
  },
  { _id: false },
);

var secondPartySchema = mongoose.Schema(
  {
    street_address: {
      type: String,
      allowNull: true,
    },
    locality: {
      type: String,
      allowNull: true,
    },
    city: {
      type: String,
      allowNull: true,
    },
    pin_code: {
      type: String,
      allowNull: true,
    },
    state: {
      type: String,
      allowNull: true,
    },
    country: {
      type: String,
      allowNull: true,
    },
  },
  { _id: false },
);

const EStampSchema = mongoose.Schema({
  id: {
    type: ObjectId,
    primaryKey: true,
    allowNull: false,
  },
  request_id: {
    type: String,
    allowNull: true,
  },
  s3_url: {
    type: String,
    allowNull: true,
  },
  estamp_s3_url: {
    type: String,
    allowNull: true,
  },
  signed_estamp_s3_url: {
    type: String,
    allowNull: true,
  },
  reference_id: {
    type: String,
    allowNull: true,
  },
  loan_number: {
    type: String,
    allowNull: true,
  },
  first_party_name: {
    type: String,
    allowNull: true,
  },
  second_party_name: {
    type: String,
    allowNull: true,
  },
  duty_payer_phone_number: {
    type: String,
    allowNull: true,
  },
  first_party_address: {
    type: firstPartySchema,
    allowNull: true,
  },
  second_party_address: {
    type: secondPartySchema,
    allowNull: true,
  },
  stamp_amount: {
    type: Number,
    allowNull: true,
  },
  consideration_amount: {
    type: Number,
    allowNull: true,
  },
  stamp_duty_paid_by_gender: {
    type: String,
    enum: ['MALE', 'FEMALE'],
    allowNull: true,
  },
  first_party_mail: {
    type: String,
    allowNull: true,
  },
  first_party_mobile: {
    type: String,
    allowNull: true,
  },
  second_party_mail: {
    type: String,
    allowNull: true,
  },
  second_party_mobile: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: true,
  },
  consent: {
    type: String,
    enum: ['Y', 'N'],
  },
  consent_timestamp: {
    type: Date,
    allowNull: true,
    defaultValue: Date.now,
  },
  stage: {
    type: Number,
    allowNull: true,
  },
});
var EStamp = (module.exports = mongoose.model('e_stamp_details', EStampSchema));

module.exports.getAll = () => {
  return EStamp.find({});
};

module.exports.findByReqId = (request_id) => {
  return EStamp.findOne({ request_id: request_id });
};

module.exports.updateStage = (request_id, stage, signed_estamp_s3_url) => {
  return EStamp.findOneAndUpdate(
    { request_id },
    { stage, signed_estamp_s3_url },
  );
};

module.exports.insertIntoDb = async (data) => {
  const dbObject = new EStamp(data);
  return dbObject.save();
};

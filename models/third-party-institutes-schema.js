var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const thirdPartyInstituteSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: false,
  },
  third_party_name: {
    type: String,
    allowNull: false,
    unique: true,
  },
  bank_name: {
    type: String,
    allowNull: false,
  },
  bank_account_no: {
    type: String,
    allowNull: false,
    unique: true,
  },
  ifsc_code: {
    type: String,
    allowNull: false,
  },
  bank_account_type: {
    type: String,
    allowNull: false,
  },
  gstin_no: {
    type: String,
    allowNull: false,
    unique: true,
  },
  address: {
    type: String,
    allowNull: false,
  },
  approved_by: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    default: 'inactive',
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
thirdPartyInstituteSchema.plugin(autoIncrement.plugin, 'id');
var ThirdPartyInstitutes = (module.exports = mongoose.model(
  'third_party_institutes',
  thirdPartyInstituteSchema,
));

module.exports.addNew = (data) => {
  return ThirdPartyInstitutes.create(data);
};

module.exports.updateData = (id, data) => {
  return ThirdPartyInstitutes.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.checkAlreadyExists = (where) => {
  return ThirdPartyInstitutes.findOne(where);
};
module.exports.getCount = async (data) => {
  const query = {};
  if (data) {
    query['$and'] = [];
    query['$and'].push({
      company_id: data.company_id,
    });
  }
  if (data.third_party_name)
    query['$and'].push({
      third_party_name: data.third_party_name,
    });
  const response = await ThirdPartyInstitutes.find(query).count();
  return response;
};

module.exports.getPaginateddata = async (data) => {
  const query = {};
  if (data) {
    query['$and'] = [];
    query['$and'].push({
      company_id: data.company_id,
    });
  }
  if (data.third_party_name)
    query['$and'].push({
      third_party_name: data.third_party_name,
    });
  const response = await ThirdPartyInstitutes.find(query)
    .skip(data.page * data.limit)
    .limit(data.limit);
  return {
    rows: response,
  };
};

module.exports.updateStatusById = (id, data) => {
  return ThirdPartyInstitutes.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.findThirdPartyInstitutes = (bank_account_no) => {
  return ThirdPartyInstitutes.find({
    bank_account_no,
    status: 'active',
  });
};

module.exports.findByCondition = (data) => {
  return ThirdPartyInstitutes.findOne(data);
};

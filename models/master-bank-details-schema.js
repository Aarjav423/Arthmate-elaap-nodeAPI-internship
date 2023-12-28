var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

const MasterBankDetailSchema = mongoose.Schema(
  {
    _id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    bene_bank_name: {
      type: String,
      allowNull: true,
    },
    bene_bank_acc_num: {
      type: String,
      allowNull: true,
    },
    bene_bank_ifsc: {
      type: String,
      allowNull: true,
    },
    bene_bank_account_holder_name: {
      type: String,
      allowNull: true,
    },
    bene_bank_account_type: {
      type: String,
      allowNull: true,
      enum: ['Current', 'Savings'],
    },
    penny_drop_status: {
      type: String,
      allowNull: true,
      enum: ['Success', 'Failure', 'Pending'],
    },
    created_by: {
      type: String,
      allowNull: true,
    },
    updated_by: {
      type: String,
      allowNull: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
MasterBankDetailSchema.plugin(autoIncrement.plugin, 'bank_details_request_id');

var MasterBankDetailList = (module.exports = mongoose.model(
  'master_bank_detail',
  MasterBankDetailSchema,
));

module.exports.findByPageWithLimit = async (filter) => {
  const { search, page, limit, status } = filter;
  let createfilter = {};
  if (search !== '' && search !== null) {
    createfilter['bene_bank_account_holder_name'] = search;
  }
  if (status !== '' && status !== null) {
    createfilter['penny_drop_status'] = status;
  }
  const count = await MasterBankDetailList.find({ ...createfilter }).count();
  let sortQuery = {};

  if (search === '' || search === null) {
    sortQuery = { updated_at: -1 };
  } else {
    sortQuery = { bene_bank_account_holder_name: 1 };
  }

  const rows = await MasterBankDetailList.aggregate([
    {
      $match: { ...createfilter },
    },
    { $sort: sortQuery },
    { $skip: page * limit },
    { $limit: limit },
  ]);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.addNew = (data) => {
  return MasterBankDetailList.create(data);
};

// insert update check with id
module.exports.checkIfBankExistWithId = async (bankData, id) => {
  return MasterBankDetailList.findOne({
    bene_bank_acc_num: bankData.bene_bank_acc_num,
    _id: { $ne: id },
  });
};
// insert update check without id
module.exports.checkIfBankExistWithoutId = async (bankData) => {
  return MasterBankDetailList.findOne({
    bene_bank_acc_num: bankData.bene_bank_acc_num,
  });
};

// find the data having penny drop status as failure
module.exports.findById = async (id) => {
  return MasterBankDetailList.findOne({
    _id: id,
    penny_drop_status: 'Failure',
  });
};

//Update the data having the same Id
module.exports.updateById = async (id, bankData) => {
  return MasterBankDetailList.findByIdAndUpdate({ _id: id }, bankData, {
    new: false,
  });
};

// Update the Penny Drop status
module.exports.updatePennyStatusById = async (id, pennyDropStatus) => {
  return MasterBankDetailList.findByIdAndUpdate(
    { _id: id },
    { penny_drop_status: pennyDropStatus },
    { new: false },
  );
};

module.exports.getBeneDetails = async (id) => {
  return MasterBankDetailList.findOne({ _id: id });
};

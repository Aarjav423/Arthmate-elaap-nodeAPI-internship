const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const collectionBankDetailsMasterSchema = mongoose.Schema(
  {
    _id: {
      type: ObjectId,
      primaryKey: true,
      allowNull: false,
    },
    bank_name: {
      type: String,
      allowNull: false,
    },
    bank_acc_num: {
      type: String,
      allowNull: false,
    },
    bank_ifsc: {
      type: String,
      allowNull: false,
    },
    bank_account_type: {
      type: String,
      allowNull: false,
      enum: ['Current', 'Savings'],
    },
  },
);

var collectionBankDetailsMaster = (module.exports = mongoose.model(
  'coll_bank_accounts_master',
  collectionBankDetailsMasterSchema,
));

module.exports.getAll = () => {
  return collectionBankDetailsMaster.find({});
}
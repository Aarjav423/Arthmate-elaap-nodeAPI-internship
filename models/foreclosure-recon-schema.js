var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
mongoose.Promise = global.Promise;
var chargeArrayObject = mongoose.Schema({
  charge_amount: {
    type: Number,
    allowNull: true,
  },
  charge_id: {
    type: String,
    allowNull: false,
    required: true,
  },
  charge_type: {
    type: String,
    allowNull: true,
  },
  gst: {
    type: Number,
    allowNull: true,
  },
  igst: {
    type: Number,
    allowNull: true,
  },
  cgst: {
    type: Number,
    allowNull: true,
  },
  sgst: {
    type: Number,
    allowNull: true,
  },
  application_date: {
    type: Date,
    allowNull: true,
  },
});

var waiverArrayObject = mongoose.Schema({
  txn_reference: {
    type: Number,
    allowNull: false,
    required: true,
  },
  label: {
    type: String,
    allowNull: true,
  },
  waiver_type: {
    type: Number,
    allowNull: true,
  },
  txn_amount: {
    type: Number,
    allowNull: true,
  },
  gst_reversal: {
    type: Number,
    allowNull: true,
  },
});

var ForeclosureReconSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  req_id: {
    type: Number,
    allowNull: true,
    required: true,
  },
  company_id: {
    type: Number,
    allowNull: false,
    required: true,
  },
  product_id: {
    type: Number,
    allowNull: false,
    required: true,
  },
  loan_id: {
    type: String,
    allowNull: false,
    required: true,
  },
  seq_id: {
    type: Number,
    allowNull: true,
    required: true,
  },
  foreclosure_amount: {
    type: Number,
    allowNull: true,
  },
  foreclosure_date: {
    type: Date,
    allowNull: true,
  },
  excess_received: {
    type: Number,
    allowNull: true,
  },
  int_on_termination: {
    type: Number,
    allowNull: true,
  },
  charge_array: [chargeArrayObject],
  waiver_array: [waiverArrayObject],
  status: {
    type: String,
    enum: [
      'offered',
      'pending',
      'invalid',
      'approved',
      'rejected',
      'completed',
    ],
  },
  type:{
    type:String,
    allowNull:true,
    default:null
  }
},{
  timestamps: {
    updatedAt : "updated_at",
    createdAt : "created_at"
  },
});

autoIncrement.initialize(mongoose.connection);
ForeclosureReconSchema.plugin(autoIncrement.plugin, 'id');
var ForeclosureReconSchema = (module.exports = mongoose.model(
  'foreclosure_recon',
  ForeclosureReconSchema,
));

//insert new foreclosure schema
module.exports.addNew = async (data) => {
  return ForeclosureReconSchema.create(data);
};

module.exports.statusApproved = (loan_id, _id) => {
  return ForeclosureReconSchema.findOne({
    status: 'approved',
    loan_id: loan_id,
    _id: _id,
  });
};

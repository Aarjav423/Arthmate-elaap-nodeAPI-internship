const mongoose = require('mongoose');
const { toJSON, paginate, aggregatePaginate } = require("./plugins");
const {
  paymentStatus,
  paymentMode,
  paymentType,
  originPaymentStatus,
} = require('../config/payment');

const paymentSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'coll_details',
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mode: {
      type: String,
      enum: [paymentMode.ONLINE, paymentMode.OFFLINE],
    },
    type: {
      type: String,
      enum: [paymentType.FULL, paymentType.PARTIAL],
    },
    status: {
      type: String,
      enum: [paymentStatus.PENDING, paymentStatus.PAID, paymentStatus.FAILED],
      default: paymentStatus.PENDING,
    },
    originStatus: {
      type: String,
      enum: [originPaymentStatus.PENDING, originPaymentStatus.SUCCESS],
      default: originPaymentStatus.PENDING,
    },
    updatedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'coll_users',
      required: true,
    },
    paymentProofs: {
      type: String,
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.plugin(toJSON);
paymentSchema.plugin(paginate);
paymentSchema.plugin(aggregatePaginate);

const Payment = mongoose.model('coll_payments', paymentSchema);

module.exports = Payment;

const paymentStatus = {
  PAID: 'paid',
  PENDING: 'pending',
  REFUND: 'refund',
  FAILED: 'failed',
};
const paymentMode = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};
const paymentType = {
  FULL: 'full',
  PARTIAL: 'PARTIAL',
};
const originPaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
};

module.exports = {
  paymentStatus,
  paymentMode,
  paymentType,
  originPaymentStatus,
};

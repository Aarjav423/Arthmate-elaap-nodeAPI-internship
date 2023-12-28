'use strict';

const tdsStatus = {
  Open: 'Open',
  Rejected: 'Rejected',
  Processed: 'Processed',
  Failed: 'Failed',
};
const refundType = {
  TDS_REFUND: 'tds_refund',
  INTEREST_REFUND: 'interest_refund',
};

module.exports = {
  tdsStatus,
  refundType,
};

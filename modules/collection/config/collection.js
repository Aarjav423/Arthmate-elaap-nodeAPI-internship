const statusTypes = {
  OPEN: 'open',
  CLOSED: 'closed',
  ONGOING: 'ongoing',
  PARTIALLY_PAID: 'partially_paid',
};

const depositionStatusTypes = {
  PTP: 'ptp',
  BROKEN_PTP: 'broken_ptp',
  DISPUTE: 'dispute',
  RTP: 'rtp',
  SHIFTED: 'shifted',
  SETTLEMENT: 'settlement',
  ADDRESS_NOT_FOUND: 'address_not_found',
  VISIT_PENDING: 'visit_pending',
  VISIT_SCHEDULED: 'visit_scheduled',
};

module.exports = {
  statusTypes,
  depositionStatusTypes,
};

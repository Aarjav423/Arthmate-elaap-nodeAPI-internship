const mongoose = require('mongoose');

const { toJSON } = require('./plugins');

const timeSlotSchema = mongoose.Schema(
  {
    managerID: {
      type: String,
      required: false,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
timeSlotSchema.plugin(toJSON);

/**
 * @typedef TimeSlot
 */
const TimeSlot = mongoose.model('coll_time_slots', timeSlotSchema);

module.exports = TimeSlot;

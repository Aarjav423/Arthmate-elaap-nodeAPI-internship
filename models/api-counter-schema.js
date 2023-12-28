let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ApiCounterSchema = mongoose.Schema(
  {
    key: {
      type: String,
      allowNull: true,
    },
    daily_hits: {
      type: Number,
      allowNull: true,
    },
    monthly_hits: {
      type: Number,
      allowNull: true,
    },
    weekly_hits: {
      type: Number,
      allowNull: true,
    },
    total_hits: {
      type: Number,
      allowNull: true,
    },
    last_reset: {
      type: Number,
      allowNull: true,
    },
    request_id: {
      type: String,
      allowNull: true,
    },
    api_name: {
      type: String,
      allowNull: true,
    },
    count: {
      type: Number,
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

let ApiCounter = (module.exports = mongoose.model(
  'api_count_details',
  ApiCounterSchema,
));

module.exports.createCounter = (data) => {
  const insertdata = new ApiCounter(data);
  return insertdata.save();
};

module.exports.fetchApiCount = (key) => {
  return ApiCounter.findOne({ key: key });
};

module.exports.updateCounter = (
  key,
  daily_hits,
  weekly_hits,
  monthly_hits,
  total_hits,
) => {
  return ApiCounter.findOneAndUpdate(
    { key: key },
    {
      daily_hits: daily_hits,
      weekly_hits: weekly_hits,
      monthly_hits: monthly_hits,
      total_hits: total_hits,
      last_reset: Date.now(),
    },
  );
};

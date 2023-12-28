var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const WebhookNotifySchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  transaction_id: {
    type: String,
    allowNull: false,
  },
  client_end_point: {
    type: String,
    allowNull: false,
  },
  event_key: {
    type: String,
    allowNull: false,
  },
  req_s3_url: {
    type: String,
    allowNull: false,
  },
  res_s3_url: {
    type: String,
    allowNull: false,
  },
  client_response_code: {
    type: String,
    allowNull: false,
  },
  api_type: { type: String, allowNull: true },
  webhook_status_code: { type: String, allowNull: true },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
WebhookNotifySchema.plugin(autoIncrement.plugin, 'id');
var WebhookNotify = (module.exports = mongoose.model(
  'webhook_notify_calls',
  WebhookNotifySchema,
));

module.exports.getAll = () => {
  return WebhookNotify.find({});
};

module.exports.addNew = (data) => {
  return WebhookNotify.create(data);
};

module.exports.getAll = () => {
  return WebhookNotify.find();
};

module.exports.findIfExistAndRecord = async (data) => {
  const alreadyExist = await WebhookNotify.findOne({
    transaction_id: data.transaction_id,
  });
  if (alreadyExist) {
    delete data.company_id;
    delete data.product_id;
    delete data.client_end_point;
    delete data.disbursement;
    return WebhookNotify.findOneAndUpdate(
      { transaction_id: data.transaction_id },
      data,
      {},
    );
  } else {
    return WebhookNotify.create(data);
  }
};

module.exports.recordWebhookRequestData = async (data) => {
  const {
    company_id,
    product_id,
    transaction_id,
    req_s3_url,
    webhook_status_code,
    event_key,
  } = data;
  try {
    const alreadyExist = await WebhookNotify.findOne({
      transaction_id,
    });
    if (alreadyExist) {
      if (
        alreadyExist.webhook_status_code === webhook_status_code ||
        Number(alreadyExist.webhook_status_code) > Number(webhook_status_code)
      )
        return alreadyExist;
      return WebhookNotify.findOneAndUpdate({ transaction_id }, data, {});
    } else {
      return WebhookNotify.create(data);
    }
  } catch (error) {
    return error;
  }
};

module.exports.recordWebhookForeclosureRequestData = async (data) => {
  const { company_id, product_id, transaction_id, req_s3_url, event_key } =
    data;
  try {
    const alreadyExist = await WebhookNotify.findOne({
      transaction_id,
    });
    if (alreadyExist) {
      return WebhookNotify.findOneAndUpdate({ transaction_id }, data, {});
    } else {
      return WebhookNotify.create(data);
    }
  } catch (error) {
    return error;
  }
};

module.exports.recordAScoreRequestData = async (data) => {
  const { company_id, product_id, transaction_id, req_s3_url, event_key } =
    data;
  try {
    const alreadyExist = await WebhookNotify.findOne({
      transaction_id,
    });
    if (alreadyExist) {
      return WebhookNotify.findOneAndUpdate({ transaction_id }, data, {});
    } else {
      return WebhookNotify.create(data);
    }
  } catch (error) {
    return error;
  }
};

module.exports.recordForeclosureClientResponseData = async (data) => {
  const { company_id, product_id, transaction_id, req_s3_url, event_key } =
    data;
  const alreadyExist = await WebhookNotify.findOne({
    transaction_id,
  });
  if (alreadyExist) {
    return WebhookNotify.findOneAndUpdate(
      { transaction_id: data.transaction_id },
      data,
      {},
    );
  }
};

module.exports.recordClientResponseData = async (data) => {
  const {
    company_id,
    product_id,
    transaction_id,
    req_s3_url,
    webhook_status_code,
    event_key,
  } = data;
  const alreadyExist = await WebhookNotify.findOne({
    transaction_id,
  });
  if (alreadyExist) {
    return WebhookNotify.findOneAndUpdate(
      { transaction_id: data.transaction_id },
      data,
      {},
    );
  }
};

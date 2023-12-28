var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const SchemeSchema = mongoose.Schema(
  {
    request_id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    interest_rate: {
      type: Number,
      allowNull: false,
    },
    scheme_name: {
      type: String,
      allowNull: false,
    },
    interest_type: {
      type: String,
      allowNull: false,
      enum: ['Upfront', 'Rear-end'],
    },
    penal_rate: {
      type: Number,
      allowNull: false,
    },
    bounce_charge: {
      type: Number,
      allowNull: false,
    },
    repayment_days: {
      type: Number,
      allowNull: false,
    },
    created_by: {
      type: String,
      allowNull: false,
    },
    updated_by: {
      type: String,
      allowNull: true,
    },
    status: {
      type: Boolean,
      allowNull: false,
      default: true,
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
SchemeSchema.plugin(autoIncrement.plugin, 'request_id');
let SchemeSchemaData = (module.exports = mongoose.model(
  'scheme',
  SchemeSchema,
));

module.exports.addNew = async (data) => {
  return SchemeSchemaData.create(data);
};
module.exports.updateStatus = (id, sts) => {
  return SchemeSchemaData.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: sts,
      },
    },
    {},
  );
};

module.exports.findByConditionWithLimit = async (
  condition,
  requestIdFlag,
  page,
  limit,
) => {
  if (requestIdFlag) {
    const row = await SchemeSchemaData.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: 'product_scheme_mappings',
          localField: '_id',
          foreignField: 'scheme_id',
          as: 'product_mapping',
        },
      },
      {
        $project: {
          interest_rate: 1,
          scheme_name: 1,
          interest_type: 1,
          penal_rate: 1,
          bounce_charge: 1,
          repayment_days: 1,
          created_by: 1,
          updated_by: 1,
          status: 1,
          created_at: 1,
          updated_at: 1,
          product_count: {
            $size: '$product_mapping',
          },
        },
      },
    ])
      .skip(page * Number.parseInt(limit))
      .limit(Number.parseInt(limit))
      .sort({
        _id: -1,
      });
    const count = await SchemeSchemaData.find(condition).count();
    return {
      rows: row,
      count: count,
    };
  }
  const row = await SchemeSchemaData.aggregate([
    { $match: condition },
    {
      $lookup: {
        from: 'product_scheme_mappings',
        localField: '_id',
        foreignField: 'scheme_id',
        as: 'product_mapping',
      },
    },
    {
      $project: {
        interest_rate: 1,
        scheme_name: 1,
        interest_type: 1,
        penal_rate: 1,
        bounce_charge: 1,
        repayment_days: 1,
        created_by: 1,
        updated_by: 1,
        status: 1,
        created_at: 1,
        updated_at: 1,
        product_count: {
          $size: '$product_mapping',
        },
      },
    },
  ])
    .skip(page * Number.parseInt(limit))
    .limit(Number.parseInt(limit))
    .sort({
      _id: -1,
    });
  const count = await SchemeSchemaData.find(condition).count();
  return {
    rows: row,
    count: count,
  };
};

module.exports.getById = async (id) => {
  return SchemeSchemaData.findOne({
    _id: id,
  });
};

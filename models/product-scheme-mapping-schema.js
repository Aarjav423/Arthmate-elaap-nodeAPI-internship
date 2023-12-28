var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
var ProductSchemeMappingSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    scheme_id: {
      type: Number,
      allowNull: false,
    },
    product_id: {
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
ProductSchemeMappingSchema.plugin(autoIncrement.plugin, 'scheme_id');
var ProductSchemeMapping = (module.exports = mongoose.model(
  'product_scheme_mapping',
  ProductSchemeMappingSchema,
));

//insert new foreclosure schema
module.exports.addNew = async (data) => {
  return ProductSchemeMapping.create(data);
};

module.exports.getAll = () => {
  return ProductSchemeMapping.find({});
};

module.exports.getByProductAndSchemeId = async (data) => {
  return ProductSchemeMapping.findOne({
    product_id: data.product_id,
    scheme_id: data.scheme_id,
  });
};
module.exports.getById = async (id) => {
  return ProductSchemeMapping.findOne({
    _id: id,
  });
};

module.exports.productSchemeMapping = async (product_id) => {
  return ProductSchemeMapping.find({
    product_id: product_id,
  });
};

module.exports.getAllSchemeByProductId = async (product_id) => {
  return ProductSchemeMapping.aggregate([
    {
      $match: {
        product_id: parseInt(product_id),
      },
    },
    {
      $lookup: {
        from: 'schemes',
        localField: 'scheme_id',
        foreignField: '_id',
        as: 'schemeData',
      },
    },
    {
      $unwind: {
        path: '$schemeData',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        _id: 0,
        value: '$schemeData._id',
        key: '$schemeData.scheme_name',
      },
    },
  ]);
};

module.exports.updateStatus = (id, sts) => {
  return ProductSchemeMapping.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: sts,
      },
    },
    {},
  );
};

module.exports.getFilteredProductSchemeMapping = async (filter) => {
  const { scheme_id, product_id, page, limit, status } = filter;
  let createfilter = {};
  if (product_id) {
    createfilter['product_id'] = parseInt(product_id);
  }
  if (scheme_id) {
    createfilter['scheme_id'] = parseInt(scheme_id);
  }
  if (status) {
    if (String(status).toLowerCase() == 'true') {
      createfilter['status'] = true;
    }
    if (String(status).toLowerCase() == 'false') {
      createfilter['status'] = false;
    }
  }
  const count = await ProductSchemeMapping.find({ ...createfilter }).count();
  const rows = await ProductSchemeMapping.aggregate([
    {
      $match: { ...createfilter },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product_id',
        foreignField: '_id',
        as: 'productData',
      },
    },
    {
      $lookup: {
        from: 'schemes',
        localField: 'scheme_id',
        foreignField: '_id',
        as: 'schemeData',
      },
    },
    {
      $project: {
        _id: '$_id',
        product_name: {
          $arrayElemAt: ['$productData.name', 0],
        },
        scheme_name: {
          $arrayElemAt: ['$schemeData.scheme_name', 0],
        },
        interest_rate: {
          $arrayElemAt: ['$schemeData.interest_rate', 0],
        },
        bounce_charge: {
          $arrayElemAt: ['$schemeData.bounce_charge', 0],
        },
        interest_type: {
          $arrayElemAt: ['$schemeData.interest_type', 0],
        },
        penal_rate: {
          $arrayElemAt: ['$schemeData.penal_rate', 0],
        },
        repayment_days: {
          $arrayElemAt: ['$schemeData.repayment_days', 0],
        },
        scheme_id: {
          $arrayElemAt: ['$schemeData._id', 0],
        },
        company_id: {
          $arrayElemAt: ['$productData.company_id', 0],
        },
        product_id: '$product_id',
        status: '$status',
      },
    },
    { $skip: page * limit },
    {
      $limit: parseInt(limit),
    },
    { $sort: { product_id: -1 } },
  ]);
  return {
    rows: rows,
    count: count,
  };
};

module.exports.fetchSchemeByProductSchemeMappingId = async (
  product_scheme_id,
  product_id,
) => {
  let schemes =
    (await ProductSchemeMapping.aggregate([
      {
        $match: {
          _id: parseInt(product_scheme_id),
          product_id: parseInt(product_id),
        },
      },
      {
        $lookup: {
          from: 'schemes',
          localField: 'scheme_id',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      {
        $unwind: {
          path: '$scheme',
          preserveNullAndEmptyArrays: true,
        },
      },
    ])) || [];
  return schemes.length > 0 ? schemes[0] : null;
};

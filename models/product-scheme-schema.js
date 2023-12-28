var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const ProductSchemeSchema = mongoose.Schema(
  {
    request_id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    product_id: {
      type: Number,
      allowNull: false,
    },
    scheme_id: {
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
ProductSchemeSchema.plugin(autoIncrement.plugin, 'request_id');
let ProductSchemeSchemaData = (module.exports = mongoose.model(
  'scheme',
  ProductSchemeSchema,
));

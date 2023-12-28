var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const anchorSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: String,
      allowNull: false,
    },
    cin: {
      type: String,
      allowNull: false,
    },
    directors: {
      type: Array,
      allowNull: false,
      required: true,
    },
    business_phone: {
      type: String,
      allowNull: false,
    },
    anchor_address: {
      type: String,
      allowNull: false,
    },
    pin_code: {
      type: Number,
      allowNull: false,
    },
    city: {
      type: String,
      allowNull: false,
    },
    state: {
      type: String,
      allowNull: false,
    },
    website: {
      type: String,
      allowNull: true,
    },
    gstin: {
      type: String,
      allowNull: false,
    },
    tin: {
      type: String,
      allowNull: false,
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
anchorSchema.plugin(autoIncrement.plugin, 'id');
var anchor = (module.exports = mongoose.model('anchor', anchorSchema));

module.exports.search = async (data) => {
  const regex = `^${data.name}$`;

  return anchor.aggregate([
    {
      $match: {
        name: {
          $regex: new RegExp(regex, 'i'),
        },
      },
    },
  ]);
};

module.exports.listAllPaginatedSearch = async (page, limit, str) => {
  try {
    let query = {};

    if (str !== 'null' && str !== null) {
      query = {
        $or: [
          {
            name: {
              $regex: str,
              $options: 'i',
            },
          },
        ],
      };
      if (!isNaN(str))
        query['$or'].push({
          _id: str,
        });
    }

    const result = await anchor
      .find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({
        _id: -1,
      });
    const count = await anchor.find(query).count();
    return { rows: result, count };
  } catch (error) {}
};

module.exports.findByAnchorId = (_id) => {
  return anchor.findOne({
    _id,
  });
};

module.exports.addNew = (data) => {
  return anchor.create(data);
};

module.exports.addAnchor = (anchordata) => {
  return anchor.create(anchordata);
};

module.exports.listAll = () => {
  return anchor.find();
};

module.exports.isAnchorIdExistByName = (anchor_name) => {
  return anchor.findOne({ name: anchor_name });
};

module.exports.deleteById = function (id) {
  return anchor.remove({ _id: id });
};

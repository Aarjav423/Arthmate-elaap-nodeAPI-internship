var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var bcrypt = require('bcryptjs');
//roles
const RolesSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  title: {
    type: String,
    allowNull: false,
  },
  description: {
    type: String,
    allowNull: true,
  },
  editperm: {
    type: Number,
    allowNull: true,
  },
  manageperm: {
    type: Number,
    allowNull: true,
  },
  viewperm: {
    type: Number,
    allowNull: true,
  },
  roleflag: {
    type: Number,
    allowNull: true,
  },
  tags: {
    type: Array,
    allowNull: true,
  },
  updatedon: {
    type: Date,
    default: Date.now,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  create_date: {
    type: Date,
    default: Date.now,
  },
  created_by:{
    type: String,
    allowNull: true
  },
  updated_by:{
    type:String,
    allowNull: true
  }
},
{timestamps: {
  createdAt: 'create_date',
  updatedAt: 'updatedon',
},
});

autoIncrement.initialize(mongoose.connection);
RolesSchema.plugin(autoIncrement.plugin, 'id');
var Roles = (module.exports = mongoose.model('roles', RolesSchema));

module.exports.addNew = (role) => {
  var Addrole = new Roles(role);
  return Addrole.save();
};
module.exports.findIfExistById = (id) => {
  return Roles.findOne({ _id: id });
};

module.exports.getAll = () => {
  return Roles.find({}).sort({ _id: -1 });
};

module.exports.updateOne = (data, title) => {
  const query = {
    title: title,
  };
  return Roles.findOneAndUpdate(query, data, {});
};

module.exports.findByName = (title) => {
  return Roles.findOne({
    title: title,
  });
};

module.exports.findIfExist = (title, tags) => {
  var query = {};
  query['$or'] = [];
  if (title) {
    query['$or'].push({
      title,
    });
  }
  return Roles.findOne(query);
};

module.exports.updateRole = (query, data) => {
  return Roles.findOneAndUpdate(query, data, {});
};

module.exports.getByMultipleIds = (ids) => {
  return Roles.find({
    _id: {
      $in: ids,
    },
  });
};

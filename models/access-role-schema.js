var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');

const AccessRoleSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },

  title: {
    type: String,
    allowNull: true,
  },
  status: {
    type: Boolean,
    allowNull: true,
  },
  metrix_tags: {
    type: Array,
    allowNull: true,
  },
});
autoIncrement.initialize(mongoose.connection);
AccessRoleSchema.plugin(autoIncrement.plugin, 'id');
var AccessRole = (module.exports = mongoose.model(
  ' access_role',
  AccessRoleSchema,
));

module.exports.addNew = (data) => {
  return AccessRole.create(data);
};

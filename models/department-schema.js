var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const DepartmentsSchema = mongoose.Schema({
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
    allowNull: true,
  },
  description: {
    type: String,
    allowNull: true,
  },
  deptflag: {
    type: Number,
    allowNull: true,
  },
  status: {
    type: Number,
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
});

autoIncrement.initialize(mongoose.connection);
DepartmentsSchema.plugin(autoIncrement.plugin, 'id');
var Departments = (module.exports = mongoose.model(
  'departments',
  DepartmentsSchema,
));

module.exports.addNew = (department) => {
  var insertdata = new Departments(department);
  return insertdata.save();
};
module.exports.getAll = () => {
  return Departments.find({});
};

module.exports.updateOne = (data, title) => {
  return Departments.findOneAndUpdate(
    {
      title,
    },
    data,
    {},
  );
};

module.exports.findByName = (title) => {
  return Departments.findOne({
    title,
  });
};

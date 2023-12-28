var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({
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
  username: {
    type: String,
    allowNull: true,
  },
  userpic: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: Number,
    allowNull: true,
    default: 0,
  },
  company_name: {
    type: String,
    allowNull: true,
    default: '',
  },
  designation: {
    type: String,
    allowNull: false,
  },
  department: {
    type: Array,
    allowNull: false,
  },
  userroles: {
    type: Array,
    allowNull: false,
  },
  role_metrix: {
    type: Array,
    allowNull: true,
  },
  userpass: {
    type: String,
    allowNull: false,
  },
  userflag: {
    type: Boolean,
    allowNull: true,
  },
  email: {
    type: String,
    allowNull: true,
  },
  type: {
    type: String,
    allowNull: true,
  },
  user_attempt: {
    type: Boolean,
    allowNull: true,
  },
  status: {
    type: Boolean,
    allowNull: false,
    default: true,
  },
  approval_amount_threshold: {
    type: Number,
    allowNull: true,
  },
  co_lender_id: {
    type: Number,
    allowNull: true,
  },
  co_lender_name: {
    type: String,
    allowNull: true,
  },
  updatedby: {
    type: String,
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
  password_updated_at: {
    type: Date,
    allowNull: true,
  },
  last_login_at: {
    type: Date,
    allowNull: true,
  },
  recent_passwords: {
    type: Array,
    allowNull: true,
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
userSchema.plugin(autoIncrement.plugin, 'id');
var Users = (module.exports = mongoose.model('User', userSchema));

module.exports.addOne = async (user) => {
  var new_user = new Users(user);
  const password = user.userpass;
  const saltRounds = 10;
  try {
    new_user.userpass = await bcrypt.hash(password, saltRounds);
    return new_user.save();
  } catch (error) {
    return error;
  }
};

module.exports.getAll = () => {
  return Users.find({}).select('-userpass').sort({
    create_date: -1,
  });
};

module.exports.getAllUsers = (company_id) => {
  return Users.find({
    company_id: company_id,
  });
};

module.exports.checkEmailAlreadyExists = (user) => {
  return Users.findOne({
    $and: [
      {
        email: user.email,
      },
      {
        company_id: user['company_id'] || 0,
      },
    ],
  });
};

module.exports.checkUserByEmailUsername = (user) => {
  return Users.findOne({
    $and: [
      {
        email: user.email,
      },
      {
        username: user.username,
      },
      {
        company_id: user['company_id'] || 0,
      },
    ],
  });
};

module.exports.findById = (id) => {
  return Users.findOne({
    _id: id,
  });
};

module.exports.selectOne = (email) => {
  return Users.findOne({
    email,
  });
};

module.exports.updateOne = (userIdValue, userDataVal) => {
  return Users.findOneAndUpdate(
    {
      _id: userIdValue,
    },
    {
      $set: {
        username: userDataVal.username,
        company_id: userDataVal.company_id,
        company_name: userDataVal.company_name,
        designation: userDataVal.designation,
        department: userDataVal.department,
        userroles: userDataVal.userroles,
        userpass: userDataVal.encryptedPassword,
        password_updated_at: userDataVal.password_updated_at,
      },
    },
  );
};

module.exports.updateStatus = (userData) => {
  const query = {
    _id: userData.id,
  };
  const status = {
    status: userData.status,
  };

  return Users.findOneAndUpdate(query, status, {
    new: true,
  });
};

module.exports.findByCompany = (company_id) => {
  return Users.findOne({
    company_id,
  });
};

module.exports.findByCompanyName = (company_name) => {
  return Users.findOne({
    company_name: company_name,
  });
};

module.exports.updateUserById = (id, data) => {
  return Users.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {
      new: true,
    },
  );
};

module.exports.getByUsername = (username) => {
  return Users.findOne({
    username,
  });
};

module.exports.updateUserData = (_id, data) => {
  return Users.findOneAndUpdate({ _id }, data, {
    new: true,
  });
};

module.exports.getBySearcString = (searchstring) => {
  return Users.find({
    $or: [
      { username: { $regex: searchstring, $options: 'i' } },
      { email: { $regex: searchstring, $options: 'i' } },
    ],
  });
};

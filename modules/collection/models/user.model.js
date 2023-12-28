const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');

const detailSchema = mongoose.Schema(
  {},
  {
    strict: false,
  },
);

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error(
            'Password must contain at least one letter and one number',
          );
        }
      },
      private: true, // used by the toJSON plugin
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    manager_id: {
      type: String,
      required: true,
    },
    collection_agency_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'coll_agencies',
      required: true,
    },
    device_id: {
      type: String,
    },
    details: {
      type: detailSchema,
    },
    updatedBy: {
      type: String,
      ref: 'users',
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Checks if a mobile number is already taken by another user, excluding a specific user.
 *
 * @param {string} mobile - The mobile number to check.
 * @param {string} excludeUserId - The ID of the user to exclude from the check.
 * @return {boolean} Returns true if the mobile number is already taken by another user, otherwise false.
 */
userSchema.statics.isMobileTaken = async function (mobile, excludeUserId) {
  const user = await this.findOne({ mobile, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();

  if (update.$set.password) {
    const passwordHash = await bcrypt.hash(update.$set.password, 8);
    this.setUpdate({
      $set: {
        password: passwordHash,
      },
    });
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('coll_users', userSchema);

module.exports = User;

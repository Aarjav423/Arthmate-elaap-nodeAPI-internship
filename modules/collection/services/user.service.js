const httpStatus = require('http-status');
const { User, Pincode, Agency, Case } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const { checkLocationPincode } = require('./location.service');
const pick = require('../utils/pick');
const { createLog } = require('./activityLog.service');
const { activityTypes } = require('../config/activity');

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (query) => {
  const filter = pick(query, ['name', 'collection_agency_id']);
  const options = pick(query, ['sortBy', 'limit', 'page', 'populate']);
  let users = [];
  if (query.pagination == 'false') {
    users = await User.find({ isActive: true, ...filter }).select('name');
  } else {
    options.select = '-password';//fields which will be removed from the response object.
    users = await User.paginate(filter, options);
  }

  return users;
};

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  let errors = {};
  let error_text = 'There is some error in payload.';

  if (await User.isEmailTaken(userBody.email)) {
    errors['email'] = 'This email already exists';
    error_text = 'Email ID has been already taken';
  }
  if (await User.isMobileTaken(userBody.mobile)) {
    errors['mobile'] = 'This mobile number already exists';
    error_text = 'Mobile number has been already taken';
  }

  try {
    await Agency.findOne({ _id: userBody.collection_agency_id });
  } catch (e) {
    errors['collection_agency_id'] = 'Agency is not associated with us.';
  }

  if (Object.values(errors).length != 0) {
    if (errors['email'] && errors['mobile']) {
      error_text = 'Email ID and Mobile number has been already taken';
    }

    throw new ApiError(httpStatus.BAD_REQUEST, error_text, errors);
  }

  const user = await User.create(userBody);

  const log = {
    event_type: activityTypes.ADMIN_OPS,
    fos_id: user.id,
    description: `Admin created a new FOS agent with id ${user.id}`,
    manager_id: userBody['manager_id'],
  };

  await createLog(log);

  return user;
};

/**
 * Get user by ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide valid user ID.');
  }

  return await User.findOne({ _id: id });
};

/**
 * Update user details
 * @param {string} id - User IDs
 * @param {Object} updateBody - Updated user data
 * @returns {Promise<User>}
 */
const updateUserDetails = async (id, updateBody) => {
  let user = await getUserById(id);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if the user is assigned to any collections
  const caseAssignedToUser = await Case.findOne({ assigned_to: id });

  if (caseAssignedToUser && updateBody.isActive === false) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Remove all the pending cases against ${user.name}`,
    );
  }

  let errors = {};
  let error_text = 'There is some error in payload.';
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, id))) {
    errors['email'] = 'This email already exists';
    error_text = 'Email ID has been already taken';
  }
  if (updateBody.mobile && (await User.isMobileTaken(updateBody.mobile, id))) {
    errors['mobile'] = 'This mobile number already exists';
    error_text = 'Mobile number has been already taken';
  }

  try {
    await Agency.findOne({ _id: updateBody.collection_agency_id });
  } catch (e) {
    errors['collection_agency_id'] = 'Agency is not associated with us.';
  }

  if (Object.values(errors).length != 0) {
    if (errors['email'] && errors['mobile']) {
      error_text = 'Email ID and Mobile number has been already taken';
    }

    throw new ApiError(httpStatus.BAD_REQUEST, error_text, errors);
  }

  let updatePayloadDetails = {
    name: updateBody['name'],
    email: updateBody['email'],
    mobile: updateBody['mobile'],
    password: updateBody['password'],
    isActive: updateBody['isActive'],
    collection_agency_id: updateBody['collection_agency_id'],
    'details.address_line_1': updateBody['address_line_1'],
    'details.address_line_2': updateBody['address_line_2'],
    'details.city': updateBody['city'],
    updatedBy: updateBody['updatedBy'],
  };

  if (updateBody['pincode']) {
    updateBody['pincode'] = parseInt(updateBody['pincode']);

    await checkLocationPincode(
      updateBody['pincode'],
      updateBody['district'],
      updateBody['state'],
    );

    updatePayloadDetails = {
      ...updatePayloadDetails,
      'details.pincode': updateBody['pincode'],
      'details.district': updateBody['district'],
      'details.state': updateBody['state'],
    };
  }

  user = await User.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updatePayloadDetails,
      },
    },
    { new: true, projection: {} },
  ).populate('collection_agency_id');

  let updatedKeys = Object.keys(updateBody).map((item) => {
    if (updateBody[item] != null && updateBody[item] != undefined) {
      return item;
    }
  });

  const log = {
    event_type: activityTypes.ADMIN_OPS,
    fos_id: id,
    description: `Admin updated the details of fos user (${id}): ${updatedKeys.join()} `,
    manager_id: updateBody['updatedBy'],
  };

  await createLog(log);

  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  updateUserDetails,
};

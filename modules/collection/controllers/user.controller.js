const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { mailService, userService, locationService } = require('../services');
const {
  generateRandomPassword,
  removeDuplicates,
} = require('../utils/helpers');
const { Pincode } = require('../models');
const path = require('path');
const ejs = require('ejs');

/**
 * Method to fetcg fos users based on filters
 */
const getFosUsers = catchAsync(async (req, res) => {
  const result = await userService.queryUsers(req.query);

  return res.status(httpStatus.OK).send(result);
});

const getFosUser = catchAsync(async (req, res) => {
  const id = req.params.userID;

  const result = await userService.getUserById(id);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'User detail fetched successfully.',
    data: result,
  });
});

/**
 * Method to add fos user
 */
const addFosUser = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);

  await locationService.checkLocationPincode(
    req.body.pincode,
    req.body.district,
    req.body.state,
  );

  const password = generateRandomPassword();

  const fosUser = {
    collection_agency_id: req.body.collection_agency_id,
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    password: password,
    manager_id: req.authData.user_id,
    updatedBy: req.authData.user_id,
    details: {
      address_line_1: req.body.address_line_1,
      address_line_2: req.body.address_line_2,
      city: req.body.city,
      district: req.body.district,
      state: req.body.state,
      pincode: parseInt(req.body.pincode),
    },
  };

  const result = await userService.createUser(fosUser);

  const templatePath = path.join(
    __dirname,
    '..',
    'templates',
    'credentials.template.ejs',
  );
  const templateContent = await ejs.renderFile(templatePath, {
    username: req.body.name,
    email: req.body.email,
    password: password,
  });
  await mailService.sendMail(
    req.body.email,
    'Welcome to the Collection APP',
    templateContent,
    'This is the plain text content of the email.',
  );

  return res.status(httpStatus.OK).send({
    success: true,
    message: 'You have added a new FOS Agent.',
    data: result,
  });
});

const updateFosUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const updatePayload = pick(req.body, [
    'name',
    'email',
    'mobile',
    'isUpdatePassword',
    'isActive',
    'address_line_1',
    'address_line_2',
    'city',
    'district',
    'state',
    'pincode',
    'collection_agency_id',
  ]);

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No attributes present in body');
  }

  if (updatePayload['isUpdatePassword']) {
    updatePayload['password'] = generateRandomPassword();
  }

  let updatedUser = await userService.updateUserDetails(id, {
    ...updatePayload,
    updatedBy: req.authData.user_id
  });

  if (updatePayload['isUpdatePassword'] == true) {
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      'resetPassword.template.ejs',
    );
    const templateContent = await ejs.renderFile(templatePath, {
      username: updatedUser.name,
      email: updatedUser.email,
      password: updatePayload['password'],
    });
    await mailService.sendMail(
      updatedUser.email,
      'Collection app password updated',
      templateContent,
      'This is the plain text content of the email.',
    );
  }

  return res.status(httpStatus.OK).send({
    success: true,
    message: `You have updated ${updatedUser.name}'s details.`,
    data: updatedUser,
  });
});

module.exports = {
  getFosUsers,
  getFosUser,
  addFosUser,
  updateFosUser,
};

const httpStatus = require('http-status');
const { Agency } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const pick = require('../utils/pick');


const queryAgencies = async (query) => {
  const filter = {}
  const options = pick(query, ['limit', 'page']);
  let collectionAgency = [];
  if (query.pagination == 'true') {
    collectionAgency = await Agency.paginate(filter, options);
  } else {
    collectionAgency = await await Agency.find();
  }
  return collectionAgency;
};

const createAgency = async (userBody) => {
  return Agency.create({...userBody, isActive: true});
};

/**
 * Get user by ID
 * @param {string} id
 * @returns {Promise<Agency>}
 */
const getAgencyById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide valid Agency ID.');
  }
  return await Agency.findOne({ _id: id });
};

const updateAgency = async (agencyId, requestBody) => {
  const currentAgency = await Agency.findOne({ _id: agencyId });
  const updateAgency = await Agency.findOneAndUpdate(
    { _id: agencyId },
    {
      $set: {
        ...requestBody,
      },
    },
    { new: true, projection: {} },);
  return {
    success: true,
    message: `Updated the ${currentAgency.name} agency`,
    data: updateAgency._doc,
  }
};

module.exports = {
  queryAgencies,
  createAgency,
  getAgencyById,
  updateAgency,
};

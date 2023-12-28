const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Pincode } = require('../models');
const { removeDuplicates } = require('../utils/helpers');

/**
 *
 * @param {*} pincode
 * @returns  {*} fetch all pincodes in an array
 */
const queryLocationPincodes = async (pincode) => {
  const result = await Pincode.aggregate([
    {
      $redact: {
        $cond: [
          {
            $regexMatch: {
              input: { $toString: '$pincode' },
              regex: `^${pincode}`,
            },
          },
          '$$KEEP',
          '$$PRUNE',
        ],
      },
    },
    {
      $group: { _id: '$pincode', districts: { $addToSet: '$districtName' }, states: { $addToSet: '$stateName' } },
    },
    { $project: { _id: 0, pincode: '$_id', districts: 1, states:1 } },
    { $limit: 20 }
  ]);

  return result;
};

/**
 * Query to check city district and state values related to pincode
 * @param {*} pincode 
 * @param {*} district 
 * @param {*} state 
 * @returns 
 */
 const checkLocationPincode = async (pincode, district, state) => {
    if (!pincode) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide pincode');
    }
  
    if (!district) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'District is mandatory with pincode',
      );
    }
  
    if (!state) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'State is mandatory with pincode',
      );
    }
  
    const pincodes = await Pincode.find({ pincode: parseInt(pincode) });
    const uniquePincode = removeDuplicates(pincodes, 'districtName');
  
    var districts = [];
    var states = [];
    uniquePincode.forEach((element) => {
      districts.push(element.districtName);
      states.push(element.stateName);
    });
  
    if (!districts.includes(district)) {
      throw new ApiError(400, 'District is not associated with pincode');
    }
  
    if (!states.includes(state)) {
      throw new ApiError(400, 'State is not associated with pincode');
    }
  
    return true;
  };

module.exports = {
  queryLocationPincodes,
  checkLocationPincode
};

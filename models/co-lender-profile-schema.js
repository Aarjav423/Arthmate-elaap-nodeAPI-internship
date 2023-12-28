const { Decimal128 } = require('mongodb');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var productTypeSchema = mongoose.Schema(
  {
    product_type_code: {
      type: String,
      allowNull: true,
    },
    product_type_name: {
      type: String,
      allowNull: true,
    },
    product_pricing: {
      type: Decimal128,
      allowNull: true,
    },
    total_allocated_limit: {
      type: Decimal128,
      allowNull: true,
    },
    net_available_limit: {
      type: Decimal128,
      allowNull: true,
    },
  },
  { _id: false },
);
var ColenderProfileSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    co_lender_id: {
      type: Number,
      allowNull: true,
      unique: true,
    },
    co_lender_shortcode: {
      type: String,
      allowNull: true,
      unique: true,
    },
    product_types: {
      type: [productTypeSchema],
      allowNull: true,
    },
    escrow_account_number: {
      type: String,
      allowNull: true,
    },
    escrow_account_beneficiary_name: {
      type: String,
      allowNull: true,
    },
    escrow_account_ifsc_code: {
      type: String,
      allowNull: true,
    },
    escrow_repayment_account_number: {
      type: String,
      allowNull: true,
    },
    escrow_repayment_account_ifsc_code: {
      type: String,
      allowNull: true,
    },
    co_lender_name: {
      type: String,
      allowNull: true,
    },
    status: {
      type: Number,
      allowNull: true,
    },
    is_rps_by_co_lender: {
      type: String,
      allowNull: true,
    },
    product_type: {
      type: String,
      allowNull: true,
    },
    product_pricing: {
      type: Number,
      allowNull: true,
    },
    co_lending_share: {
      type: Number,
      allowNull: true,
    },
    foreclosure_share: {
      type: Number,
      allowNull: true,
    },
    lpi_share: {
      type: Number,
      allowNull: true,
    },
    co_lending_mode: {
      type: String,
      allowNull: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);
var ColenderProfile = (module.exports = mongoose.model(
  'co_lender_profile',
  ColenderProfileSchema,
));

module.exports.findColenderProfileDetails = (co_lender_id) => {
  return ColenderProfile.find({
    co_lender_id: co_lender_id,
  })
    .sort({ _id: -1 })
    .limit(1);
};

module.exports.updateNetAvailableLimt = (
  net_available_limit,
  co_lender_id,
  product_type_code,
) => {
  return ColenderProfile.findOneAndUpdate(
    {
      co_lender_id: co_lender_id,
      'product_types.product_type_code': product_type_code,
    },
    { $set: { 'product_types.$.net_available_limit': net_available_limit } },
  );
};

module.exports.findColenderName = (shortCode) => {
  return ColenderProfile.findOne({
    co_lender_shortcode: shortCode,
  });
};

module.exports.findByColenderId = (colenderId) => {
  return ColenderProfile.findOne({
    co_lender_id: colenderId,
  });
};

module.exports.getAll = () => {
  return ColenderProfile.find({});
};

module.exports.findById = (id) => {
  return ColenderProfile.findOne({
    _id: id,
  });
};

module.exports.addOne = async (profile) => {
  return new ColenderProfile(profile).save();
};

module.exports.updateOne = (userIdValue, userDataVal) => {
  return ColenderProfile.findOneAndUpdate(
    {
      co_lender_id: userIdValue,
    },
    {
      $set: {
        co_lender_id: userDataVal.co_lender_id,
        co_lender_name: userDataVal.co_lender_name,
        co_lender_shortcode: userDataVal.co_lender_shortcode,
        co_lending_share: userDataVal.co_lending_share,
        co_lending_mode: userDataVal.co_lending_mode,
        is_rps_by_co_lender: userDataVal.is_rps_by_co_lender,
        status: userDataVal.status,
        escrow_account_number: userDataVal.escrow_account_number,
        escrow_account_beneficiary_name:
          userDataVal.escrow_account_beneficiary_name,
        escrow_account_ifsc_code: userDataVal.escrow_account_ifsc_code,
        escrow_repayment_account_number:
          userDataVal.escrow_repayment_account_number,
        escrow_repayment_account_ifsc_code:
          userDataVal.escrow_repayment_account_ifsc_code,
        foreclosure_share: userDataVal.foreclosure_share,
        lpi_share: userDataVal.lpi_share,
        product_types: userDataVal.product_types,
      },
    },
  );
};

module.exports.updateProfileDetails = (userIdValue, userDataVal) => {
  return ColenderProfile.findOneAndUpdate(
    {
      co_lender_id: userIdValue,
    },
    {
      $set: {
        ...userDataVal,
      },
    },
  );
};

module.exports.getNextColenderId = () => {
  return ColenderProfile.findOne()
    .sort({ co_lender_id: -1 })
    .limit(1)
    .then((co_lender) => {
      if (co_lender != null) {
        return {
          co_lender_id: co_lender.co_lender_id + 1,
        };
      } else {
        return {
          co_lender_id: 1,
        };
      }
    });
};

module.exports.findByShortCode = (shortCode) => {
  return ColenderProfile.findOne({ co_lender_shortcode: shortCode });
};

module.exports.findColendersByIds = (ids) => {
  return ColenderProfile.find({
    co_lender_id: { $in: ids },
  });
};

module.exports.updateP2PNetInvestableAmount = (
  net_available_limit,
  p2pCoLenderId,
) => {
  let query = { co_lender_id: p2pCoLenderId };
  let update = {
    $set: {
      'product_types.0.net_available_limit': net_available_limit,
      'product_types.0.total_allocated_limit': net_available_limit,
    },
  };
  return ColenderProfile.findOneAndUpdate(query, update);
};

module.exports.findByCoLenderIdAndShortCode = (co_lender_id,co_lender_shortcode) => {
  return ColenderProfile.findOne({
    co_lender_id : co_lender_id, 
    co_lender_shortcode : co_lender_shortcode
  }, 
  {
    co_lender_id : 1,
    co_lender_shortcode : 1, 
    status : 1
  })
}
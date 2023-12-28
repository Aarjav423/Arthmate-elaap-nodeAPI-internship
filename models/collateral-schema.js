var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const CollateralSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: Number,
    allowNull: false,
  },
  product_id: {
    type: Number,
    allowNull: false,
  },
  company_name: {
    type: String,
    allowNull: false,
  },
  product_name: {
    type: String,
    allowNull: false,
  },
  loan_id: {
    type: String,
    allowNull: false,
    unique: true,
  },
  invoice_number: {
    type: String,
    allowNull: true,
  },
  invoice_date: {
    type: Date,
    allowNull: true,
  },
  invoice_amount: {
    type: Number,
    allowNull: true,
  },
  engine_number: {
    type: String,
    allowNull: true,
    unique: true,
  },
  chassis_number: {
    type: String,
    allowNull: true,
    unique: true,
  },
  insurance_partner_name: {
    type: String,
    allowNull: true,
  },
  policy_number: {
    type: String,
    allowNull: true,
  },
  policy_issuance_date: {
    type: Date,
    allowNull: true,
  },
  policy_expiry_date: {
    type: Date,
    allowNull: true,
  },
  vehicle_registration_number: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_by: {
    type: String,
    allowNull: true,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  vehicle_brand: {
    type: String,
    allowNull: true,
  },
  vehicle_model: {
    type: String,
    allowNull: true,
  },
  vehicle_sub_model: {
    type: String,
    allowNull: true,
  },
  vehicle_type: {
    type: String,
    allowNull: true,
  },
  on_road_price: {
    type: Number,
    allowNull: true,
  },
  battery_serial_number:{
    type: String,
    allowNull: true,
  }
});

autoIncrement.initialize(mongoose.connection);
CollateralSchema.plugin(autoIncrement.plugin, 'id');
var Collateral = (module.exports = mongoose.model(
  'collateral',
  CollateralSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new Collateral(data);
  return insertdata.save();
};

module.exports.getRecordById = (_id) => {
  return Collateral.findOne({ _id });
};

module.exports.checkIfExists = (
  loan_id,
  engine_number,
  chassis_number,
  policy_number,
  vehicle_registration_number,
) => {
  const query = {
    $or: [
      {
        loan_id,
      },
      {
        engine_number,
      },
      {
        chassis_number,
      },
    ],
  };
  return Collateral.findOne(query);
};

module.exports.getFilteredCollateralRecords = async (filter) => {
  return filterAggregate(filter);
};

module.exports.updateRecordById = (data, _id) => {
  return Collateral.findOneAndUpdate(
    {
      _id,
    },
    data,
    { new: true },
  );
};

const handleCreateFilterQuery = (data) => {
  const { company_id, product_id, from_date, to_date, str } = data;
  let obj = {};
  if (company_id) {
    obj = {
      ...obj,
      company_id: company_id,
    };
  }
  if (product_id) {
    obj = {
      ...obj,
      product_id: product_id,
    };
  }
  if (from_date && to_date) {
    let fromDate = new Date(from_date);
    fromDate.setHours(0, 0, 0, 0);
    let toDate = new Date(to_date);
    toDate.setHours(23, 59, 59, 999);
    obj = {
      ...obj,
      created_at: {
        $gte: fromDate,
        $lte: toDate,
      },
    };
  }
  if (data.str) {
    obj = {
      ...obj,
      $or: [
        {
          loan_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          partner_loan_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          borrower_id: {
            $regex: str,
            $options: 'i',
          },
        },
      ],
    };
  }
  return obj;
};

const filterAggregate = async (filter) => {
  const count = await Collateral.aggregate([
    {
      $match: handleCreateFilterQuery(filter),
    },
  ]);

  const result = await Collateral.aggregate([
    {
      $match: handleCreateFilterQuery(filter),
    },
  ])
    .sort({ created_at: -1 })
    .skip(filter.page * filter.limit)
    .limit(filter.limit);

  return { rows: result, count: count?.length ?? 0 };
};

module.exports.findOneWithKLID = (loan_id) => {
  let query = {
    loan_id: loan_id,
  };
  return Collateral.findOne(query);
};

module.exports.updateBI = (biData, loanId) => {
  let query = {
    loan_id: loanId,
  };
  return Collateral.findOneAndUpdate(query, biData, { new: true });
};

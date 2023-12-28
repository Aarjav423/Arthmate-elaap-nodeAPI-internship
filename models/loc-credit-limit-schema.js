var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LOCCreditlimitSchema = mongoose.Schema({
  id: {
    type: Number,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  book_entity_id: {
    type: Number,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  borrower_id: {
    type: String,
    allowNull: true,
  },
  partner_loan_id: {
    type: String,
    allowNull: true,
  },
  partner_borrower_id: {
    type: String,
    allowNull: true,
  },
  limit_amount: {
    type: String,
    allowNull: true,
  },
  available_balance: {
    type: Number,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  company_name: {
    type: String,
    allowNull: true,
  },
  product_name: {
    type: String,
    allowNull: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    allowNull: false,
  },
  updated_at: {
    type: Date,
    default: Date.now,
    allowNull: false,
  },
});

autoIncrement.initialize(mongoose.connection);
LOCCreditlimitSchema.plugin(autoIncrement.plugin, 'id');
var LOCCreditlimit = (module.exports = mongoose.model(
  'loc_credit_limit',
  LOCCreditlimitSchema,
));

module.exports.addNew = (creditlimitdata) => {
  return LOCCreditlimit.create(creditlimitdata);
};

module.exports.checkCreditLimit = (loan_id) => {
  return LOCCreditlimit.findOne({
    loan_id: loan_id,
  });
};

module.exports.checkMultipleCreditLimit = (ids) => {
  if (ids.length === 1) {
    return LOCCreditlimit.find({
      loan_id: ids[0],
    }).select('loan_id limit_amount');
  } else {
    return LOCCreditlimit.find({
      loan_id: {
        $in: ids,
      },
    }).select('loan_id limit_amount');
  }
};

//bulk insert
module.exports.addInBulk = (creditLimitData) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    creditLimitData.forEach((record) => {
      LOCCreditlimit.create(record)
        .then((response) => {
          counter++;
          if (counter >= creditLimitData.length);
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.findByFilter = async (data, paginate) => {
  try {
    const response = await LOCCreditlimit.find(data)
      .skip(paginate.offset)
      .limit(paginate.limit);
    let count = response.length;
    return {
      count: count,
      rows: response,
    };
  } catch (error) {
    return error;
  }
};

module.exports.updateCreditLimit = (klnid, limit_amount) => {
  return LOCCreditlimit.findOneAndUpdate(
    {
      loan_id: klnid,
    },
    {
      limit_amount: limit_amount,
    },
    {},
  );
};

module.exports.getCredtLimitData = async (data) => {
  const { page, limit } = data;
  const response = await LOCCreditlimit.find(data)
    .skip(page * limit)
    .limit(limit);
  const count = await LOCCreditlimit.count(data);
  const RespData = {
    creditLimitList: response,
    count,
  };
  if (!response) return false;
  return RespData;
};

module.exports.checkCreditLimitWithCompanyId = (condition, callback) => {
  return LOCCreditlimit.find(condition);
};

module.exports.updateAvailableLimit = (loan_id, available_balance) => {
  return LOCCreditlimit.findOneAndUpdate(
    {
      loan_id,
    },
    {
      available_balance,
    },
    {},
  );
};

module.exports.updateCreditLimitData = (loan_id, data) => {
  return LOCCreditlimit.findOneAndUpdate(
    {
      loan_id,
    },
    data,
    {},
  );
};

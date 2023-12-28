var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const CreditlimitSchema = mongoose.Schema({
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
CreditlimitSchema.plugin(autoIncrement.plugin, 'id');
var Creditlimit = (module.exports = mongoose.model(
  'credit_limit_create',
  CreditlimitSchema,
));

module.exports.addNew = (creditlimitdata) => {
  return Creditlimit.create(creditlimitdata);
};

module.exports.checkCreditLimit = (loan_id) => {
  return Creditlimit.findOne({
    loan_id: loan_id,
  });
};

module.exports.checkMultipleCreditLimit = (ids) => {
  if (ids.length === 1) {
    return Creditlimit.find({
      loan_id: ids[0],
    }).select('loan_id limit_amount');
  } else {
    return Creditlimit.find({
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
      Creditlimit.create(record)
        .then((response) => {
          counter++;
          if (counter >= creditLimitData.length);
          resolve(response);
        })
        .catch((err) => {
          return err;
          reject();
        });
    });
  });
  return myPromise;
};

module.exports.findByFilter = async (data, paginate) => {
  try {
    const response = await Creditlimit.find(data)
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
  return Creditlimit.findOneAndUpdate(
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
  const response = await Creditlimit.find(data)
    .skip(page * limit)
    .limit(limit);
  const count = await Creditlimit.count(data);
  const RespData = {
    creditLimitList: response,
    count,
  };
  if (!response) return false;
  return RespData;
};

module.exports.checkCreditLimitWithCompanyId = (condition, callback) => {
  return Creditlimit.find(condition);
};

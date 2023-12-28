var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const NachPresentmentSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  product_id: {
    type: String,
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
  },
  trxn_batch_number: {
    type: String,
    allowNull: false,
  },
  mandate_ref_number: {
    type: String,
    allowNull: false,
  },
  cust_name: {
    type: String,
    allowNull: false,
  },
  due_amount: {
    type: Number,
    allowNull: false,
  },
  emi_amount: {
    type: Number,
    allowNull: false,
  },
  due_date: {
    type: Date,
    allowNull: false,
  },
  due_day: {
    type: Number,
    allowNull: false,
  },
  emi_number: {
    type: Number,
    allowNull: true,
  },
  repay_schedule_id: {
    type: Number,
    allowNull: true,
  },
  nach_transaction_id: {
    type: String,
    allowNull: true,
  },
  presentation_status_code: {
    type: String,
    allowNull: true,
  },
  nach_status_description: {
    type: String,
    allowNull: true,
  },
  nach_transaction_ref_no: {
    type: String,
    allowNull: true,
  },

  //Newly added fields
  repayment_transaction_status: {
    trxn_batch_number: {
      type: String,
      allowNull: true,
    },
    nach_transaction_ref_no: {
      type: String,
      allowNull: true,
    },
    trxn_batch_number: {
      type: String,
      allowNull: true,
    },
    mandate_ref_no: {
      type: String,
      allowNull: true,
    },
    due_amount: {
      type: Number,
      allowNull: true,
    },
    nach_udr_no: {
      type: String,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    due_day: {
      type: Number,
      allowNull: true,
    },
    due_date: {
      type: Date,
      allowNull: true,
    },
    presentation_status_code: {
      type: String,
      allowNull: true,
      enum: ['O', 'M', 'N', 'I', 'V', 'B', 'P', 'L', 'C'],
    },
    nach_status_description: {
      type: String,
      allowNull: true,
    },
    reject_code: {
      type: String,
      allowNull: true,
    },
    reject_code_description: {
      type: String,
      allowNull: true,
    },
    nach_settlement_date: {
      type: Date,
      allowNull: true,
    },
    rbi_ecs_no: {
      type: String,
      allowNull: true,
    },
    remit_mode: {
      type: String,
      allowNull: true,
      enum: ['NEFT', 'FT'],
    },
    rem_ref_no: {
      type: String,
      allowNull: true,
    },
  },
  req_s3_url: {
    type: String,
    allowNull: true,
  },
  res_s3_url: {
    type: String,
    allowNull: true,
  },
  created_by: {
    type: String,
  },
  updated_by: {
    type: String,
  },
  created_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: true,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
NachPresentmentSchema.plugin(autoIncrement.plugin, 'id');
var NachPresentment = (module.exports = mongoose.model(
  'nach_presentment',
  NachPresentmentSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new NachPresentment(data);
  return insertdata.save();
};

module.exports.findByLId = (ids) => {
  return NachPresentment.find({
    loan_id:
      ids.length == 1
        ? ids[0]
        : {
            $in: ids,
          },
  });
};

//bulk insert
module.exports.addInBulk = (data) => {
  let counter = 0;
  let responseArray = [];
  const myPromise = new Promise((resolve, reject) => {
    data.forEach((record) => {
      NachPresentment.create(record)
        .then((response) => {
          counter++;
          responseArray.push(response);
          if (counter >= data.length);
          resolve(responseArray);
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.updateByCondition = (query, data) => {
  return NachPresentment.findOneAndUpdate(query, data, { new: true });
};

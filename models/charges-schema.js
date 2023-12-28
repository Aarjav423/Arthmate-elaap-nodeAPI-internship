var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const ChargesSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      primaryKey: true,
      autoIncrement: true,
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
    usage_id: {
      type: Number,
      allowNull: false,
    },
    loan_id: {
      type: String,
      allowNull: false,
    },
    charge_type: {
      type: String,
      allowNull: true,
      enum: [
        'Bounce Charge',
        'Processing Fees',
        'Convenience Fees',
        'Usage Fees',
        'Insurance Amount',
        'Application Fees',
        'Foreclosure Charges',
        'Breaking Charges',
        'Subvention Fees',
      ],
    },
    charge_id: {
      type: Number,
      allowNull: true,
    },
    gst: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    cgst: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    sgst: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    igst: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    charge_amount: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    charge_application_date: {
      type: Date,
      allowNull: true,
    },
    waived_date: {
      type: Date,
      allowNull: true,
    },
    amount_paid: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    paid_date: {
      type: Date,
      allowNull: true,
    },

    waiver: [
      {
        sr_req_id: {
          type: String,
          allowNull: true,
        },
        utr: {
          type: String,
          allowNull: true,
        },
        amount_waived: {
          type: Number,
          allowNull: true,
        },
        gst_reversed: {
          type: Number,
          allowNull: true,
        },
        waiver_date: {
          type: Date,
          allowNull: true,
        },
        is_waiver: {
          type: String,
          allowNull: true,
          enum: ['Y', ''],
        },
      },
    ],
    payment: [
      {
        utr: {
          type: String,
          allowNull: true,
        },
        amount_paid: {
          type: Number,
          allowNull: true,
        },
        gst_paid: {
          type: Number,
          allowNull: true,
        },
        utr_date: {
          type: Date,
          allowNull: true,
        },
      },
    ],
    total_amount_waived: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    total_amount_paid: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    total_gst_reversed: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    total_gst_paid: {
      type: Number,
      default: 0,
      allowNull: true,
    },
    remaining_amount: {
      type: Number,
      allowNull: true,
    },
    is_processed: {
      type: String,
      allowNull: true,
      enum: ['Y', ''],
    },
    created_by: {
      type: String,
      allowNull: true,
    },
    updated_by: {
      type: String,
      allowNull: true,
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
ChargesSchema.plugin(autoIncrement.plugin, 'id');
var charges = (module.exports = mongoose.model('charges', ChargesSchema));

module.exports.addNew = async (data) => {
  try {
    const insertdata = new charges(data);
    return insertdata.save();
  } catch (error) {}
};

//bulk insert
module.exports.addMultipleRecords = (data) => {
  let counter = 0;
  let responseArray = [];
  const myPromise = new Promise((resolve, reject) => {
    data.forEach((record) => {
      charges
        .create(record)
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

module.exports.findAllChargeWithKlid = (loan_id) => {
  return charges.find({
    loan_id: loan_id,
  });
};
module.exports.findAllChargeByTypes = (loan_id, types,usage_id) => {
  const query = {
    $and: [
      {
        loan_id: loan_id,
      },
      {
        charge_type: {
          $in: types,
        },
      },
      {
        $or: [
          { is_processed: 'null' },
          { is_processed: null },
          { is_processed: '' },
        ],
      },
    ],
  };
  // If usageId is provided, add it to the query condition
  if (usage_id) {
    query.$and.push({ usage_id: usage_id });
  }
  return charges.find(query);
};

module.exports.findAllChargeByLIDPF = (loan_id, type) => {
  const query = {
    loan_id: loan_id,
    charge_type: type,
  };
  return charges.find(query);
};

module.exports.updateByIdBulk = (data) => {
  let counter = 0;
  let responseArray = [];
  const myPromise = new Promise((resolve, reject) => {
    data.forEach((record) => {
      const query = {
        $and: [
          {
            charge_id: record.charge_id,
          },
          {
            loan_id: record.loan_id,
          },
        ],
      };

      // If usageId is provided, add it to the query condition
      if (record.usage_id) {
        query.$and.push({ usage_id: record.usage_id });
      }
      charges
      .findOneAndUpdate(query, record, { new: true })
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

module.exports.findAllRearEndedCharges = (loan_id, chargeIds) => {
  const query = {
    $and: [
      {
        loan_id: loan_id,
      },
      {
        charge_id: {
          $in: chargeIds,
        },
      },
    ],
  };
  return charges.find(query);
};

module.exports.findbyCondition = (data) => {
  return charges.find(data);
};
module.exports.findAllChargeByCondition = (loan_id, charge_id, statuses) => {
  const query = {
    $and: [
      {
        loan_id,
        charge_id,
        is_processed: { $in: statuses },
      },
    ],
  };
  return charges.find(query);
};

module.exports.findAllCharge = (loan_id, charge_id) => {
  const query = {
    $and: [
      {
        loan_id,
        charge_id,
      },
    ],
  };
  return charges.find(query);
};

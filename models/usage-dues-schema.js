var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const UsageDueSchema = mongoose.Schema({
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
    allowNull: false,
  },
  loan_app_id: {
    type: String,
    allowNull: false,
  },
  partner_loan_id: {
    type: String,
    allowNull: false,
  },
  usage_id: {
    type: String,
    allowNull: false,
  },
  company_id: {
    type: String,
    allowNull: true,
  },
  product_id: {
    type: String,
    allowNull: true,
  },
  d_txn_id: {
    type: String,
    allowNull: true,
  },
  d_principal_amount: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_processing_fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_usage_fee: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_subvention_fees: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_int_value: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_exclude_interest_till_grace_period: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_upfront_interest: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_tenure_in_days: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_grace_period: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_interest_free_days: {
    type: String,
    allowNull: false,
    default: 0,
  },
  d_due_date: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_txn_date: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_overdue_charges_per_day: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_overdue_days: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_penal_interest: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_penal_interest_days: {
    type: String,
    allowNull: false,
    default: '',
  },
  d_status: {
    type: Number,
    allowNull: false,
    default: '',
  },
  created_at: {
    type: Date,
    allowNull: false,
    defaultValue: Date.NOW,
  },
});

autoIncrement.initialize(mongoose.connection);
UsageDueSchema.plugin(autoIncrement.plugin, 'id');
var UsageDue = (module.exports = mongoose.model('usage_due', UsageDueSchema));

module.exports.addNew = (due, callback) => {
  var dueAdd = new UsageDue(due);
  dueAdd.save(callback);
  //   UsageDue.create(due).then((response) => {
  //       callback(null, response)
  //   }).catch((err) => {
  //       if (err) {
  //           callback(err, null)
  //       }
  //   })
};

//bulk insert
module.exports.addInBulk = (dues, callback) => {
  UsageDue.insertMany(dues, callback);
  //   UsageDue.bulkCreate(dues).then((response) => {
  //       callback(null, response)
  //   }).catch((err) => {
  //       if (err) {
  //           callback(err, null)
  //       }
  //   })
};

module.exports.getAll = (callback) => {
  UsageDue.find(callback);
  // UsageDue.findAll({}).then((response) => {
  //     callback(null, response)
  // }).catch((err) => {
  //     callback(err, null)
  // })
};

module.exports.findOneWithId = (access_log_id, callback) => {
  UsageDue.findOne(
    {
      _id: access_log_id,
    },
    callback,
  );
  // UsageDue.findOne({ where: { id: access_log_id } }).then((response) => {
  //     if (response === null) {
  //         callback(null, true)
  //     } else {
  //         callback(null, response);
  //     }
  // }).catch((err) => {
  //     if (err) {
  //         callback(err, null)
  //     }
  // })
};

module.exports.findByUsageId = (usage_id, callback) => {
  UsageDue.find(usage_id, callback);
  //   UsageDue.findAll({ where:usage_id }).then((response) => {
  //     if (!response) return callback(null, true)
  //     callback(null, response);
  //   }).catch((err) => {
  //     callback(err, null)
  //   })
};

module.exports.findMultipleWithKLID = (usage_ids, callback) => {
  UsageDue.find(
    {
      usage_id: {
        $in: usage_ids,
      },
    },
    callback,
  );
  // UsageDue.findAll({
  //     where: {
  //         usage_id: usage_ids.length == 1 ? usage_ids[0] : {
  //             [Op.in]: usage_ids
  //         }
  //     }
  //   })
  //   .then((response) => {
  //     if (!response) return callback(null, true)
  //     callback(null, response);
  //     })
  //     .catch(err => callback(err, null))
  //   }
};

module.exports.updateOne = (id, data, callback) => {
  const query = {
    _id: id,
  };
  UsageDue.findOneAndUpdate(
    query,
    {
      data,
    },
    {},
    callback,
  );
  // UsageDue.update({ data }, { where: { id: id } }).then((response) => {
  //   if (response === null) {
  //       callback(null, true)
  //   } else {
  //       callback(null, response);
  //   }
  // }).catch((err) => {
  //     callback(err, null)
  // })
};

module.exports.deleteWithId = (whereData, callback) => {
  UsageDue.deleteOne(whereData, callback);
  //   UsageDue.destroy({ where: whereData }).then((response) => {
  //     if (!response) return callback(null, true)
  //     callback(null, response);
  //   }).catch((err) => {
  //     if (err) {
  //       callback(err, null)
  //     }
  //   })
};

module.exports.deleteAllUsageByKLIORPID = (product_id, loan_id, callback) => {
  if (!product_id && !loan_id)
    callback(
      {
        message: 'please provide product_id or loan_id',
      },
      false,
    );
  let whereData = [];
  if (product_id) {
    whereData.push({
      product_id: product_id,
    });
  } else {
    if (loan_id)
      whereData.push({
        loan_id: loan_id,
      });
  }
  UsageDue.deleteOne(whereData, callback);
  //   UsageDue.destroy({where: whereData}).then((response) => {
  //     if (!response) return callback(null, true)
  //     callback(null, response);
  //   }).catch((err) => {
  //     if (err) {
  //       callback(err, null)
  //     }
  //   })
};

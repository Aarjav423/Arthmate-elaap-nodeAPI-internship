var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const CLInoviceSchema = mongoose.Schema({
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
  from_date: {
    type: String,
    allowNull: true,
  },
  to_date: {
    type: String,
    allowNull: true,
  },
  invoice_no: {
    type: String,
    allowNull: true,
  },
  total_amount: {
    type: String,
    allowNull: true,
  },
  total_interest_amt: {
    type: String,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  company_id: {
    type: String,
    allowNull: false,
  },
  product_id: {
    type: String,
    allowNull: false,
  },
  pay_date: {
    type: String,
    allowNull: false,
    defaultValue: '',
  },
  created_at: {
    type: Date,
    allowNull: false,
    defaultValue: Date.now,
  },
});
autoIncrement.initialize(mongoose.connection);
CLInoviceSchema.plugin(autoIncrement.plugin, 'id');
var CLInovice = (module.exports = mongoose.model(
  'cl_inovice',
  CLInoviceSchema,
));

module.exports.addNew = (data, callback) => {
  var insertdata = new CLInovice(data);
  insertdata.save(callback);
  /*
  CLInovice.create(data).then((response) => {
    callback(null, response)
  }).catch((err) => {
    callback(err, null)
  })*/
};

module.exports.addInBulk = (data, callback) => {
  CLInovice.insertMany(data)
    .then((result) => {
      callback(null, result);
    })
    .catch((err) => {
      callback(err, null);
    });
  /*
  CLInovice.bulkCreate(data).then((response) => {
    callback(null, response)
  }).catch((err) => {
    callback(err, null)
  })*/
};

module.exports.updateData = (data, callback) => {
  let query = {
    loan_id: loan_id,
    borrower_id: borrower_id,
  };
  CLInovice.findOneAndUpdate(query, data, {}, callback);
  /*
  CLInovice.update(data, {
    where: {
      loan_id,
      borrower_id
    }
  }).then((response) => {
    callback(null, response)
  }).catch((err) => {
    callback(err, null)
  });*/
};

module.exports.updatePartnerNotificationFlag = (data, utr_num, callback) => {
  let query = {
    utr_num: utr_num,
  };
  CLInovice.findOneAndUpdate(query, data, {}, callback);
  /*
  CLInovice.update(data, {where: {
      utr_num
    }}).then((response) => {
    callback(null, response)
  }).catch((err) => {
    callback(err, null)
  });*/
};

module.exports.findAllInvoiceWithKlid = (loan_id, status) => {
  let query = {
    loan_id: loan_id,
    status: status,
  };
  return CLInovice.find(query).select('loan_id total_amount');
};

module.exports.findAllWithTxnDate = (loan_ids) => {
  let query = {
    loan_id:
      loan_ids.length == 1
        ? loan_ids[0]
        : {
            $in: loan_ids,
          },
  };
  return CLInovice.find(query);
};

module.exports.delWithKldDateCompany = (condition, callback) => {
  let query = {
    from_date: condition.from_date,
    to_date: condition.to_date,
    loan_id: condition.loan_id,
    company_id: condition.company_id,
  };
  CLInovice.deleteOne(query, callback);
  /*
  CLInovice.destroy({
    where: [
      sequelize.where(sequelize.col('from_date'), '=', condition.from_date),
      sequelize.where(sequelize.col('to_date'), '=', condition.to_date),
      sequelize.where(sequelize.col('loan_id'), '=', condition.loan_id),
      sequelize.where(sequelize.col('company_id'), '=', condition.company_id)
    ]
  }).then((response) => {
    callback(null, response);
  }).catch((error) => {
    if (error) {
      callback(error, null)
    }
  })*/
};

module.exports.updateUsingInvoiceNo = (
  invoice_no,
  status,
  pay_date,
  callback,
) => {
  let data = {
    status: status,
    pay_date: pay_date,
  };
  BorrowerinfoCommon.findOneAndUpdate(
    {
      invoice_no: invoice_no,
    },
    data,
  )
    .then((result) => callback(null, result))
    .catch((error) => callback(error, null));
  /*
  CLInovice.update({
    status: status,
    pay_date: pay_date
  }, {
    where: {
      invoice_no: invoice_no
    }
  }).then((result) => callback(null, result)).catch((error) => callback(error, null))*/
};

module.exports.getWithKldDateCompany = (condition, callback) => {
  let query = {
    from_date: condition.from_date,
    to_date: condition.to_date,
    loan_id: {
      $in: loan_ids,
    },
  };
  CLInovice.findOne(query, function (err, result) {
    if (err) callback(err, null);
    callback(null, result);
  });
  /*
  CLInovice.findOne({
    where: {
      from_date: condition.from_date,
      to_date: condition.to_date,
      loan_id: {
        [Op. in]: condition.loan_id
      }
    }
  }).then((response) => {
    callback(null, response);
  }).catch((error) => {
    if (error) {
      callback(error, null)
    }
  })*/
};

module.exports.getAllWithKldDateCompany = (data, callback) => {
  CLInovice.find(data, callback);
  /*
  CLInovice.findAll({where: data}).then((response) => {
    callback(null, response);
  }).catch((error) => {
    if (error) {
      callback(error, null)
    }
  })*/
};

module.exports.getClInvoiceData = (data, page, limit, callback) => {
  CLInovice.find(data)
    .skip((page - 1) * limit)
    .limit(limit)
    .then((response) => {
      CLInovice.find(data)
        .count()
        .then((get) => {
          callback(null, {
            count: get,
            rows: response,
          });
        })
        .catch((err) => {
          if (err) {
            callback(err, null);
          }
        });
    })
    .catch((err) => {
      if (err) {
        callback(err, null);
      }
    });
  /*
  CLInovice.findAndCountAll({
    where: data,
    limit: [
      parseInt(page - 1) * limit,
      parseInt(limit)
    ]
  }).then((response) => {
    callback(null, response);
  }).catch((err) => {
    callback(err, null);
  });*/
};

module.exports.getKliUsingInvoiceNo = (invoice_no, status, callback) => {
  let query = {
    invoice_no: invoice_no,
    status: status,
  };
  CLInovice.find(query).sort(
    {
      created_at: -1,
    },
    callback,
  );
  /*
  CLInovice.findAll({
    limit: 1,
    where: {
      invoice_no: invoice_no,
      status: status
    },
    order: [
      ['created_at', 'DESC']
    ]
  }).then((response) => {
    callback(null, response);
  }).catch((error) => {
    callback(error, null);
  })*/
};

module.exports.findInvoiceNo = (data, callback) => {
  CLInovice.findOne(data, function (err, result) {
    if (err) callback(err, null);
    callback(null, result);
  });
  /*
  CLInovice.findOne({where: data}).then((response) => {
    callback(null, response);
  }).catch((err) => {
    callback(err, null);
  });*/
};

module.exports.updateTotalAmount = (data, callback) => {
  let query = {
    invoice_no: data.invoice_no,
  };
  CLInovice.findOneAndUpdate(
    query,
    {
      total_amount: data.amount,
    },
    {},
    callback,
  );
  /*
  CLInovice.update({
    total_amount: data.amount
  }, {
    where: {
      invoice_no: data.invoice_no
    }
  }).then((response) => {
    callback(null, response);
  }).catch((err) => {
    callback(err, null);
  });*/
};

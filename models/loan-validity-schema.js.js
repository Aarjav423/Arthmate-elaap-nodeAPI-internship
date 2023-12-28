var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const LoanValiditySchema = mongoose.Schema({
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
  valid_from_date: {
    type: String,
    allowNull: false,
  },
  valid_till_date: {
    type: String,
    allowNull: false,
  },
  created_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    allowNull: false,
    default: Date.now,
  },
  company_name: {
    type: String,
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
});
autoIncrement.initialize(mongoose.connection);
LoanValiditySchema.plugin(autoIncrement.plugin, 'id');
var LoanValidity = (module.exports = mongoose.model(
  'loan_validity',
  LoanValiditySchema,
));

module.exports.addNew = (data, callback) => {
  var insertdata = new LoanValidity(data);
  insertdata.save(callback);
  /* LoanValidity.create(data).then((response) => {
      callback(null, response)
  }).catch((err) => {
      if (err) {
          callback(err, null)
      }
  }) */
};
module.exports.findIfExists = (loan_id, callback) => {
  LoanValidity.findOne(
    {
      loan_id: loan_id,
    },
    callback,
  );
  /*  LoanValidity.findOne({ where: { loan_id } }).then((response) => {
       callback(null, response)
   }).catch((err) => {
       if (err) {
           callback(err, null)
       }
   }) */
};
module.exports.updateStatus = (data, loan_id, callback) => {
  const query = {
    loan_id: loan_id,
  };
  LoanValidity.findOneAndUpdate(query, data, {}, callback);
  /* LoanValidity.update(data, { where: { loan_id } }
  ).then((response) => callback(null, response)
  ).catch((err) => callback(err, null)) */
};

module.exports.findKLIByIds = (ids) => {
  let query = {
    loan_id:
      ids.length == 1
        ? ids[0]
        : {
            $in: ids,
          },
  };
  return LoanValidity.find(query);
};

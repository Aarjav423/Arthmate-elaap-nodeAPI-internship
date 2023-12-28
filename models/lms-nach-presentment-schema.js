var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const lmsNachPresentmentSchema = mongoose.Schema({
 _id: {
        type: ObjectId,
        allowNull: true,
        primaryKey: true,
  },
  partner_loan_id:{
    type: String,
    allowNull: true,
  },
  loan_id: {
    type: String,
    allowNull: true,
  },
  loan_app_id:{
    type: String,
    allowNull: true,
  }, 

product_id:{
    type: String,
    allowNull: true,
},

company_id:{
    type: String,
    allowNull: true,
 },
  amount: {
    type: String,
    allowNull: true,
  },
  mandate_id: {
    type: String,
    allowNull: true,
  },
  scheduled_on:{ 
    type: Date,
    allowNull: true,
  },
  status: {
    type: String,
    allowNull: true,
  },
  presentment_txn_id: {
    type: String,
    allowNull: true,
  },
  request_id: {
    type: String,
    allowNull: true,
  },
  
  txn_request_date:{
    type: Date,
    allowNull: true
  },
  txn_status:{
    type: String,
    allowNull: true,
  },

txn_error_msg:{
    type: String,
    allowNull: true,
},

txn_utr_number:{
    type: String,
    allowNull: true,
},

txn_utr_datetime:{
    type: String,
    allowNull: true,
},
reason:{
  type: String,
    allowNull: true
},
    installment_amount:{
      type: String,
        allowNull: true,
    },
    due_amount:{
      type: String,
      allowNull: true,
    },
    customer_name:{
      type: String,
      allowNull: true,  
},
    remarks:{
      type: String,
      allowNull: true,  
    },
},
{
  timestamps:{
    createdAt : "created_at",
    updatedAt:"updated_at",
  }  
});

autoIncrement.initialize(mongoose.connection);
var NachPresentment = (module.exports = mongoose.model(
  'lms_nach_presentments',
  lmsNachPresentmentSchema,
));

module.exports.addNew = (data) => {
  const insertdata = new NachPresentment(data);
  return insertdata.save();
};

module.exports.findByLId = (status,fromRange,toRange) => {
  const startDate = new Date(fromRange);
  const endDate = new Date(toRange);
  startDate.setHours(0,0,0,0);
  endDate.setHours(23, 59, 59, 999);
 
  return NachPresentment
  .find({  
    created_at: {   
        $gte: startDate,   
          $lte: endDate, 
          }, 
          txn_status: status});
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

const nachPresentmentSchema = require('../models/lms-nach-presentment-schema');
const jwt = require('../util/jwt');

module.exports = (app, connection) => {
  app.use(bodyParser.json());
  app.get(
    '/api/emi-data/:company_id/:product_id/:page/:limit/:status/:fromRange/:toRange/:searchBy',
     [jwt.verifyToken],
    async (req, res, next) => {
      try {
        const {
          company_id,
          product_id,
          page,
          limit,
          status,
          fromRange,
          toRange,
          searchBy,
        } = req.params;
        const statusFilter = {
          Success:'S',
          Inprogress:'I',
          Failed:'F'
        };
       
        const nachPresentMentData =
          await nachPresentmentSchema.findByLId(statusFilter[status],fromRange,toRange);
         
         let repaymentInstallmentsObject = [];
         nachPresentMentData.forEach((row) => {
                  let nach = nachPresentMentData.find((nach_presentment) => {
                    if(nach_presentment._id === row._id)
                      return nach_presentment;
                  });
                  repaymentInstallmentsObject.push({
                    TXN_ID: nach?.presentment_txn_id,
                    LOAN_NO: nach.loan_id,
                    DUE_AMOUNT: Number(
                     nach?.due_amount
                    ),
                    INSTALLMENT_AMOUNT: Number(nach?.installment_amount),
                    REASON:  getReason(nach.reason,nach.txn_error_msg,nach.remarks),
                    STATUS:nach.txn_status?nach.txn_status :'NA',
                    CUST_NAME:nach.customer_name?nach.customer_name:'',
                    REFERENCE_ID:nach.request_id?nach.request_id:'',
                    UMRN: nach.mandate_id ? nach.mandate_id : '',
                  });
                
         });
        res.send({
          length: repaymentInstallmentsObject.length,
          repaymentRecords: repaymentInstallmentsObject,
        });

      } catch (error) {
        res.status(400).send(error);
      }
    },
  );
};


const getReason =(reason,txn_error_msg,remarks) =>{
return Array.from([reason,txn_error_msg,remarks]).filter(ele => ele).join(" ")
}
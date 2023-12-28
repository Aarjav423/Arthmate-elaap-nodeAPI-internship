const MongoClient = require("mongodb").MongoClient;

const MONGODB_URI = process.env.DB_URI
let cachedDb = null;

//database caching implementation
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const client = await MongoClient.connect(MONGODB_URI);
  const db = await client.db(process.env.DATABASE_NAME);
  cachedDb = db;
  return db;
}

// Call the connectToDatabase function once during application startup
(async function () {
  cachedDb = await connectToDatabase();
})();

const loanDetail = async (loan_id) => {
  cachedDb = await connectToDatabase();
  return  await cachedDb.collection("loan_states").findOne({ loan_id: loan_id })
}

const insertIntoDb = async (data) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection("repayment_details").insertOne(data);
}

const findTxnInDb = async (txn_reference_id) => {
  cachedDb = await connectToDatabase();
  const filter = { txn_reference_id: txn_reference_id };
  return await cachedDb.collection("repayment_details").findOne(filter);
}


const nextRepaymentDetail = async (loan_id, todayDate, fifthDay) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection('repayment_installments')
    .findOne({ loan_id: loan_id, due_date: { $lte: fifthDay, $gte: todayDate } });
}

const findIfInstallmentsExist = async (loan_id) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection('repayment_installments').findOne({ loan_id: loan_id });
}

const firstDueDate = async (loan_id) => {
  cachedDb = await connectToDatabase();
  return (
    await cachedDb
      .collection('loan_state_audit')
      .find({ loan_id: loan_id, status: 'Due' }).sort({ due_date: +1 }).limit(1)
      .toArray()
  )[0]?.due_date;
}

const prevRepInstallmentDate = async (loan_id, todayDate) => {
  cachedDb = await connectToDatabase();
  return (
    await cachedDb
      .collection('repayment_installments')
      .find({ loan_id: loan_id, due_date: { $lte: todayDate } })
      .sort({ due_date: -1 })
      .limit(1)
      .toArray()
  )[0]?.due_date;
}

const chargeDetail = async (loan_id) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection('charges')
    .findOne({ loan_id: loan_id, charge_id: 1, is_processed: null });
}

const borrowerInfoDetail = async (loan_id,product_array) => {
  cachedDb = await connectToDatabase();
  const pipeline = [
    { $match: { loan_id: loan_id,product_id: { $nin: product_array } } },
    { $project: { _id: 0, partner_loan_id: 1, first_name: 1, last_name: 1, stage: 1} }
  ];
  const borrowerInfoDetails = await cachedDb.collection("borrowerinfo_commons").aggregate(pipeline).toArray();
  return borrowerInfoDetails[0]; 
};

const bbpsLoanDetail = async (biller_txn_reference_id) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection('repayment_details')
    .findOne({ biller_txn_reference_id: biller_txn_reference_id });
}

const loanTransactionDetail = async (loan_id) => {
  cachedDb = await connectToDatabase();
  let txnAmount = 0;
  const loanTransactionDetails = await cachedDb.collection("loan_transaction_ledgers").find({ loan_id: loan_id, label: "repayment", is_received: "Y", processed: null });
  for await (let ele of loanTransactionDetails) {
    txnAmount = txnAmount + ele?.txn_amount
  }
  return txnAmount;
}

const findIfExist = async (txn_id) => {
  cachedDb = await connectToDatabase();
  const txnDetails = await cachedDb.collection("repayment_details").findOne({ biller_txn_reference_id: txn_id });
  return !! txnDetails;
}

const updatePaymentDb = async (txn_id, obj) => {
  cachedDb = await connectToDatabase();
  return await cachedDb.collection('repayment_details')
    .updateOne({ biller_txn_reference_id: txn_id }, { $set: obj });
}

const findLoanIdByUpiRef = async upi_reference => {
  cachedDb = await connectToDatabase();
  return cachedDb.collection("borrowerinfo_commons").findOne({ upi_reference : upi_reference}, 
  {_id : -1, loan_id : 1, partner_loan_id : 1, first_name : 1, last_name : 1})
}


module.exports = {
  loanDetail,
  chargeDetail,
  borrowerInfoDetail,
  loanTransactionDetail,
  bbpsLoanDetail,
  nextRepaymentDetail,
  firstDueDate,
  prevRepInstallmentDate,
  insertIntoDb,
  findIfExist,
  updatePaymentDb,
  findTxnInDb,
  findIfInstallmentsExist,
  findLoanIdByUpiRef
};
const LoanCustomIdSchema = require('../models/loan-custom-id-schema.js');
const Customers = require('../models/customer-schema');

const generateRandomString = (length, chars) => {
  var result = '';
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

const generateSequence = (num, size) => {
  var sequence = num + '';
  while (sequence.length < size) sequence = '0' + sequence;
  return sequence;
};

const generatedLoanId = async (customCode, productLoanKey, data) => {
  try {
    const loanCount = await LoanCustomIdSchema.getCount();
    const sequence = generateSequence(loanCount + 1, 11);
    const recordLoanCustomId = await LoanCustomIdSchema.updateUpsertById(
      sequence,
      {
        loan_custom_id: sequence,
        loan_app_id: data.loan_app_id,
      },
    );

    const loanCustomIdExist = await LoanCustomIdSchema.findByCondition({
      loan_custom_id: sequence,
      loan_app_id: data.loan_app_id,
    });
    if (!loanCustomIdExist) {
      throw {
        errorData: 'Something went wrong, please retry.',
      };
    }
    const loanId = `AML${customCode}${productLoanKey}1${loanCustomIdExist.loan_custom_id}`;
    const upi_handle = `${process.env.UPI_HANDLE_FIXED_HEAD}.1${sequence}${process.env.UPI_HANDLE_FIXED_TAIL}`;
    const upi_reference = `1${sequence}`;

    return {
      loan_id: loanId,
      upi_handle,
      upi_reference,
    };
  } catch (error) {
    return {
      errorData: error,
    };
  }
};

const handleCreateCustomerId = async () => {
  const customerCount = await Customers.getCount();
  const sequence = generateSequence(customerCount + 1, 10);
  return String(sequence);
};

const addCustomerTagAndLoanAppId = async (leads, party_type) => {
    const tasks = leads.map(async (record) => {
    const tagsToAdd = [];

    try {
      if (party_type === "Non Individual" && record.bus_entity_type !== "Proprietorship") {
        if (record.bus_pan) tagsToAdd.push({ pan: record.bus_pan, tag: "borrower" });
        if (record.appl_pan) tagsToAdd.push({ pan: record.appl_pan, tag: "coborrower" });
      } else {
        if (record.appl_pan) tagsToAdd.push({ pan: record.appl_pan, tag: "borrower" });
      }

      if (record.cb1_pan) tagsToAdd.push({ pan: record.cb1_pan, tag: "coborrower" });
      if (record.cb2_pan) tagsToAdd.push({ pan: record.cb2_pan, tag: "coborrower" });
      if (record.cb3_pan) tagsToAdd.push({ pan: record.cb3_pan, tag: "coborrower" });
      if (record.gua1_pan) tagsToAdd.push({ pan: record.gua1_pan, tag: "guarantor" });
      if (record.gua2_pan) tagsToAdd.push({ pan: record.gua2_pan, tag: "guarantor" });

      const addingTags = tagsToAdd.map(async (tagData) => {
        await Customers.AddTagAndLoanAppIdByPan(tagData.pan, tagData.tag, record?.loan_app_id);
      });

      await Promise.all(addingTags);
    } catch (error) {
      return {
      errorData: error,
      };
    }
  });
  await Promise.all(tasks);
};


const createCustomerIfNeeded = async (shouldCreateCustomer, cust_id, pan, first_name, middle_name, last_name, Customers) => {
  if (shouldCreateCustomer) {
    const customerData = {
      cust_id: String(cust_id),
      pan: pan,
      first_name: first_name,
      middle_name: middle_name || "",
      last_name: last_name || "",
    };
    const addCustomer = await Customers.addNew(customerData);
  }
};

const generateCustomerId = async (leads) => {
  var newLeadsArr = [];
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      leads.map(async (record) => {
        const findCustomer = await Customers.findByPan(record?.appl_pan);
        const cust_id = findCustomer.length
          ? findCustomer[0].cust_id
          : await handleCreateCustomerId();
        if (!findCustomer.length) {
          const customerData = {
            cust_id: String(cust_id),
            pan: record?.appl_pan,
            first_name: record.first_name,
            middle_name: record.middle_name,
            last_name: record.last_name,
          };
          const addCustomer = await Customers.addNew(customerData);
        }
        if(record.bus_pan){
          const CustomerExist = await Customers.findByPan(record?.bus_pan);
          const bus_cust_id = CustomerExist.length
            ? CustomerExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!CustomerExist.length,bus_cust_id,record?.bus_pan,record?.bus_name,record?.bus_mname,record?.bus_lname,Customers)
        }
        if(record.cb1_pan){
          const FirstCoBorrowerExist = await Customers.findByPan(record?.cb1_pan);
          const cb1_cust_id = FirstCoBorrowerExist.length
            ? FirstCoBorrowerExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!FirstCoBorrowerExist.length,cb1_cust_id,record?.cb1_pan,record?.cb1_fname,record?.cb1_mname,record?.cb1_lname,Customers)
        }
        if(record.cb2_pan){
          const SecondCoBorrowerExist = await Customers.findByPan(record?.cb2_pan);
          const cb2_cust_id = SecondCoBorrowerExist.length
            ? SecondCoBorrowerExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!SecondCoBorrowerExist.length,cb2_cust_id,record?.cb2_pan,record?.cb2_fname,record?.cb2_mname,record?.cb2_lname,Customers)
        }
        if(record.cb3_pan){
          const ThirdCoBorrowerExist = await Customers.findByPan(record?.cb3_pan);
          const cb3_cust_id = ThirdCoBorrowerExist.length
            ? ThirdCoBorrowerExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!ThirdCoBorrowerExist.length,cb3_cust_id,record?.cb3_pan,record?.cb3_fname,record?.cb3_mname,record?.cb3_lname,Customers)
        }
        if(record.gua1_pan){
          const FirstGuarantorExist = await Customers.findByPan(record?.gua1_pan);
          const gua1_cust_id = FirstGuarantorExist.length
            ? FirstGuarantorExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!FirstGuarantorExist.length,gua1_cust_id,record?.gua1_pan,record?.gua1_fname,record?.gua1_mname,record?.gua1_lname,Customers)
        }
        if(record.gua2_pan){
          const SecondGuarantorExist = await Customers.findByPan(record?.gua2_pan);
          const gua2_cust_id = SecondGuarantorExist.length
            ? SecondGuarantorExist[0].cust_id
            : await handleCreateCustomerId();
          const addCustomer = await createCustomerIfNeeded(!SecondGuarantorExist.length,gua2_cust_id,record?.gua2_pan,record?.gua2_fname,record?.gua2_mname,record?.gua2_lname,Customers)
        }
        record.cust_id = cust_id;
        newLeadsArr.push(record);
        counter++;
        if (counter == leads.length) resolve(newLeadsArr);
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports = {
  generateRandomString,
  generateSequence,
  generatedLoanId,
  generateCustomerId,
  addCustomerTagAndLoanAppId
};

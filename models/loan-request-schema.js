var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');
const lrSchema = require('../maps/lead');
const loanrequestSchema = mongoose.Schema(lrSchema.data, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

autoIncrement.initialize(mongoose.connection);
loanrequestSchema.plugin(autoIncrement.plugin, 'id');
var LoanRequest = (module.exports = mongoose.model(
  'loanrequest',
  loanrequestSchema,
));

module.exports.LoanRequest = LoanRequest

module.exports.addLoanRequest = async (loanrequest) => {
  return await LoanRequest.create(loanrequest);
};

//bulk insert

module.exports.addInBulk = (loanrequestData) => {
  let counter = 0;
  const myPromise = new Promise((resolve, reject) => {
    loanrequestData.forEach((record) => {
      LoanRequest.create(record)
        .then((response) => {
          counter++;
          if (counter >= loanrequestData.length);
          resolve(response);
        })
        .catch((err) => {
          if (err?.errors[Object?.keys(err?.errors)[0]]?.message) {
            return reject({
              message: err?.errors[Object.keys(err?.errors)[0]]?.message,
              success: false,
            });
          }
          reject(err);
        });
    });
  });
  return myPromise;
};

module.exports.findIfExists = (loanid) => {
  return LoanRequest.findOne({
    loan_app_id: loanid,
  });
};

module.exports.findIfExistsLAID = (loan_app_id) => {
  return LoanRequest.findOne({
    loan_app_id,
  });
};

module.exports.findBySingleLoanIds = (loanid) => {
  return LoanRequest.findOne({
    loan_id: loanid,
  });
};

module.exports.findKPartnerLoanId = (companyId, id) => {
  return LoanRequest.findOne({
    company_id: companyId,
    partner_loan_app_id: id,
  });
};

module.exports.findKPartnerLoanIds = (companyId, ids) => {
  if (ids.length === 1) {
    const query = {
      $and: [
        {
          company_id: companyId,
        },
        {
          partner_loan_app_id: ids[0],
        },
        { is_deleted: { $ne: 1 } },
      ],
    };
    return LoanRequest.find(query);
  } else {
    return LoanRequest.find({
      company_id: companyId,
      partner_loan_app_id: {
        $in: ids,
      },
    });
  }
};

module.exports.findExistingKLIByIds = (ids) => {
  return LoanRequest.find({
    loan_app_id:
      ids.length == 1
        ? ids[0]
        : {
            $in: ids,
          },
  });
};

module.exports.findKLIByIdsForVaNum = (ids) => {
  return LoanRequest.find({
    loan_app_id: {
      $in: ids,
    },
  }).select(
    'id',
    'loan_app_id',
    'borrower_id',
    'partner_loan_app_id',
    'partner_borrower_id',
    'va_num',
  );
};

module.exports.findByVANUM = (va_num) => {
  return LoanRequest.findOne({
    va_num: va_num,
  });
};

module.exports.checkloanId = (loanid) => {
  return LoanRequest.findOne({
    loan_app_id: loanid,
  });
};

module.exports.updateData = (data, loan_app_id, borrower_id) => {
  const query = {
    loan_app_id: loan_app_id,
    borrower_id: borrower_id,
  };
  return LoanRequest.findOneAndUpdate(query, data, {});
};

module.exports.updateAadhaarDetails = (data, loan_app_id) => {
  const query = {
    loan_app_id: loan_app_id,
  };
  return LoanRequest.findOneAndUpdate(query, data, {});
};

module.exports.updateVaNum = (data, callback) => {
  let counter = 0;
  data.forEach((row, index) => {
    LoanRequest.findOneAndUpdate(
      {
        _id: row.id,
      },
      {
        va_num: row.va_num,
      },
      {},
    )
      .then((result) => {
        counter++;
        if (counter == data.length) return callback(null, data);
      })
      .catch((error) => {
        return callback(error, null);
      });
  });
};

module.exports.updateBulk = (data) => {
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      data.forEach((row) => {
        let query = {
          partner_loan_app_id: row.partner_loan_app_id,
          partner_borrower_id: row.partner_borrower_id,
        };
        delete row.partner_loan_app_id;
        delete row.partner_borrower_id;
        delete row.loan_app_id;
        delete row.borrower_id;
        LoanRequest.findOneAndUpdate(query, row)
          .then((result) => {
            counter++;
            if (counter == data.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.updateLR = (data) => {
  const query = {
    borrower_id: data.borrower_id,
    loan_app_id: data.loan_app_id,
  };
  return LoanRequest.findOneAndUpdate(query, data, {});
};

module.exports.findByLoanReqId = (loanReqId) => {
  return LoanRequest.findOne({
    _id: loanReqId,
  });
};

module.exports.updateLRByLRid = (data, id) => {
  return LoanRequest.findOneAndUpdate(
    {
      _id: id,
    },
    data,
    {},
  );
};

module.exports.findByData = (data) => {
  return LoanRequest.findOne({
    where: {
      borrower_id: data.borrower_id,
      loan_app_id: data.loan_app_id,
      first_name: {
        [Op.or]: [
          {
            [Op.like]: `%${data.first_name}%`,
          },
          {
            [Op.like]: `%${data.middle_name}%`,
          },
        ],
      },
      middle_name: {
        [Op.or]: [
          {
            [Op.like]: `%${data.middle_name}%`,
          },
          {
            [Op.like]: `%${data.last_name}%`,
          },
        ],
      },
      last_name: {
        [Op.or]: [
          {
            [Op.like]: `%${data.last_name}%`,
          },
          {
            [Op.like]: `%${data.first_name}%`,
          },
          {
            [Op.like]: `%${data.middle_name}%`,
          },
        ],
      },
      dob: data.dob,
      aadhar_card_num: {
        [Op.like]: `%${data.document_id}`,
      },
    },
  });
};

module.exports.findByVaNum = (va_num) => {
  return LoanRequest.findOne({
    va_num: va_num,
  });
};

module.exports.findByKLId = (loan_app_id) => {
  return LoanRequest.find({
    loan_app_id: loan_app_id,
  });
};

module.exports.findByIds = (ids) => {
  if (ids.length == 1) {
    return LoanRequest.findOne({
      loan_app_id: ids[0],
    });
  } else {
    return LoanRequest.find({
      loan_app_id: {
        $in: ids,
      },
    });
  }
};
module.exports.findByLoanIds = (ids) => {
  return LoanRequest.find({
    loan_id: { $in: ids },
  }).select({ loan_id: 1, first_name: 1, last_name: 1, _id: 1, state: 1 });
};

module.exports.findLoanRequestsByCompanyIdAnd = (company_id, params) => {
  return LoanRequest.find({
    ...params,
    company_id: company_id,
  });
};

module.exports.findByProductId = (product_id) => {
  return LoanRequest.find({
    product_id: product_id,
  });
};

module.exports.getAllByFilter = async (filter) => {
  var query = {};
  const {
    company_id,
    product_id,
    from_date,
    to_date,
    page,
    limit,
    str,
    book_entity_id,
    status,
  } = filter;
  if (company_id) {
    query['$and'] = [];
    query['$and'].push({
      company_id,
    });
  }
  if (product_id)
    query['$and'].push({
      product_id,
    });
  if (book_entity_id)
    query['$and'].push({
      book_entity_id,
    });
  if (from_date !== 'null' && from_date !== 'undefined' && from_date !== '') {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      created_at: {
        $gte: date,
      },
    });
  }
  if (to_date !== 'null' && to_date !== 'undefined' && to_date !== '') {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      created_at: {
        $lte: date,
      },
    });
  }
  if (str !== '' && str !== null && str !== 'null' && str !== undefined) {
    //query["$and"].push({ loan_app_id: { $regex: str, $options: "i" } })
    query['$and'].push({
      $or: [
        {
          first_name: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          loan_app_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          appl_pan: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          borrower_id: {
            $regex: str,
            $options: 'i',
          },
        },
      ],
    });
  }
  if (
    status !== '' &&
    status !== null &&
    status !== 'null' &&
    status !== undefined
  ) {
    let statusObj = {
      //  loan_status: status,
      lead_status: status,
    };
    query['$and'].push(statusObj);
  }
  // query["$and"].push({
  //   is_deleted: { $ne: 1 },
  // });
  const ret = await LoanRequest.find(query)
    .skip(page * limit)
    .limit(limit)
    .sort({
      created_at: 'desc',
    });

  const count = await LoanRequest.count(query);
  const retData = {
    rows: ret,
    count,
  };
  if (!ret) return false;
  return retData;
};

module.exports.findByPan = (panNumbers, company_id) => {
  if (panNumbers.length == 1) {
    return LoanRequest.findOne({
      appl_pan: panNumbers[0],
      company_id: company_id,
    });
  } else {
    return LoanRequest.find({
      appl_pan: {
        $in: panNumbers,
      },
      company_id: company_id,
      is_deleted: { $ne: 1 },
    });
  }
};

module.exports.findByKLBId = (loan_app_id, borrower_id) => {
  let query = {
    loan_app_id: loan_app_id,
    borrower_id: borrower_id,
  };
  return LoanRequest.findOne(query);
};

module.exports.updateLoanIdsBulk = (data) => {
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      data.forEach((row) => {
        let query = {
          loan_app_id: row?.loan_app_id,
        };
        LoanRequest.findOneAndUpdate(query, row)
          .then((result) => {
            counter++;
            if (counter == data.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.findByLId = (loan_app_id) => {
  let query = {
    loan_app_id: loan_app_id,
  };
  return LoanRequest.findOne(query);
};

module.exports.findByPartnerLoanId = (partner_loan_app_id) => {
  let query = {
    partner_loan_app_id: partner_loan_app_id,
  };
  return LoanRequest.findOne(query);
};

module.exports.getLeadActivity = () => {
  try {
    return LoanRequest.aggregate([
      {
        $lookup: {
          from: 'loan_activities',
          localField: 'loan_app_id',
          foreignField: 'loan_app_id',
          as: 'status',
        },
      },
    ]);
  } catch (error) {
    return error;
  }
};

module.exports.updateLeadStatus = (loan_app_id, data) => {
  let query = {
    loan_app_id: loan_app_id,
  };
  return LoanRequest.findOneAndUpdate(query, data, {
    new: true,
  });
};

module.exports.updateURCParsedData = (loan_app_id, data) => {
  let query = {
    loan_app_id: loan_app_id,
  };
  return LoanRequest.findOneAndUpdate(query, data, {
    new: true,
  });
};

module.exports.getCount = () => {
  return LoanRequest.find({}).count();
};

module.exports.getByLAIds = (loan_app_id) => {
  return LoanRequest.find({
    loan_app_id: { $in: loan_app_id },
  });
};

module.exports.getDeletedLeadLAIds = (loan_app_id) => {
  return LoanRequest.find({
    loan_app_id: { $in: loan_app_id },
    is_deleted: { $eq: 1 },
  });
};

module.exports.updateStatus = (data, loan_status, status) => {
  const promise = new Promise((resolve, reject) => {
    try {
      let counter = 0;
      data.forEach((row) => {
        let query = {
          loan_app_id: row?.loan_app_id,
        };
        let updateData = {
          loan_status: loan_status,
        };
        if (status) {
          updateData.status = status;
        }
        if (loan_status == 'open' || loan_status == 'batch') {
          updateData.lead_status = 'approved';
        }
        LoanRequest.findOneAndUpdate(query, updateData, {})
          .then((result) => {
            counter++;
            if (counter == data.length) resolve(result);
          })
          .catch((error) => {
            reject(error);
          });
      });
    } catch (error) {
      reject(error);
    }
  });
  return promise;
};

module.exports.findByPanMulti = (panNumbers, company_id) => {
  return LoanRequest.find({
    $or: [
      { appl_pan: { $in: panNumbers } },
      { bus_pan: { $in: panNumbers } },
      {
        coborrower: {
          $elemMatch: {
            cb_pan: { $in: panNumbers },
          },
        },
      },
      { co_app_pan: { $in: panNumbers } },
    ],
    company_id: company_id,
    is_deleted: { $ne: 1 },
  });
};

module.exports.updateByLid = (data, loan_id) => {
  return LoanRequest.findOneAndUpdate({ loan_id }, data);
};

module.exports.updateByLAid = (data, loan_app_id) => {
  return LoanRequest.findOneAndUpdate({ loan_app_id }, data);
};

module.exports.findOneWithLoanId = (loan_id) => {
  let query = {
    loan_app_id: loan_id,
  };
  return LoanRequest.findOne(query);
};

module.exports.updateAadharDetailsByLoanId = (
  loan_id,
  aadhaar_fname,
  aadhaar_lname,
  aadhaar_dob,
  aadhaar_pincode,
  parsed_aadhaar_number,
  aadhaar_mname,
) => {
  let query = {
    loan_app_id: loan_id,
  };
  return LoanRequest.updateOne(query, {
    $set: {
      aadhaar_fname: aadhaar_fname,
      aadhaar_lname: aadhaar_lname,
      aadhaar_dob: aadhaar_dob,
      aadhaar_pincode: aadhaar_pincode,
      parsed_aadhaar_number: parsed_aadhaar_number,
      aadhaar_mname: aadhaar_mname,
    },
  });
};

module.exports.updatePanDetailsByLoanId = (
  loan_id,
  pan_fname,
  pan_lname,
  pan_dob,
  parsed_pan_number,
  pan_father_fname,
  pan_father_lname,
  pan_middle_name,
) => {
  let query = {
    loan_app_id: loan_id,
  };
  return LoanRequest.updateOne(query, {
    $set: {
      pan_fname: pan_fname,
      pan_lname: pan_lname,
      pan_dob: pan_dob,
      parsed_pan_number: parsed_pan_number,
      pan_father_fname: pan_father_fname,
      pan_father_lname: pan_father_lname,
      pan_mname: pan_middle_name,
    },
  });
};

module.exports.findValuesForBackAadhaar = (loan_id) => {
  return LoanRequest.findOne({
    loan_app_id: loan_id,
  });
};
module.exports.updateBackAadharDetailsByLoanId = (loan_id, aadhaar_pincode) => {
  let query = {
    loan_app_id: loan_id,
  };
  return LoanRequest.updateOne(query, {
    $set: { aadhaar_pincode: aadhaar_pincode },
  });
};

module.exports.updateAadharFrontDetailsByLoanId = (
  loan_id,
  aadhaar_fname,
  aadhaar_lname,
  aadhaar_dob,
  parsed_aadhaar_number,
  aadhaar_middle_name,
) => {
  let query = {
    loan_app_id: loan_id,
  };
  return LoanRequest.updateOne(query, {
    $set: {
      aadhaar_fname: aadhaar_fname,
      aadhaar_lname: aadhaar_lname,
      aadhaar_dob: aadhaar_dob,
      parsed_aadhaar_number: parsed_aadhaar_number,
      aadhaar_mname: aadhaar_middle_name,
    },
  });
};

module.exports.updateXMLROW = (data) => {
  const query = {
    loan_app_id: data.loan_app_id,
  };
  delete data.loan_app_id;
  return LoanRequest.findOneAndUpdate(query, data, {});
};

module.exports.findAllByLoanIds = (ids) => {
  return LoanRequest.find({
    loan_id: { $in: ids },
  });
};

module.exports.findAllByFilterRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, scr_status } = filter;
  query['$and'] = [];
  if (company_id) {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id) {
    query['$and'].push({
      product_id,
    });
  }
  if (
    from_date !== null &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== ''
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      created_at: {
        $gte: date,
      },
    });
  }
  if (
    to_date !== null &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== ''
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      updated_at: {
        $lte: date,
      },
    });
  }

  if (query['$and'] == '') {
    delete query['$and'];
  }

  return LoanRequest.find(query);
};

//GetAllBYFilterExport
module.exports.getAllByFilterExport = async (filter) => {
  var query = {};
  const {
    company_id,
    product_id,
    from_date,
    to_date,
    str,
    book_entity_id,
    status,
  } = filter;

  const isPagination = filter.hasOwnProperty('pagination');
  let page = 0;
  let limit = 1;
  if (isPagination) {
    page = filter.pagination.page;
    limit = filter.pagination.limit;
  }

  if (company_id) {
    query['$and'] = [];
    query['$and'].push({
      company_id,
    });
  }
  if (status)
    query['$and'].push({
      status,
    });
  if (product_id)
    query['$and'].push({
      product_id,
    });
  if (book_entity_id)
    query['$and'].push({
      book_entity_id,
    });
  if (
    from_date !== 'null' &&
    from_date !== 'undefined' &&
    from_date !== undefined &&
    from_date !== '' &&
    from_date !== null
  ) {
    let date = new Date(from_date);
    date.setHours(0, 0, 0, 0);
    query['$and'].push({
      created_at: {
        $gte: date,
      },
    });
  }
  if (
    to_date !== 'null' &&
    to_date !== 'undefined' &&
    to_date !== undefined &&
    to_date !== '' &&
    to_date !== null
  ) {
    let date = new Date(to_date);
    date.setHours(23, 59, 59, 999);
    query['$and'].push({
      created_at: {
        $lte: date,
      },
    });
  }
  if (str !== '' && str !== null && str !== 'null' && str !== undefined) {
    query['$and'].push({
      $or: [
        {
          loan_app_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          partner_loan_app_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          loan_id: {
            $regex: str,
            $options: 'i',
          },
        },
      ],
    });
  }
  if (isPagination) {
    return LoanRequest.find(query)
      .sort({ created_at: -1 })
      .skip(filter.pagination.page * filter.pagination.limit)
      .limit(filter.pagination.limit);
  } else {
    return LoanRequest.find(query).limit(
      Number(process.env.EXPORT_DOWNLOAD_LIMIT),
    );
  }
};

///fetch loan request by loan id
module.exports.getByLoanId = async (loan_id) => {
  return await LoanRequest.aggregate([
    {
      $match: {
        loan_id: loan_id,
      },
    },
    {
      $lookup: {
        from: 'compliances',
        localField: 'loan_id',
        foreignField: 'loan_id',
        as: 'compliances',
      },
    },
    {
      $unwind: '$compliances',
    },
  ]);
};

module.exports.findOneGlobalSearch = (filter) => {
  try {
    var query={}
    const { company_id, product_id, from_date, to_date, str, status ,is_msme} = filter;
    if (  is_msme!== '' &&
    is_msme !== null &&
    is_msme !== 'null' &&
    is_msme !== undefined ) {
       query = {
        $and: [],
        $or: [
           {
          loan_app_id: {
            $regex: is_msme,
            $options: 'i',
          },
        },
        {
          name: {
            $regex: is_msme,
            $options: 'i',
          },
        },
        {
          first_name: {
            $regex: is_msme,
            $options: 'i',
          },
        },
        {
          appl_pan: {
            $regex: is_msme,
            $options: 'i',
          },
        },
        {
          borrower_id: {
            $regex: is_msme,
            $options: 'i',
          },
        },
      
      ]
      }
    }  
     query = {
      $and: [],
      $or: [
        {
          first_name: {
            $regex: str,
            $options: 'i',
          },
        },  
        {
          loan_app_id: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          appl_pan: {
            $regex: str,
            $options: 'i',
          },
        },
        {
          borrower_id: {
            $regex: str,
            $options: 'i',
          },
        },
      ],
    };

    if (from_date && from_date !== 'null' && from_date !== null) {
      let date = new Date(from_date);
      date.setHours(0, 0, 0, 0);
      query['$and'].push({
        created_at: {
          $gte: date,
        },
      });
    }
    if (to_date && to_date !== 'null' && to_date !== null) {
      let date = new Date(to_date);
      date.setHours(23, 59, 59, 999);
      query['$and'].push({
        created_at: {
          $lte: date,
        },
      });
    }
    if (company_id && company_id !== 'null' && company_id !== null)
      query['$and'].push({ company_id: company_id });
    if (product_id && product_id !== 'null' && product_id !== null)
      query['$and'].push({ product_id: product_id });
    if (
      status !== '' &&
      status !== null &&
      status !== 'null' &&
      status !== undefined
    ) {
      let statusObj = {
        lead_status: status,
      };
      query['$and'].push(statusObj);
    }
  if (!query['$and'].length) delete query['$and'];
    return LoanRequest.find(query);
  } catch (error) {
    console.log('error', error);
    return error;
  }
};

module.exports.updateCamDetails = (loan_app_id, data) => {
  try {
    const query = {
      loan_app_id: loan_app_id,
    };
    return LoanRequest.findOneAndUpdate(query, data, {});
  } catch (error) {
    console.log('error', error);
  }
};

module.exports.updateSignedDocs = (leadData) => {
  return LoanRequest.updateOne(
    { loan_app_id: leadData.loan_app_id },
    { $set: { signed_docs: leadData.signed_docs } }
  );
};

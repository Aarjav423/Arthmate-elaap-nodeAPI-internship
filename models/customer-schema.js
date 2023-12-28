var autoIncrement = require('mongoose-auto-increment');
var mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
  id: {
    type: Number,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  cust_id: {
    type: String,
    allowNull: false,
  },
  pan: {
    type: String,
    allowNull: false,
  },
  first_name: {
    type: String,
    allowNull: false,
  },
  middle_name: {
    type: String,
    allowNull: true,
  },
  last_name: {
    type: String,
    allowNull: false,
  },
  tag: {
    type: [String],
    allowNull: true,
  },
  loan_app_id: {
    type: [String],
    allowNull: true,
  },
  updatedon: {
    type: Date,
    default: Date.now,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  create_date: {
    type: Date,
    default: Date.now,
  },
});

autoIncrement.initialize(mongoose.connection);
customerSchema.plugin(autoIncrement.plugin, 'id');
var Customers = (module.exports = mongoose.model('customers', customerSchema));

module.exports.addNew = (customer) => {
  var insertdata = new Customers(customer);
  return insertdata.save();
};
module.exports.getAll = () => {
  return Customers.find({});
};

module.exports.findByPan = (pan) => {
  return Customers.find({ pan: pan });
};

module.exports.updateOne = (data, title) => {
  return Customers.findOneAndUpdate(
    {
      title,
    },
    data,
    {},
  );
};

module.exports.AddTagAndLoanAppIdByPan = (pan, tagData, loanAppId) => {
  return Customers.findOneAndUpdate(
    {
      pan: pan,
    },
    {
      $push: {
        tag: tagData,
        loan_app_id:loanAppId
      },
    },
  );
};

module.exports.getCount = () => {
  return Customers.find({}).count();
};

// for borrower-history-api
module.exports.findLoanHistoryByPan = (pan) => {
  return Customers.aggregate([
    {
      $match: {
        pan: pan,
      },
    },
    {
      $lookup: {
        from: 'loanrequests',
        localField: 'cust_id',
        foreignField: 'cust_id',
        as: 'HISTORY',
      },
    },
    {
      $unwind: {
        path: '$HISTORY',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        company_id: '$HISTORY.company_id',
        product_id: '$HISTORY.product_id',
        loan_app_id: '$HISTORY.loan_app_id',
      },
    },
    {
      $lookup: {
        from: 'borrowerinfo_commons',
        localField: 'loan_app_id',
        foreignField: 'loan_app_id',
        as: 'LOAN',
      },
    },
    {
      $unwind: {
        path: '$LOAN',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        company_id: 1,
        product_id: 1,
        co_lender_id: '$LOAN.co_lender_id',
        loan_id: {
          $ifNull: ['$LOAN.loan_id', ''],
        },
        disbursement_date: {
          $ifNull: ['$LOAN.disbursement_date_time', ''],
        },
        loan_status: {
          $ifNull: ['$LOAN.status', ''],
        },
        loan_amount: {
          $ifNull: ['$LOAN.sanction_amount', ''],
        },
      },
    },
    {
      $lookup: {
        from: 'co_lender_profiles',
        localField: 'co_lender_id',
        foreignField: 'co_lender_id',
        as: 'COLENDER',
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company_id',
        foreignField: '_id',
        as: 'COMPANY',
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product_id',
        foreignField: '_id',
        as: 'PRODUCT',
      },
    },
    {
      $unwind: {
        path: '$COLENDER',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$COMPANY',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$PRODUCT',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        loan_id: 1,
        disbursement_date: 1,
        loan_amount: 1,
        loan_status: 1,
        co_lender_id: '$COLENDER.co_lender_id',
        co_lender_shortcode: {
          $ifNull: ['$COLENDER.co_lender_shortcode', ''],
        },
        company_name: {
          $ifNull: ['$COMPANY.name', ''],
        },
        company_code: {
          $ifNull: ['$COMPANY.code', ''],
        },
        product_name: {
          $ifNull: ['$PRODUCT.name', ''],
        },
        product_code: {
          $ifNull: ['$PRODUCT.name', ''],
        },
      },
    },
  ]);
};

module.exports.fetchCustomerListByFilter = async (filter) => {
  const {
    page,
    limit,
    str
  } = filter;

  const query = [
    {
      $sort: { _id: -1 } 
    },
    {
      $addFields: {
        customer_name: {
          $cond: [
            { $ifNull: ["$middle_name", null] },
            { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
            { $concat: ["$first_name", " ", "$last_name"] },
          ]
        }
      },
    },
    ...(str ? [
      {
        $match: {
          $or: [
            {
              cust_id: {
                $regex: str,
                $options: 'i',
              },
            },
            {
              customer_name: {
                $regex: str,
                $options: 'i',
              },
            }
          ],
        },
      },
    ]: []),
    {
      $skip: (page*limit) 
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: "loanrequests",
        localField: "cust_id",
        foreignField: "cust_id",
        as: "loan_requests"
      }
    },
    {
      $unwind: {
        path: "$loan_requests",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        cust_id: 1,
        customer_name: 1,
        create_date: 1,
        product_id: "$loan_requests.product_id",
        loan_id: "$loan_requests.loan_id"
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product"
      }
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        cust_id: 1,
        customer_name: 1,
        create_date: 1,
        loan_id: 1,
        allow_loc: "$product.allow_loc"
      },
    },
    {
      $lookup: {
        from: "borrowerinfo_commons",
        let: { loan_id: "$loan_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $in: ["$stage", [4, 999, 7, 8]] }
                ]
              }
            }
          }
        ],
        as: "borrowerinfo_commons"
      }
    },
    {
      $unwind: {
        path: "$borrowerinfo_commons",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        cust_id: 1,
        customer_name: 1,
        create_date: 1,
        loan_id: 1,
        allow_loc: 1,
        stage: "$borrowerinfo_commons.stage"
      },
    },
    {
      $lookup: {
        from: "loan_states",
        let: { loan_id: "$loan_id", stage: "$stage" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $eq: ["$$stage", 4] }
                ]
              }
            }
          }
        ],
        as: "loan_states"
      }
    },
    {
      $unwind: {
        path: "$loan_states",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        loan_sum_due: {
          $add: [
            { $ifNull: [ { $toDouble: "$loan_states.prin_os" }, 0 ] },
            { $ifNull: [ { $toDouble: "$loan_states.current_int_due" }, 0 ] },
            { $ifNull: [ { $toDouble: "$loan_states.current_lpi_due" }, 0 ] }
          ]
        }
      }
    },
    {
      $project: {
        cust_id: 1,
        customer_name: 1,
        create_date: 1,
        loan_id: 1,
        allow_loc: 1,
        stage: 1,
        loan_sum_due: 1
      },
    },
    {
      $lookup: {
        from: "charges",
        let: { loan_id: "$loan_id", stage: "$stage" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $eq: ["$$stage", 4] },
                  { $eq: ["$charge_id", 1] }
                ]
              }
            }
          },
          {
            $addFields: {
              charges_due: {
                $subtract: [
                  {
                    $add: [
                      { $ifNull: [{ $toDouble: "$charge_amount" }, 0] },
                      { $ifNull: [{ $toDouble: "$gst" }, 0] },
                    ],
                  },
                  {
                    $add: [
                      { $ifNull: [{ $toDouble: "$total_amount_paid" }, 0] },
                      { $ifNull: [{ $toDouble: "$total_amount_waived" }, 0] },
                      { $ifNull: [{ $toDouble: "$total_gst_paid" }, 0] },
                      { $ifNull: [{ $toDouble: "$total_gst_reversed" }, 0] },
                    ],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: "$loan_id",
              charges_due: { $sum: "$charges_due" }
            }
          },
          {
            $project: {
              _id: 0,
              charges_due: 1
            }
          }
        ],
        as: "charges"
      }
    },
    {
      $unwind: {
        path: "$charges",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        cust_id: 1,
        customer_name: 1,
        create_date: 1,
        loan_id: 1,
        allow_loc: 1,
        stage: 1,
        loan_sum_due: 1,
        charges_due: "$charges.charges_due"
      },
    },
    {
      $lookup: {
        from: "line_state_audit",
        let: { loan_id: "$loan_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $ne: ["$status", "Closed"]},
                ]
              }
            }
          }
        ],
        as: "line_state_audit"
      }
    },
    {
      $unwind: {
        path: "$line_state_audit",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        drawdown_sum_due: {
          $subtract: [
            {
              $add: [
                { $ifNull: [{ $toDouble: "$line_state_audit.drawdown_amt" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.interst_due" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.lpi_due" }, 0] },
              ],
            },
            {
              $add: [
                { $ifNull: [{ $toDouble: "$line_state_audit.principal_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.interst_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.lpi_paid" }, 0] },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$cust_id",
        customer_id: { $first: "$cust_id" },
        customer_name: { $first: "$customer_name" },
        joining_date: { $first: "$create_date" },
        no_of_loans: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ["$loan_id", null] }, null] },
                  { $ne: ["$allow_loc", 1] },
                  { $in: ["$stage", [4, 999] ] }
                ]
              },
              "$loan_id",
              null
            ]
          }
        },
        no_of_lines: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ["$loan_id", null] }, null] },
                  { $eq: ["$allow_loc", 1] },
                  { $in: ["$stage", [4, 7, 8] ] }
                ]
              },
              "$loan_id",
              null
            ]
          }
        },
        loan_exposure: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$allow_loc", 1] },
                  { $eq: ["$stage", 4] }
                ]
              },
              {
                $add: [
                  { $ifNull: ["$loan_sum_due", 0] },
                  { $ifNull: ["$charges_due", 0] },
                ]
              },
              0
            ]
          }
        },
        line_exposure: {
          $sum: {
            $cond: [
              { $eq: ["$allow_loc", 1] },
              { $ifNull: ["$drawdown_sum_due", 0] },
              0
            ]
          }
        },
      }
    },
    {
      $project: {
        _id: 0,
        customer_id: 1,
        customer_name: 1,
        joining_date: {
          $dateToString: {
            format: "%d-%m-%Y",
            date: "$joining_date"
          }
        },
        no_of_loans: {
          $size: {
            $filter: {
              input: "$no_of_loans",
              as: "loans",
              cond: { $ne: ["$$loans", null] }
            }
          },
        },
        no_of_lines: {
          $size: {
            $filter: {
              input: "$no_of_lines",
              as: "lines",
              cond: { $ne: ["$$lines", null] }
            }
          },
        },
        total_exposure: {
          $add: [ "$loan_exposure", "$line_exposure" ]
        }
      }
    }
  ]

  const query1 = [
    ...(str ? [
      {
        $addFields: {
          customer_name: {
            $cond: [
              { $ifNull: ["$middle_name", null] },
              { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
              { $concat: ["$first_name", " ", "$last_name"] },
            ]
          }
        },
      },
      {
        $match: {
          $or: [
            {
              cust_id: {
                $regex: str,
                $options: 'i',
              },
            },
            {
              customer_name: {
                $regex: str,
                $options: 'i',
              },
            }
          ],
        },
      },
    ]: []),
    {
      $count: "count"
    }
  ]

  let count = await Customers.aggregate(query1);
  count = count[0]?.count || 0;
  let data;

  if(count !== 0){
    data = await Customers.aggregate(query).sort( {customer_id: -1} );
  }
  const result = {
    count: count,
    data: data
  };
  return result;
}

module.exports.fetchCustomerLoanLineDetails = async (customerId) => {
  const query = [
    {
      $match: {
        cust_id: customerId,
      }
    },
    {
      $lookup: {
        from: "loanrequests",
        localField: "cust_id",
        foreignField: "cust_id",
        as: "loan_requests"
      }
    },
    {
      $unwind: {
        path: "$loan_requests",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        loan_id: "$loan_requests.loan_id",
        product_id: "$loan_requests.product_id",
        company_id: "$loan_requests.company_id"
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product"
      }
    },
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: "$product.name",
        allow_loc: "$product.allow_loc",
        loan_schema_id: "$product.loan_schema_id"
      },
    },
    {
      $lookup: {
        from: "borrowerinfo_commons",
        let: { loan_id: "$loan_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $in: ["$stage", [4, 999, 7, 8]] }
                ]
              }
            }
          }
        ],
        as: "borrowerinfo_commons"
      }
    },
    {
      $unwind: {
        path: "$borrowerinfo_commons"
      }
    },
    {
      $project: {
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        stage: "$borrowerinfo_commons.stage",
        sanction_amount: { $ifNull: ["$borrowerinfo_commons.sanction_amount", 0] },
        emi_amount: { $ifNull: ["$borrowerinfo_commons.emi_amount", 0] }
      },
    },
    {
      $lookup: {
        from: "repayment_installments",
        localField: "loan_id",
        foreignField: "loan_id",
        as: "repayment_installments"
      }
    },
    {
      $unwind: {
        path: "$repayment_installments",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$loan_id",
        loan_id: { $first: "$loan_id" },
        product_id: { $first: "$product_id" },
        company_id: { $first: "$company_id" },
        product_name: { $first: "$product_name" },
        allow_loc: { $first: "$allow_loc" },
        loan_schema_id: { $first: "$loan_schema_id" },
        stage: { $first: "$stage" },
        sanction_amount: { $first: "$sanction_amount" },
        emi_amount: { $first: "$emi_amount" },
        total_emis: {
          $sum: { 
            $cond: [{ $ifNull: ["$repayment_installments.loan_id", false] }, 1, 0]
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        stage: 1,
        sanction_amount: 1,
        emi_amount: 1,
        total_emis: 1
      }
    },
    {
      $lookup: {
        from: "loan_state_audit",
        localField: "loan_id",
        foreignField: "loan_id",
        as: "loan_state_audit"
      }
    },
    {
      $unwind: {
        path: "$loan_state_audit",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$loan_id",
        loan_id: { $first: "$loan_id" },
        product_id: { $first: "$product_id" },
        company_id: { $first: "$company_id" },
        product_name: { $first: "$product_name" },
        allow_loc: { $first: "$allow_loc" },
        loan_schema_id: { $first: "$loan_schema_id" },
        stage: { $first: "$stage" },
        sanction_amount: { $first: "$sanction_amount" },
        emi_amount: { $first: "$emi_amount" },
        total_emis: { $first: "$total_emis" },
        emis_due: {
          $sum: { 
            $cond: [{ $ifNull: ["$loan_state_audit.loan_id", false] }, 1, 0]
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        stage: 1,
        sanction_amount: 1,
        emi_amount: 1,
        total_emis: 1,
        emis_due: 1
      }
    },
    {
      $lookup: {
        from: "loan_states",
        let: { loan_id: "$loan_id", stage: "$stage" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $eq: ["$$stage", 4] }
                ]
              }
            }
          }
        ],
        as: "loan_states"
      }
    },
    {
      $unwind: {
        path: "$loan_states",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        loan_sum_due: {
          $add: [
            { $ifNull: [ { $toDouble: "$loan_states.prin_os" }, 0 ] },
            { $ifNull: [ { $toDouble: "$loan_states.current_int_due" }, 0 ] },
            { $ifNull: [ { $toDouble: "$loan_states.current_lpi_due" }, 0 ] }
          ]
        }
      }
    },
    {
      $project: {
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        stage: 1,
        sanction_amount: 1,
        emi_amount: 1,
        total_emis: 1,
        emis_due: 1,
        loan_sum_due: 1,
        dpd: { $ifNull: ["$loan_states.dpd", 0] }
      }
    },
    {
      $lookup: {
        from: "charges",
        let: { loan_id: "$loan_id", stage: "$stage" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $eq: ["$$stage", 4] },
                  { $eq: ["$charge_id", 1] }
                ]
              }
            }
          }
        ],
        as: "charges"
      }
    },
    {
      $unwind: {
        path: "$charges",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        charges_due: {
          $subtract: [
            {
              $add: [
                { $ifNull: [{ $toDouble: "$charges.charge_amount" }, 0] },
                { $ifNull: [{ $toDouble: "$charges.gst" }, 0] },
              ],
            },
            {
              $add: [
                { $ifNull: [{ $toDouble: "$charges.total_amount_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$charges.total_amount_waived" }, 0] },
                { $ifNull: [{ $toDouble: "$charges.total_gst_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$charges.total_gst_reversed" }, 0] },
              ],
            },
          ],
        }
      },
    },
    {
      $group: {
        _id: "$loan_id",
        loan_id: { $first: "$loan_id" },
        product_id: { $first: "$product_id" },
        company_id: { $first: "$company_id" },
        product_name: { $first: "$product_name" },
        allow_loc: { $first: "$allow_loc" },
        loan_schema_id: { $first: "$loan_schema_id" },
        stage: { $first: "$stage" },
        sanction_amount: { $first: "$sanction_amount" },
        emi_amount: { $first: "$emi_amount" },
        total_emis: { $first: "$total_emis" },
        emis_due: { $first: "$emis_due" },
        loan_sum_due: { $first: "$loan_sum_due" },
        dpd: { $first: "$dpd" },
        charges_due: { $sum: "$charges_due" }
      }
    },
    {
      $project: {
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        stage: 1,
        sanction_amount: 1,
        emi_amount: 1,
        total_emis: 1,
        emis_due: 1,
        dpd: 1,
        loan_exposure: {
          $add: [
            { $toDouble: "$loan_sum_due" },
            { $toDouble: "$charges_due" }
          ]
        }
      },
    },
    {
      $lookup: {
        from: "line_state_audit",
        let: { loan_id: "$loan_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$loan_id", "$$loan_id"] },
                  { $ne: ["$status", "Closed"]},
                ]
              }
            }
          }
        ],
        as: "line_state_audit"
      }
    },
    {
      $unwind: {
        path: "$line_state_audit",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        drawdown_sum_due: {
          $subtract: [
            {
              $add: [
                { $ifNull: [{ $toDouble: "$line_state_audit.drawdown_amt" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.interst_due" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.lpi_due" }, 0] },
              ],
            },
            {
              $add: [
                { $ifNull: [{ $toDouble: "$line_state_audit.principal_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.interst_paid" }, 0] },
                { $ifNull: [{ $toDouble: "$line_state_audit.lpi_paid" }, 0] },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$loan_id",
        loan_id: { $first: "$loan_id" },
        product_id: { $first: "$product_id" },
        company_id: { $first: "$company_id" },
        product_name: { $first: "$product_name" },
        allow_loc: { $first: "$allow_loc" },
        loan_schema_id: { $first: "$loan_schema_id" },
        stage: { $first: "$stage" },
        sanction_amount: { $first: "$sanction_amount" },
        emi_amount: { $first: "$emi_amount" },
        total_emis: { $first: "$total_emis" },
        emis_due: { $first: "$emis_due" },
        dpd: { $first: "$dpd" },
        loan_exposure: { $first: "$loan_exposure" },
        line_exposure: { $sum: "$drawdown_sum_due" }
      }
    },
    {
      $project: {
        _id: 0,
        loan_id: 1,
        product_id: 1,
        company_id: 1,
        product_name: 1,
        allow_loc: 1,
        loan_schema_id: 1,
        sanction_amount: 1,
        emi_amount: 1,
        total_emis: 1,
        emis_due: 1,
        dpd: 1,
        loan_exposure: 1,
        line_exposure: 1,
        status: {
          $switch: {
            branches: [
              { case: { $in: ["$stage", [4, 7]] }, then: "active" },
              { case: { $eq: ["$stage", 999] }, then: "closed" },
              { case: { $eq: ["$stage", 8] }, then: "expired" },
            ]
          }
        }
      },
    },
    {
      $lookup: {
        from: "loc_credit_limits",
        localField: "loan_id",
        foreignField: "loan_id",
        as: "loc_credit_limits"
      }
    },
    {
      $unwind: {
        path: "$loc_credit_limits",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $addFields: {
        type: {
          $cond: [{ $eq: ["$allow_loc", 1] }, "Line", "Loan"]
        }
      }
    },
    {
      $group: {
        _id: "$type",
        type: { $first: "$type" },
        total_exposure: {
          $sum: {
            $add: ["$loan_exposure", "$line_exposure"]
          }
        },
        data: {
          $push: {
            $cond: [
              { $eq: ["$type", "Loan"] },
              {
                loan_id: "$loan_id",
                product_id: "$product_id",
                company_id: "$company_id",
                product_name: "$product_name",
                loan_schema_id: "$loan_schema_id",
                loan_amount: "$sanction_amount",
                total_outstanding: "$loan_exposure",
                monthly_emi: "$emi_amount",
                total_emis: "$total_emis",
                emis_due: "$emis_due",
                dpd: "$dpd",
                status: "$status"
              },
              {
                loan_id: "$loan_id",
                product_id: "$product_id",
                company_id: "$company_id",
                product_name: "$product_name",
                loan_schema_id: "$loan_schema_id",
                total_limit: "$loc_credit_limits.limit_amount",
                available_limit: "$loc_credit_limits.available_balance",
                status: "$status"
              }
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        type: 1,
        total_exposure: 1,
        data: 1
      }
    }
  ]

  const data = await Customers.aggregate(query);
  return data;
}

module.exports.fetchCustomerDetails = async (customerId) => {
  const query = [
    {
      $match: {
        cust_id: customerId,
      }
    },
    {
      $lookup: {
        from: "loanrequests",
        localField: "cust_id",
        foreignField: "cust_id",
        as: "loan_requests"
      }
    },
    {
      $unwind: "$loan_requests"
    },
    {
      $sort: { "loan_requests.created_at": -1 },
    },
    {
      $group: {
        _id: "$cust_id",
        first_name: { $first: "$first_name"},
        middle_name: {$first: "$middle_name"},
        last_name: { $first: "$last_name"},
        pan: { $first: "$pan" },
        loan_requests: { $push: "$loan_requests" },
      }
    },
    {
      $addFields: {
        customer_name: {
          $cond: [
            { $ifNull: ["$middle_name", null] },
            { $concat: ["$first_name", " ", "$middle_name", " ", "$last_name"] },
            { $concat: ["$first_name", " ", "$last_name"] },
          ]
        }
      },
    },
    {
      $project: {
        _id: 0,
        customer_name: "$customer_name",
        pan: "$pan",
        dob: { $ifNull: [{ $arrayElemAt: ["$loan_requests.dob", 0] }, null] },
        cur_addr_ln1: { $ifNull: [{ $arrayElemAt: ["$loan_requests.resi_addr_ln1", 0] }, null] },
        cur_addr_ln2: { $ifNull: [{ $arrayElemAt: ["$loan_requests.resi_addr_ln2", 0] }, null] },
        cur_city: { $ifNull: [{ $arrayElemAt: ["$loan_requests.city", 0] }, null] },
        cur_state: { $ifNull: [{ $arrayElemAt: ["$loan_requests.state", 0] }, null] },
        cur_pincode: { $ifNull: [{ $arrayElemAt: ["$loan_requests.pincode", 0] }, null] },
        per_addr_ln1: { $ifNull: [{ $arrayElemAt: ["$loan_requests.per_addr_ln1", 0] }, null] },
        per_addr_ln2: { $ifNull: [{ $arrayElemAt: ["$loan_requests.per_addr_ln2", 0] }, null] },
        per_city: { $ifNull: [{ $arrayElemAt: ["$loan_requests.per_city", 0] }, null] },
        per_state: { $ifNull: [{ $arrayElemAt: ["$loan_requests.per_state", 0] }, null] },
        per_pincode: { $ifNull: [{ $arrayElemAt: ["$loan_requests.per_pincode", 0] }, null] },
        type_of_addr: { $ifNull: [{ $arrayElemAt: ["$loan_requests.type_of_addr", 0] }, null] },
        loan_app_id: { $ifNull: [{ $arrayElemAt: ["$loan_requests.loan_app_id", 0] }, null] },
        company_id: { $ifNull: [{ $arrayElemAt: ["$loan_requests.company_id", 0] }, null] },
        product_id: { $ifNull: [{ $arrayElemAt: ["$loan_requests.product_id", 0] }, null] }
      }
    }
  ]

  const data = await Customers.aggregate(query);
  return data;
}

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var autoIncrement = require('mongoose-auto-increment');

const IssuePolicyStagingSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      autoIncrement: true,
      primaryKey: true,
      allowNull: true,
    },
    family_composition: {
      type: String,
      allowNull: true,
    },
    company_id: {
      type: Number,
      allowNull: true,
    },
    product_id: {
      type: Number,
      allowNull: true,
    },
    company_name: {
      type: String,
      allowNull: true,
    },
    product_name: {
      type: String,
      allowNull: true,
    },
    loan_id: {
      type: String,
      allowNull: true,
    },
    digit_api_ref_number: {
      type: String,
      allowNull: true,
    },
    stage: {
      type: String,
      allowNull: true,
    },
    product_key: {
      type: String,
      allowNull: true,
    },
    start_date: {
      type: Date,
      allowNull: true,
    },
    end_date: {
      type: Date,
      allowNull: true,
    },
    loan_amount: {
      type: Number,
      allowNull: true,
    },
    emi_amount: {
      type: Number,
      allowNull: true,
    },
    loan_tenure: {
      type: Number,
      allowNull: true,
    },
    loan_date: {
      type: Date,
      allowNull: true,
    },
    loan_account_number: {
      type: String,
      allowNull: true,
    },
    package_name: {
      type: String,
      allowNull: true,
    },
    external_ref_number: {
      type: String,
      allowNull: true,
    },
    master_policy_number: {
      type: String,
      allowNull: true,
    },
    insured_product_code: {
      type: String,
      allowNull: true,
    },
    partner_api_key: {
      type: String,
      allowNull: true,
    },
    imd_code: {
      type: String,
      allowNull: true,
    },
    total_collected_premium: {
      type: String,
      allowNull: true,
    },
    customer: {
      customerType: {
        type: String,
        allowNull: true,
      },
      companyName: {
        type: String,
        allowNull: true,
      },
      address: {
        pincode: {
          type: Number,
          allowNull: true,
        },
        city: {
          type: String,
          allowNull: true,
        },
        state: {
          type: String,
          allowNull: true,
        },
        country: {
          type: String,
          allowNull: true,
        },
        street: {
          type: String,
          allowNull: true,
        },
      },
    },
    contract_coverages: [
      {
        section_id: {
          type: String,
          allowNull: true,
        },
        value: {
          type: String,
          allowNull: true,
        },
      },
    ],
    insured_persons: [
      {
        sum_insured: {
          type: String,
          allowNull: true,
        },
        premium: {
          type: String,
          allowNull: true,
        },
        employee_id: {
          type: String,
          allowNull: true,
        },
        title: {
          type: String,
          allowNull: true,
        },
        first_name: {
          type: String,
          allowNull: true,
        },
        last_name: {
          type: String,
          allowNull: true,
        },
        gender: {
          type: String,
          allowNull: true,
        },
        relationship: {
          type: String,
          allowNull: true,
        },
        date_of_birth: {
          type: Date,
          allowNull: true,
        },
        mobile: {
          type: String,
          allowNull: true,
        },
        email: {
          type: String,
          allowNull: true,
        },
        ageBand: {
          type: String,
          allowNull: true,
        },
        age: {
          type: String,
          allowNull: true,
        },
        height: {
          type: String,
          allowNull: true,
        },
        weight: {
          type: String,
          allowNull: true,
        },
        tobacco: {
          type: String,
          allowNull: true,
        },
        alcohol: {
          type: String,
          allowNull: true,
        },
        heart_disease: {
          type: String,
          allowNull: true,
        },
        asthma: {
          type: String,
          allowNull: true,
        },
        lipid_disorder: {
          type: String,
          allowNull: true,
        },
        pre_existing_disease: {
          type: String,
          allowNull: true,
        },
        marital_status: {
          type: String,
          allowNull: true,
        },
        type: {
          type: String,
          allowNull: true,
        },
        address: { type: Object, allowNull: true },
        nominee: { type: Object, allowNull: true },
        documents: [
          {
            document_type: {
              type: String,
              allowNull: true,
            },
            document_id: {
              type: String,
              allowNull: true,
            },
            expiry_date: {
              type: Date,
              allowNull: true,
            },
            issuing_authority: {
              type: String,
              allowNull: true,
            },
            issuing_place: {
              type: String,
              allowNull: true,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

autoIncrement.initialize(mongoose.connection);
IssuePolicyStagingSchema.plugin(autoIncrement.plugin, 'id');
var IssuePolicyStaging = (module.exports = mongoose.model(
  'issue_policy_staging',
  IssuePolicyStagingSchema,
  'issue_policy_staging',
));

module.exports.addNew = (data) => {
  return IssuePolicyStaging.create(data);
};

module.exports.getFilteredInsuranceRecords = (filter) => {
  var query = {};
  const { company_id, product_id, from_date, to_date, status } = filter;

  if (!company_id && !product_id && !from_date && !to_date && !status) {
    return IssuePolicyStaging.find({}).sort({
      _id: -1,
    });
  }
  query['$and'] = [];
  if (company_id && company_id != '00') {
    query['$and'].push({
      company_id,
    });
  }
  if (product_id && product_id != '00' && product_id != '0') {
    query['$and'].push({
      product_id,
    });
  }
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
  return IssuePolicyStaging.find(query);
};

module.exports.getRecordsLoanIds = (loanIds) => {
  const query = {
    loan_id: { $in: loanIds },
  };
  return IssuePolicyStaging.find(query);
};
module.exports.findIfExist = (loan_id) => {
  const query = {
    loan_id: loan_id,
  };
  return IssuePolicyStaging.findOne(query);
};
module.exports.updateExisting = (loan_id, data) => {
  const query = {
    loan_id: loan_id,
  };
  return IssuePolicyStaging.findOneAndUpdate(query, data, {});
};

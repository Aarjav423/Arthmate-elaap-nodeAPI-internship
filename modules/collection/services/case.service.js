const httpStatus = require('http-status');
const { Case, User, TimeSlot, Payment, ActivityLog } = require('../models');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const { createLog } = require('./activityLog.service');
const mongoose = require('mongoose');
const { activityTypes } = require('../config/activity');
const { statusTypes, depositionStatusTypes } = require('../config/collection');
const moment = require('moment');
const { formatDate } = require('../utils/helpers');

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryCases = async (query) => {
  let filter = {};
  let options = { sortBy: 'created_at:asc' };
  if (query.type) {
    switch (query.type) {
      case 'new':
        filter = { status: 'open' };
        break;
      case 'inProgress':
        filter = { status: 'ongoing' };
        break;
      case 'close':
        filter = { status: 'closed' };
        break;
    }
  }
  if (query.minDPD) {
    filter = {
      ...filter,
      overdue_days: {
        ...filter.overdue_days,

        $gte: query.minDPD,
      },
    };
  }

  if (query.maxDPD) {
    filter = {
      ...filter,
      overdue_days: {
        ...filter.overdue_days,

        $lte: query.maxDPD,
      },
    };
  }
  if(query.company_code){
    filter = {
      ...filter,
      company_code:query.company_code
    }
  }

  if (query.minAmount && query.maxAmount) {
    filter = {
      ...filter,
      $expr: {
        $and: [
          { $gte: [{ $toDouble: '$total_outstanding' }, +query.minAmount] },
          { $lte: [{ $toDouble: '$total_outstanding' }, +query.maxAmount] },
        ],
      },
    };
  } else if (query.maxAmount) {
    filter = {
      ...filter,
      $expr: {
        $lte: [{ $toDouble: '$total_outstanding' }, +query.maxAmount],
      },
    };
  } else {
    filter = {
      ...filter,
      $expr: {
        $gte: [{ $toDouble: '$total_outstanding' }, +query.minAmount],
      },
    };
  }
  filter = {
    ...filter,
    ...pick(query, [
      'name',
      'coll_id',
      'status',
      'pincode',
      'lms_id',
      'assigned_to',
    ]),
  };
  options = {
    ...options,
    ...pick(query, ['sortBy', 'limit', 'page', 'populate']),
  };
  if (filter.name) {
    const names = filter.name.split(' ');
    const nameFilters = names.map((name) => ({
      $or: [
        { first_name: { $regex: name, $options: 'i' } },
        { last_name: { $regex: name, $options: 'i' } },
      ],
    }));
    filter.$and = nameFilters;
    delete filter.name;
  }
  let cases = await Case.paginate(filter, options);

  cases['results'].map((item, index) => {
    cases['results'][index] = {
      ...JSON.parse(JSON.stringify(item)),
      net_amount_paid: parseFloat(
        item.total_amount_paid + item.total_gst_paid,
      ).toFixed(2),
    };
  });

  return cases;
};

const queryCaseDetailsById = async (_id) => {
  if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide valid Case ID.');
  }

  let caseDetails = await Case.findById(_id);

  if (!caseDetails) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'No details found for the given ID',
    );
  }

  // If assigned_to is not null, fetch agent details
  if (caseDetails.assigned_to) {
    const agentDetails = await User.findOne({ _id: caseDetails.assigned_to });
    caseDetails['assigned_to'] = agentDetails ? agentDetails.toObject() : null;
  }

  // If slot_id is not null, fetch slot details
  if (caseDetails.slot_id) {
    const slotDetails = await TimeSlot.findOne({ _id: caseDetails.slot_id });
    caseDetails['slot_id'] = slotDetails ? slotDetails.toObject() : null;
  }

  let totalOutstandingSum = 0;
  let amountPaidSum = 0;

  totalOutstandingSum = parseFloat(caseDetails.total_outstanding).toFixed(2);
  amountPaidSum = parseFloat(caseDetails.total_amount_paid).toFixed(2);

  // Fetch the latest updatedAt from ActivityLog for the given case id and eventType "payment" or "visit"
  const latestActivityLog = await ActivityLog.find({
    case_id: caseDetails.coll_id,
    eventType: { $in: ['payment', 'visit'] },
  })
    .sort({ updatedAt: -1 })
    .limit(1);

  const lastVisitAt =
    latestActivityLog.length > 0 ? latestActivityLog[0].updatedAt : null;
  caseDetails = {
    ...JSON.parse(JSON.stringify(caseDetails)),
    totalOutstandingSum: totalOutstandingSum,
    amountPaidSum: amountPaidSum,
    last_visit_at: lastVisitAt,
  };

  return caseDetails;
};

const assignCasesToAgent = async (data) => {
  let response = {
    success: true,
    message: '',
    data: [],
  };
  let successCount = 0;

  if (!mongoose.Types.ObjectId.isValid(data.fos_user_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid FOS user ID');
  }

  const agent = await User.findById(data.fos_user_id);
  if (!agent) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Agent not found for the given fos_user_id',
    );
  }

  if (!agent.isActive) {
    return {
      success: false,
      message: `${agent.name} is inactive`,
    };
  }

  for (let caseObj of data.cases) {
    let caseResponse = {};

    const collection = await Case.findOne({
      coll_id: caseObj.collection_id,
    }).populate('assigned_to');
    caseResponse.data = collection;
    if (!collection) {
      caseResponse.success = false;
      caseResponse.remarks =
        'No case found for the collection ID in our system';
    } else if (collection.status === 'closed') {
      caseResponse.success = false;
      caseResponse.remarks = 'Case status is closed';
    } else if (
      collection.assigned_to &&
      collection.assigned_to.toString() === data.fos_user_id
    ) {
      caseResponse.success = false;
      caseResponse.remarks = `Case already assigned to ${agent.name}`;
    } else {
      let updateCollectionData = {
        assigned_to: data.fos_user_id,
        status: statusTypes.ONGOING,
        assigned_at: new Date(),
      };

      if (collection.status === statusTypes.OPEN) {
        updateCollectionData = {
          ...updateCollectionData,
          deposition_status: depositionStatusTypes.VISIT_PENDING,
        };
      }

      caseResponse.data = await Case.findOneAndUpdate(
        { coll_id: collection.coll_id },
        {
          $set: updateCollectionData,
        },
        { new: true },
      ).populate('assigned_to');
      const log = {
        event_type: activityTypes.VISIT,
        fos_id: data.fos_user_id,
        lms_id: collection.lms_id,
        case_id: collection.coll_id,
        manager_id: agent.manager_id,
        status: statusTypes.ONGOING,
        description: `Agent assigned for Case ${
          collection.coll_id
        } on date ${formatDate(
          new Date(),
          'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ',
        )} by manager ${agent.manager_id}`,
      };

      await createLog(log);

      caseResponse.success = true;
      caseResponse.remarks = collection.assigned_to
        ? 'Collection case re-assigned successfully'
        : 'Collection case assigned successfully';
      successCount++;
    }

    response.data.push(caseResponse);
  }

  if (successCount === data.cases.length) {
    response.message = `${agent.name} has been assigned ${successCount} ${
      successCount > 1 ? 'cases' : 'case'
    }`;
  } else if (successCount == 0) {
    response.success = false;
    response.message = `${agent.name} has been not been assigned any cases`;
  } else {
    response.message = `${agent.name} has been assigned ${successCount} ${
      successCount > 1 ? 'cases' : 'case'
    } out of ${data.cases.length} cases`;
  }

  return response;
};

/**
 * Method to fetch all companies having collection cases
 * @returns
 */
const queryCaseCompanies = async () => {
  let companies = await Case.aggregate([
    {
      $group: {
        _id: null,
        uniqueCompanies: {
          $addToSet: {
            company_code: '$company_code',
            company_name: '$company_name',
          },
        },
      },
    },
    { $unwind: '$uniqueCompanies' },
    { $replaceRoot: { newRoot: '$uniqueCompanies' } },
  ]);

  return companies;
};

/**
 * Method to fetch unique fos agents list having cases assigned
 * @returns
 */
const queryCasesAssigned = async () => {
  let uniqueFosAgents = await Case.aggregate([
    {
      $group: {
        _id: '$assigned_to',
      },
    },
    {
      $lookup: {
        from: 'coll_users',
        localField: '_id',
        foreignField: '_id',
        as: 'assignedUser',
      },
    },
    {
      $unwind: '$assignedUser',
    },
    {
      $project: {
        _id: '$assignedUser._id',
        name: '$assignedUser.name',
      },
    },
  ]);

  return uniqueFosAgents;
};

/**
 * Get specific fields from coll_details by ID
 * @param {string} id - The ID of the document to retrieve
 * @param {Array} selectedFields - An array of field names to select
 * @returns {Promise<Object>}
 */
const getCaseCollById = async (id, selectedFields) => {
  try {
    let collDetails = await Case.findById(id)
      .select(selectedFields.join(' '))
      .populate('assigned_to', 'name');
    return collDetails;
  } catch (error) {
    throw error;
  }
};

/**
 * Get history of coll_ID
 * @param {string} collId - The ID of the document to retrieve
 * @returns {Promise<Object>}
 */
const getCaselHistoryByCollId = async (collId, queryFilter, options) => {
  const checkCollId = await Case.findOne({ coll_id: collId });

  if (!checkCollId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid Case ID');
  }

  let filter = {
    case_id: collId,
  };

  if (queryFilter.type) {
    if (queryFilter.type == 'visit') {
      filter = {
        ...filter,
        eventType: {
          $ne: 'payment',
        },
      };
    } else if (queryFilter.type == 'payment') {
      filter = {
        ...filter,
        eventType: 'payment',
      };
    } else {
      throw new ApiError(httpStatus.NOT_FOUND, `Invalid filter 'type'`);
    }
  }

  let collHistoryDetails = await ActivityLog.paginate(filter, options); // Sort in descending order

  return collHistoryDetails;
};

const fetchUniqueLMSId = async (query) => {
  const searchPattern = query.pattern ? query.pattern : '';
  const regexPattern = new RegExp(searchPattern);
  let uniqueLMSId = await Case.distinct('lms_id', {
    lms_id: { $regex: regexPattern },
  });
  uniqueLMSId = uniqueLMSId.map((item) => {
    return { lms_id: item };
  });
  return uniqueLMSId;
};

/**
 * Fetch Unique Collection IDs from array of LMS IDs
 * @param {*} lmsIdArray
 * @param {*} status
 * @returns
 */
const fetchCollIdsFromLmsIds = async (lmsIdArray, status) => {
  let filter = {
    status: {
      $in: Object.values(statusTypes),
    },
  };

  if (status) {
    filter = {
      ...filter,
      status: status,
    };
  }

  lmsIdArray = !Array.isArray(lmsIdArray) ? [lmsIdArray] : lmsIdArray;

  filter = {
    ...filter,
    lms_id: { $in: lmsIdArray },
  };
  const collIds = await Case.distinct('coll_id', filter);

  return collIds;
};

/**
 * Fetch Cases from Collection IDs
 * @param {*} collIdArray
 * @param {*} options
 * @param {*} status
 * @returns
 */
const queryFetchCasesFromCollIds = async (collIdArray, options, status) => {
  let filter = {
    status: {
      $in: Object.values(statusTypes),
    },
  };

  if (status) {
    filter = {
      ...filter,
      status: status,
    };
  }

  collIdArray = !Array.isArray(collIdArray) ? [collIdArray] : collIdArray;

  filter = {
    ...filter,
    coll_id: { $in: collIdArray },
  };
  const collIds = await Case.paginate(filter, options);

  return collIds;
};

const getCasePaymentHistoryService = async (case_id) => {
  try {
    let paymentData = await Payment.find({ caseId: case_id }).populate(
      'updatedBy',
      'name',
    );
    return paymentData;
  } catch (error) {
    throw error;
  }
};

const deassignCases = async (data, managerID) => {
  let response = {
    success: true,
    message: '',
    data: [],
  };
  let deassignedCount = 0;

  for (let caseObj of data.cases) {
    let caseResponse = {};

    const collection = await Case.findOne({
      coll_id: caseObj.collection_id,
      status: statusTypes.ONGOING,
      deposition_status: {
        $in: [
          depositionStatusTypes.VISIT_SCHEDULED,
          depositionStatusTypes.VISIT_PENDING,
        ],
      },
    });

    if (!collection) {
      caseResponse.success = false;
      caseResponse.collection_id = caseObj.collection_id;
      caseResponse.remarks = `Case must exist with status as ${statusTypes.ONGOING} and deposition status as ${depositionStatusTypes.VISIT_SCHEDULED} or ${depositionStatusTypes.VISIT_PENDING}`;
    } else {
      // Update collection data for de-assignment
      let updateCollectionData = {
        assigned_at: null,
        assigned_to: null,
        scheduled_at: null,
        status: statusTypes.OPEN,
        deposition_status: depositionStatusTypes.VISIT_PENDING,
      };

      const updatedCollection = await Case.findOneAndUpdate(
        { coll_id: collection.coll_id },
        {
          $set: updateCollectionData,
        },
        { new: true },
      );

      caseResponse.success = true;
      caseResponse.collection_id = caseObj.collection_id;
      caseResponse.remarks = `Case ${collection.coll_id} de-assigned successfully`;
      deassignedCount++;

      // Create log for de-assignment
      const log = {
        event_type: activityTypes.ADMIN_OPS,
        fos_id: collection.assigned_to,
        lms_id: collection.lms_id,
        case_id: collection.coll_id,
        status: updatedCollection.status,
        manager_id: managerID,
        description: `Case ${
          collection.coll_id
        } de-assigned on date ${formatDate(
          new Date(),
          'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ',
        )} by admin`,
      };

      await createLog(log);
    }

    response.data.push(caseResponse);
  }

  response.message = `${deassignedCount}/${data.cases.length} cases has been de-assigned from agents`;

  return response;
};

module.exports = {
  queryCases,
  queryCaseDetailsById,
  assignCasesToAgent,
  queryCaseCompanies,
  queryCasesAssigned,
  getCaseCollById,
  getCaselHistoryByCollId,
  fetchUniqueLMSId,
  fetchCollIdsFromLmsIds,
  getCasePaymentHistoryService,
  queryFetchCasesFromCollIds,
  deassignCases,
};

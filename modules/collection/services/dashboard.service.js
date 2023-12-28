const httpStatus = require('http-status');
const { User, Case } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const { statusTypes, depositionStatusTypes } = require('../config/collection');
const { ObjectId } = require('mongodb');
const moment = require('moment');

/**
 * Method to fetch count of closed cases for today,this week, this month, this year
 * @returns Object
 */
const queryCaseSolvedSummary = async () => {
  // Get the current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the current date
  const endToday = new Date();
  endToday.setHours(23, 59, 29, 999);

  // Calculate the start and end of the current week (Sunday to Saturday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Calculate the start and end of the previous week
  const startOfPreviousWeek = new Date(startOfWeek);
  startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
  const endOfPreviousWeek = new Date(endOfWeek);
  endOfPreviousWeek.setDate(endOfWeek.getDate() - 7);

  // Calculate the start and end of the current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Execute the find queries and count the documents
  const result = await Case.aggregate([
    {
      $match: {
        status: statusTypes['CLOSED'],
      },
    },
    {
      $facet: {
        today: [
          {
            $match: {
              updated_at: { $gte: today, $lte: endToday },
            },
          },
          {
            $count: 'total_case_in_today',
          },
        ],
        week: [
          {
            $match: {
              updated_at: { $gte: startOfWeek, $lte: endOfWeek },
            },
          },
          {
            $count: 'total_case_in_week',
          },
        ],
        previousWeek: [
          {
            $match: {
              updated_at: {
                $gte: startOfPreviousWeek,
                $lte: endOfPreviousWeek,
              },
            },
          },
          {
            $count: 'total_case_in_previous_week',
          },
        ],
        month: [
          {
            $match: {
              updated_at: { $gte: startOfMonth, $lte: endOfMonth },
            },
          },
          {
            $count: 'total_case_in_month',
          },
        ],
      },
    },
    {
      $project: {
        today: { $arrayElemAt: ['$today', 0] },
        week: { $arrayElemAt: ['$week', 0] },
        previousWeek: { $arrayElemAt: ['$previousWeek', 0] },
        month: { $arrayElemAt: ['$month', 0] },
      },
    },
    {
      $addFields: {
        today: { $ifNull: ['$today.total_case_in_today', 0] },
        week: { $ifNull: ['$week.total_case_in_week', 0] },
        previousWeek: {
          $ifNull: ['$previousWeek.total_case_in_previous_week', 0],
        },
        month: { $ifNull: ['$month.total_case_in_month', 0] },
      },
    },
  ]);

  return result[0];
};

/**
 *
 * @param {*} query
 */
const queryDashboardSummary = async (queryFilter = {}, options = {}) => {
  let response = {};
  let filter = {};

  if (queryFilter['assigned_start_date'] && queryFilter['assigned_end_date']) {
    const startDate = new Date(
      new Date(queryFilter['assigned_start_date']).setHours(0, 0, 0, 0),
    );
    const endDate = new Date(
      new Date(queryFilter['assigned_end_date']).setHours(23, 59, 59, 999),
    );
    filter = {
      assigned_at: {
        $gte: startDate, // Replace with your start date
        $lte: endDate, // Replace with your end date
      },
    };
  }

  if (queryFilter['fosAgent']) {
    filter = {
      ...filter,
      assigned_to: ObjectId(queryFilter['fosAgent']),
    };
  }

  if (queryFilter['company_code']) {
    filter = {
      ...filter,
      company_code: queryFilter['company_code'],
    };
  }

  let cases = await Case.aggregatePaginate(
    [
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            assigned_to: '$assigned_to',
            status: '$status',
          },
          total_outstanding: { $sum: { $toDouble: '$total_outstanding' } },
          total_amount_paid: { $sum: { $toDouble: '$total_amount_paid' } },
          count: { $sum: 1 },
          total_schedule_visit: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    '$deposition_status',
                    depositionStatusTypes['VISIT_SCHEDULED'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'coll_users',
          localField: '_id.assigned_to',
          foreignField: '_id',
          as: 'assigned_to',
        },
      },
      {
        $unwind: '$assigned_to',
      },
      {
        $group: {
          _id: '$_id.assigned_to',
          name: { $first: '$assigned_to.name' },
          status: {
            $push: {
              k: '$_id.status',
              v: {
                total_outstanding: '$total_outstanding',
                total_amount_paid: '$total_amount_paid',
                count: '$count',
                assigned_to: '$_id.assigned_to',
                total_schedule_visit: '$total_schedule_visit',
              },
            },
          },
        },
      },
      {
        $project: {
          assigned_to: '$_id',
          name: 1,
          status: { $arrayToObject: '$status' },
          _id: 0,
        },
      },
    ],
    options,
  );

  var tempFos = [];
  var tempCaseSolved = await queryCaseSolvedSummary();

  cases['results'].map((item) => {
    var totalCaseAllocated = 0;
    var totalCaseSolved = 0;
    var totalCasePending = 0;
    var totalAmountCollected = 0;
    var totalAmountPending = 0;
    var totalScheduledVisit = 0;

    var status = item['status'];
    for (let type in status) {
      if (type == statusTypes['ONGOING']) {
        totalCaseAllocated =
          totalCaseAllocated + status[statusTypes['ONGOING']].count;
        totalCasePending =
          totalCasePending + status[statusTypes['ONGOING']].count;
        totalAmountCollected =
          totalAmountCollected +
          status[statusTypes['ONGOING']].total_amount_paid;
        totalAmountPending =
          totalAmountPending + status[statusTypes['ONGOING']].total_outstanding;
        totalScheduledVisit =
          totalScheduledVisit +
          status[statusTypes['ONGOING']].total_schedule_visit;
      } else if (type == statusTypes['CLOSED']) {
        totalCaseAllocated =
          totalCaseAllocated + status[statusTypes['CLOSED']].count;
        totalCaseSolved = totalCaseSolved + status[statusTypes['CLOSED']].count;
        totalAmountCollected =
          totalAmountCollected +
          status[statusTypes['CLOSED']].total_amount_paid;
        totalAmountPending =
          totalAmountPending + status[statusTypes['CLOSED']].total_outstanding;
        totalScheduledVisit =
          totalScheduledVisit +
          status[statusTypes['CLOSED']].total_schedule_visit;
      }
    }

    tempFos.push({
      fos_name: item.name,
      fos_id: item.assigned_to,
      total_case_allocated: totalCaseAllocated,
      total_case_solved: totalCaseSolved,
      total_case_pending: totalCasePending,
      total_amount_collected: totalAmountCollected,
      total_amount_pending: totalAmountPending,
      total_scheduled_visit: totalScheduledVisit,
    });
  });

  delete cases['results'];

  response = {
    case_solved: tempCaseSolved,
    fos: {
      ...cases,
      data: tempFos,
    },
  };

  return response;
};

const getDepositionStatusPercentages = async (query) => {
  const companyCode = query.company_code;

  let filters = {
    status: {
      $in: [statusTypes.OPEN,statusTypes.ONGOING]
    }
  };

  if (query.start_date && query.end_date) {
    const endDate = new Date(
      new Date(query.end_date).setHours(23, 59, 59, 999),
    );
    const startDate = new Date(new Date(query.start_date).setHours(0, 0, 0, 0));

    filters = {
      ...filters,
      assigned_at: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  }

  if (companyCode) {
    filters = {
      ...filters,
      company_code: companyCode,
    };
  }

  let pipeline = [];

  if (Object.keys(filters).length != 0) {
    pipeline.push({
      $match: filters,
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$deposition_status',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        deposition_status: '$_id',
        count: 1,
      },
    },
  );

  const result = await Case.aggregate(pipeline);

  const totalCases = result.reduce((total, statusData) => {
    return total + statusData.count;
  }, 0);

  const percentages = {};

  result.forEach((statusData) => {
    const percentage = ((statusData.count / totalCases) * 100).toFixed(2);
    percentages[statusData.deposition_status] = parseFloat(percentage);
  });

  const data = {
    deposition_data: percentages,
    total_cases: totalCases,
  };

  if (companyCode) {
    data.company_code = companyCode;
  }

  return data;
};

const dashboardOverview = async (query) => {
  let aggregatePipeline = [
    {
      $match: {
        status: { $ne: statusTypes.OPEN },
      },
    },
    {
      $group: {
        _id: null,
        unpaidAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', statusTypes['ONGOING']] },
                  { $eq: ['$total_amount_paid', 0] },
                ],
              },
              {
                $toDouble: '$total_outstanding',
              },
              0,
            ],
          },
        },
        partialPaidAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', statusTypes['ONGOING']] },
                  { $gt: ['$total_amount_paid', 0] },
                ],
              },
              {
                $toDouble: '$total_amount_paid',
              },
              0,
            ],
          },
        },
        partialUnpaidAmount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', statusTypes['ONGOING']] },
                  { $gt: ['$total_amount_paid', 0] },
                ],
              },
              {
                $toDouble: '$total_outstanding',
              },
              0,
            ],
          },
        },
        fullyRecoveredAmount: {
          $sum: {
            $cond: [
              {
                $eq: ['$status', statusTypes.CLOSED],
              },
              {
                $toDouble: '$total_amount_paid',
              },
              0,
            ],
          },
        },
        totalCasesUnpaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', statusTypes['ONGOING']] },
                  { $eq: ['$total_amount_paid', 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalCasesPartialPaid: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', statusTypes['ONGOING']] },
                  { $gt: ['$total_amount_paid', 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalCasesFullyRecovered: {
          $sum: {
            $cond: [{ $eq: ['$status', statusTypes.CLOSED] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        unpaidAmount: 1,
        partialPaidAmount: 1,
        partialUnpaidAmount: 1,
        fullyRecoveredAmount: 1,
        allocation: {
          $add: [
            '$unpaidAmount',
            '$partialPaidAmount',
            '$partialUnpaidAmount',
            '$fullyRecoveredAmount',
          ],
        },
        totalCasesUnpaid: 1,
        totalCasesPartialPaid: 1,
        totalCasesFullyRecovered: 1,
      },
    },
  ];

  if (query.company_code) {
    aggregatePipeline[0]['$match'].company_code = query.company_code;
  }

  if (query.start_date && query.end_date) {
    const endDate = new Date(
      new Date(query.end_date).setHours(23, 59, 59, 999),
    );
    const startDate = new Date(new Date(query.start_date).setHours(0, 0, 0, 0));
    aggregatePipeline[0]['$match'].assigned_at = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  const overview = await Case.aggregate(aggregatePipeline);

  let result = {
    unpaidAmount: 0,
    partialPaidAmount: 0,
    partialUnpaidAmount: 0,
    fullyRecoveredAmount: 0,
    totalCasesUnpaid: 0,
    totalCasesPartialPaid: 0,
    totalCasesFullyRecovered: 0,
    allocation: 0,
  };

  result = { ...result, ...overview[0] };

  return result;
};

module.exports = {
  queryDashboardSummary,
  getDepositionStatusPercentages,
  dashboardOverview,
};

const catchAsync = require('../utils/catchAsync');
const { caseService } = require('../services');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { TimeSlot } = require('../models');
const pick = require('../utils/pick');

const getCases = catchAsync(async (req, res) => {
  const result = await caseService.queryCases(req.query);
  res.status(httpStatus.OK).send(result);
});

const getCaseDetailsById = catchAsync(async (req, res) => {
  const id = req.params.caseID;
  const result = await caseService.queryCaseDetailsById(id);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Case details fetched successfully.',
    data: result,
  });
});

const assignCases = catchAsync(async (req, res) => {
  const result = await caseService.assignCasesToAgent(req.body);
  return res.status(httpStatus.OK).send(result);
});

const getCaseCompanies = catchAsync(async (req, res) => {
  const result = await caseService.queryCaseCompanies();
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Cases related Companies details fetched successfully.',
    data: result,
  });
});

const getFosListAssignedCases = catchAsync(async (req, res) => {
  const result = await caseService.queryCasesAssigned();
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'FOS users list fetched successfully for assigned cases.',
    data: result,
  });
});

const getCaseCollHistoryById = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  const id = req.params.collID;
  
  let collHistoryDetails = await caseService.getCaselHistoryByCollId(id,filter,options);

  if (!collHistoryDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coll_details not found');
  }

  var renamedCollHistoryDetails = [];

  // Rename the 'createdAt' field to 'date' in the results
  for (let doc of collHistoryDetails['results']) {
    let data = {
      ...JSON.parse(JSON.stringify(doc)),
      date: doc.createdAt,
      user: doc.user ? doc.user.name : null,
    };

    if (doc.slot_id) {
      const timeSlot = await TimeSlot.findById(doc.slot_id);

      if (timeSlot) {
        data['timeSlot'] = timeSlot;
        delete data['slot_id'];
      }
    }
     if (doc.part_amount && doc.left_amount) {
      data['total_amount'] = doc.part_amount + doc.left_amount;
    }
    renamedCollHistoryDetails.push(data);
  }

  collHistoryDetails['results']= renamedCollHistoryDetails;

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Collection history data fetched successfully.',
    data: collHistoryDetails,
  });
});

const getUniqueLMSId = catchAsync(async (req, res) => {
  const result = await caseService.fetchUniqueLMSId(req.query);
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Fetched all the unique LMS ID successfully',
    data: result,
  });
});

//case payment history
const getCasePaymentHistory = catchAsync(async (req, res) => {
  const case_id = req.params.case_id
  const result = await caseService.getCasePaymentHistoryService(case_id);
  if(!result){
    return res.status(400).send({
      success: false,
      message: 'Case payment data Failed',
      data: {},
    });
  }
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Case Payment Data',
    data: result,
  });
});

const getCollIdByLmsIds = catchAsync(async (req, res) => {
  const cases= req.body.cases;
  const status= req.body.status;

  let lmsIds=[];
  cases.forEach(element => {
    lmsIds.push(element.lms_id);
  });

  const result = await caseService.fetchCollIdsFromLmsIds(lmsIds,status);
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Fetched all the Coll IDs successfully',
    data: result,
  });
});

const getCasesByCollId = catchAsync(async (req, res) => {
  const cases = req.body.cases;
  const status= req.body.status;
  let collIds=[];
  
  cases.forEach(element => {
    collIds.push(element.collection_id);
  });

  const options = pick(req.body, ['sortBy', 'limit', 'page', 'populate']);

  const result = await caseService.queryFetchCasesFromCollIds(collIds,options,status);
  return res.status(httpStatus.OK).send({
    success: true,
    message: 'Fetched all the selected cases successfully',
    data: result,
  });

});

const deassignCases = catchAsync(async (req, res) => {
  const result = await caseService.deassignCases(req.body, req.authData.user_id);
  return res.status(httpStatus.OK).send(result);
});

module.exports = {
  getCases,
  getCaseDetailsById,
  assignCases,
  getCaseCompanies,
  getFosListAssignedCases,
  getCaseCollHistoryById,
  getUniqueLMSId,
  getCasePaymentHistory,
  getCollIdByLmsIds,
  getCasesByCollId,
  deassignCases
};

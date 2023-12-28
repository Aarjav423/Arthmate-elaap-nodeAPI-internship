const jwt = require('../../../util/jwt');
const { LeadController, LeadListController, LeadExportController, LeadDetailsController, LeadReviewDetailsController, EditDraftLeadController, LeadStatusController, FetchLeadSectionController, FetchGSTLeadSectionController, LeadSectionStausUpdateController, FetchLeadSubmissionController, FetchLeadDocumentsController, FetchOfferDetailsController, CreateOfferDetailsController, SectionStatusController, CamsDetailController, LeadRiskDeriveController, UpdateOfferDeviationController, OkycController,AadharOtpController, AadhaarCheckController,SubsectionDeleteController } = require('../controllers');
const { msmeRoute } = require('../../../constants/common-api-routes');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get(`${msmeRoute}/lead`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const leadListController = LeadListController.create(request, response);
    await leadListController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const leadDetailsController = LeadDetailsController.create(request, response);
    await leadDetailsController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/:loan_app_id/review`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const leadReviewDetailsController = LeadReviewDetailsController.create(request, response);
    await leadReviewDetailsController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/lead/export`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const leadExportController = LeadExportController.create(request, response);
    await leadExportController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/lead`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, async (request, response) => {
    const leadController = LeadController.create(request, response);
    await leadController.leadCreate();
  });

  app.patch(`${msmeRoute}/lead/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const leadController = LeadController.create(request, response);
    await leadController.updateLead();
  });

  app.post(`${msmeRoute}/lead/gstin/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const fetchGSTLeadSectionController = FetchGSTLeadSectionController.create(request, response);
    await fetchGSTLeadSectionController.executeAndHandleErrors();
  });

  app.put(`${msmeRoute}/lead/:loanAppId/draft/`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const editDraftLeadController = EditDraftLeadController.create(request, response);
    await editDraftLeadController.executeAndHandleErrors();
  });

  app.put(`${msmeRoute}/lead/:loan_app_id/status_update/:status`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const leadStatusController = LeadStatusController.create(request, response);
    await leadStatusController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/:loan_app_id/section/`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const fetchLeadSectionController = FetchLeadSectionController.create(request, response);
    await fetchLeadSectionController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/submission-status/:loan_app_id/code/:code/sequence/:sequence/`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const fetchLeadSubmissionController = FetchLeadSubmissionController.create(request, response);
    await fetchLeadSubmissionController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/lead/:loan_app_id/section`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const leadSectionStausUpdateController = LeadSectionStausUpdateController.create(request, response);
    await leadSectionStausUpdateController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/:loan_app_id/document`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const fetchLeadDocumentsController = FetchLeadDocumentsController.create(request, response);
    await fetchLeadDocumentsController.executeAndHandleErrors();
  });

  app.get(`${msmeRoute}/lead/:loan_app_id/offer`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const fetchOfferDetailsController = FetchOfferDetailsController.create(request, response);
    await fetchOfferDetailsController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/lead/:loan_app_id/offer`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const createOfferDetailsController = CreateOfferDetailsController.create(request, response);
    await createOfferDetailsController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/lead/dervie_offer_status`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const leadRiskDeriveController = LeadRiskDeriveController.create(request, response);
    await leadRiskDeriveController.executeAndHandleErrors();
  });

  app.put(`${msmeRoute}/lead/:loan_app_id/update-offer-deviation`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const updateOfferDeviationController = UpdateOfferDeviationController.create(request, response);
    await updateOfferDeviationController.executeAndHandleErrors();
  });


  app.get(`${msmeRoute}/leads/section-status/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const sectionStatusController = SectionStatusController.create(request, response);
    await sectionStatusController.getSectionStatusByID();
  });

  app.get(`${msmeRoute}/leads/cams/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const camsController = CamsDetailController.create(request, response);
    await camsController.getCamsDetails();
  });

  app.patch(`${msmeRoute}/leads/cams/:loan_app_id`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const camsController = CamsDetailController.create(request, response);
    await camsController.updateCamsDetails();
  });

  app.post(`${msmeRoute}/leads/okyc`, jwt.verifyToken, jwt.verifyUser, jwt.verifyCompany, jwt.verifyProduct, async (request, response) => {
    const okycController = OkycController.create(request, response);
    await okycController.executeAndHandleErrors();
  });

  app.post(`${msmeRoute}/leads/okyc-aadhar-otp`,jwt.verifyToken,jwt.verifyUser,jwt.verifyCompany,jwt.verifyProduct,async (request, response) => {
    const aadharOtpController = AadharOtpController.create(request, response);
    await aadharOtpController.executeAndHandleErrors();
  })

  app.post(`${msmeRoute}/leads/aadhaarCheck`,jwt.verifyToken,jwt.verifyUser,jwt.verifyCompany,jwt.verifyProduct,async (request, response) => {
    const aadhaarCheckController = AadhaarCheckController.create(request, response);
    await aadhaarCheckController.executeAndHandleErrors();
  })

  app.delete(`${msmeRoute}/lead/:loan_app_id/section/:section_sequence_no/subsection/:sub_section_code`, jwt.verifyToken, jwt.verifyUser, async (request, response) => {
    const subsectionDeleteController = SubsectionDeleteController.create(request, response);
    await subsectionDeleteController.executeAndHandleErrors();
  });
};

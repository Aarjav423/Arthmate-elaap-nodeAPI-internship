const SectionSchema = require('../../models/sectionStatus.model');
const { BaseController, BaseService } = require('../../common');

class SectionStatusController extends BaseController {
  constructor(request, response) {
    super(request, response);
  }

  static create(request, response) {
    let sectionStatusController = new SectionStatusController(
      request,
      response,
    );
    return sectionStatusController;
  }

  // @desc Get Section
  // @route GET /api/msme/lead/section-status/:loan_app_id
  // @access Private

  getSectionStatusByID = async () => {
    console.log(this.request.params.loan_app_id);
    const loan_app_id = this.request.params.loan_app_id;
    const sectionByID = await SectionSchema.find({
      loan_app_id: loan_app_id,
    });
    this.response.status(200).json(sectionByID);
  };
}

module.exports = SectionStatusController;

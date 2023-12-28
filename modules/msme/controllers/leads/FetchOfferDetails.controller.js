const { param, validationResult } = require('express-validator');

const { OfferDetailService } = require('../../services');
const { BaseController } = require('../../common');

class FetchOfferDetailsController extends BaseController {
  constructor(request, response, offerDetailService) {
    super(request, response);
    this.offerDetailService = offerDetailService;
  }

  async validate() {
    await Promise.all([
      param('loan_app_id')
        .exists()
        .withMessage('loan_app_id is required')
        .isString()
        .withMessage('loan_app_id must be a string')
        .notEmpty()
        .withMessage('loan_app_id cannot be empty'),
    ]);

    const errors = validationResult(this.request);

    if (!errors.isEmpty()) {
      throw { errors: errors.array() };
    }
  }

  async execute() {
    try {
      await this.validate();
      const { loan_app_id } = this.request.params;

      const offerDetails = await this.offerDetailService.findOne({
        loan_app_id,
      });

      if (!offerDetails) {
        throw {
          success: false,
          message: "Offer-details doesn't exist for this loan_app_id.",
        };
      }
      return {
        data: offerDetails,
        message: 'Offer details fetched successfully.',
      };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let fetchOfferDetailsController = new FetchOfferDetailsController(
      request,
      response,
      new OfferDetailService(),
    );
    return fetchOfferDetailsController;
  }
}

module.exports = FetchOfferDetailsController;

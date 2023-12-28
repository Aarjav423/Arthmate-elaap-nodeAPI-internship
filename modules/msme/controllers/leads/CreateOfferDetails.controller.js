const { param, validationResult } = require('express-validator');

const { OfferDetailService } = require('../../services');
const { BaseController } = require('../../common');

class CreateOfferDetailsController extends BaseController {
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

      const offerDetails = await this.offerDetailService.create({
        loan_app_id,
        ...this.request.body,
      });

      if (!offerDetails) {
        throw {
          success: false,
          message: "Offer-details creation failed.",
        };
      }
      return {
        data: offerDetails,
        message: 'Offer details created successfully.',
      };
    } catch (error) {
      throw error;
    }
  }

  static create(request, response) {
    let createOfferDetailsController = new CreateOfferDetailsController(
      request,
      response,
      new OfferDetailService(),
    );
    return createOfferDetailsController;
  }
}

module.exports = CreateOfferDetailsController;

const { BaseService } = require('../common');
const { OfferDetails } = require('../models');

class OfferAmendService extends BaseService {
  constructor() {
    super(OfferDetails);
  }
  //update offer details
  updateofferByLAid = async (loanAppId, data) => {
    try {
      // Fetch the existing document
      let existingDocument = await this.model.findOne({ loan_app_id: loanAppId });

      if (!existingDocument) {
        return this.model.create({ loan_app_id: loanAppId, ...data });
      }
      // Move the root object to the offer_detail_history array
      const rootData={
          offered_amount:existingDocument.offered_amount,
          offered_int_rate:existingDocument.offered_int_rate,
          tenure:existingDocument.tenure,
      }
      existingDocument.offer_detail_history.push(rootData);

      // Add the current data to the root
      existingDocument.set(data);
      // Save the updated document
      const updatedDocument = await existingDocument.save();

      return updatedDocument;
    } catch (error) {
      throw error;
    }
  };
}

module.exports = OfferAmendService;

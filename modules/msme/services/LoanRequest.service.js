const { BaseService } = require('../common');
const { LoanRequest } = require('../models');

class LoanRequestService extends BaseService {
  constructor() {
    super(LoanRequest);
  }

  fetchLeadsList = async (query) => {
    let loanRequests = await this.findWithPagination(query);
    return loanRequests;
  };

  fetchLeadDetails = async (loanAppId) => {
    return await this.model.aggregate([
      {
        $match: {
          loan_app_id: loanAppId,
        },
      },
    ]);
  };

  exportData = async (filter) => {
    var query = {};
    const {
      company_id,
      product_id,
      from_date,
      to_date,
      str,
      book_entity_id,
      status,
    } = filter;
    const isPagination = filter.hasOwnProperty('pagination');
    let page = 0;
    let limit = 1;
    if (isPagination) {
      page = filter.pagination.page;
      limit = filter.pagination.limit;
    }
    if (company_id) {
      query['$and'] = [];
      query['$and'].push({
        company_id,
      });
    }
    if (status)
      query['$and'].push({
        status,
      });
    if (product_id)
      query['$and'].push({
        product_id,
      });
    if (book_entity_id)
      query['$and'].push({
        book_entity_id,
      });
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
    if (str !== '' && str !== null && str !== 'null' && str !== undefined) {
      query['$and'].push({
        $or: [
          {
            loan_app_id: {
              $regex: str,
              $options: 'i',
            },
          },
          {
            partner_loan_app_id: {
              $regex: str,
              $options: 'i',
            },
          },
          {
            loan_id: {
              $regex: str,
              $options: 'i',
            },
          },
        ],
      });
    }
    if (isPagination) {
      return this.model
        .find(query)
        .sort({ created_at: -1 })
        .skip(filter.pagination.page * filter.pagination.limit)
        .limit(filter.pagination.limit);
    } else {
      return this.model
        .find(query)
        .limit(Number(process.env.EXPORT_DOWNLOAD_LIMIT));
    }
  };

  addLoanRequest = async (data) => {
    return await this.model.addLoanRequest(data);
  };

  getByLoanAppId = async (loanAppId) => {
    return await this.model.findByLId(loanAppId);
  };

  updateByLoanAppId = async (loanAppId, data) => {
    return await this.model.updateByLAid(data, loanAppId);
  };

  updateCoBorrowerByLAid = async (loanAppId, data) => {
    if (data._id && data.delete) {
      return await this.model.updateOne(
        { loan_app_id: loanAppId },
        { $pull: { coborrower: {_id: data._id } } },
        {
          new: true,
        },
      );
    }
    if (data._id) {
      let payload = {};
      for (const key of Object.keys(data)) {
        payload[`coborrower.$.${key}`] = data[key];
      }
      return await this.model.updateOne(
        { loan_app_id: loanAppId, 'coborrower._id': data._id },
        { $set: payload },
        {
          new: true,
        },
      );
    }
    return await this.model.updateOne(
      { loan_app_id: loanAppId },
      { $push: { coborrower: data } },
      {
        new: true,
      },
    );
  };

  updateGuarantorByLAid = async (loanAppId, data) => {
    if (data._id && data.delete) {
      return await this.model.updateOne(
        { loan_app_id: loanAppId },
        { $pull: { guarantor: {_id: data._id } } },
        {
          new: true,
        },
      );
    }
    if (data._id) {
      let payload = {};
      for (const key of Object.keys(data)) {
        payload[`guarantor.$.${key}`] = data[key];
      }
      return await this.model.updateOne(
        { loan_app_id: loanAppId, 'guarantor._id': data._id },
        { $set: payload },
        {
          new: true,
        },
      );
    }
    return await this.model.updateOne(
      { loan_app_id: loanAppId },
      { $push: { guarantor: data } },
      {
        new: true,
      },
    );
  };

  fetchLeadByLoanAppId = async (loanAppId) => {
    let loanRequests = await this.model.find({loan_app_id: loanAppId});
    return loanRequests;
  };

  findLeadByFilter = async (pan, companyId) => {
    return await this.model.find({
      company_id: Number(companyId),
      appl_pan: pan,
      is_deleted: { $ne: 1},
    }) 
  }

  updateXMLROW = async(data) => {
    const query = {
      loan_app_id: data.loan_app_id,
    };
    delete data.loan_app_id;
    return this.model.findOneAndUpdate(query, data, {});
  };

  findIfExists = async(loanid) => {
    return await this.model.findOne({
      loan_app_id: loanid,
    });
  };
}

module.exports = LoanRequestService;

const CashCollateralSchema = require('../../models/cash-collaterals-schema');
const jwt = require('../../util/jwt');

module.exports = (app) => {
  app.get(
    '/api/cash-collateral/:page/:limit',
    [jwt.verifyToken, jwt.verifyUser],
    async (req, res) => {
      try {
        const { page, limit } = req.params;
        const { company_id, product_id } = req.query;
        let criteria = {
          is_processed: 'N',
        };
        if (
          typeof company_id != 'undefined' &&
          typeof product_id != 'undefined'
        ) {
          criteria.company_id = parseInt(company_id);
          criteria.product_id = parseInt(product_id);
        }
        return res.status(200).send({
          success: true,
          data: await getResponseBody(criteria, page, limit),
        });
      } catch (error) {
        return res.status(400).send({
          success: false,
          message: 'Failed to get cash-collateral details',
        });
      }
    },
  );
};

const getResponseBody = async (criteria, page, limit) => {
  let response = {};
  page = parseInt(page);
  limit = parseInt(limit);
  const totalData = await CashCollateralSchema.find(criteria).count();
  const result = await CashCollateralSchema.aggregate([
    {
      $match: {
        ...criteria,
      },
    },
    {
      $lookup: {
        from: 'borrowerinfo_commons',
        localField: 'loan_id',
        foreignField: 'loan_id',
        as: 'borrowerinfo_commons',
      },
    },
    {
      $unwind: {
        path: '$borrowerinfo_commons',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        primary_disbursement_amount: 1,
        primary_net_disbursment_amount: 1,
        primary_disbursement_date: 1,
        withheld_amount: 1,
        loan_closure_date: 1,
        disbursment_channel: 1,
        loan_id: 1,
        loc_drawdown_usage_id:1,
        loc_drawdown_request_id:1,
        sanction_amount: '$borrowerinfo_commons.sanction_amount',
      },
    },
  ])
    .sort({ created_at: -1 })
    .skip(page * limit)
    .limit(limit);

  response.count = totalData;
  response.rows = result;
  return response;
};

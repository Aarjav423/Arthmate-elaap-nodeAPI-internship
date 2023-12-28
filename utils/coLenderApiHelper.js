const { re } = require('mathjs');
const s3Helper = require('../util/s3helper');

module.exports.getCoLenderReqRes = async (data) => {
  const s3_url = await s3Helper.uploadFileToS3(data.raw_data);

  const coLenerReqRes = {
    co_lender_id: data.co_lender_id,
    co_lender_shortcode: data.authData,
    api_name: data.api_name,
    req_or_res: data.req_or_res,
    status: data.status,
    raw_data: data.s3_url,
  };

  return coLenerReqRes;
};

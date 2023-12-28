const axios =  require('axios');
const { generateTokenForService } = require('../../../util/jwt');
const { findByLId } = require('../../../models/loan-request-schema');
const { documentMapping } = require('../../../util/loanedits');
const PENNY_DROP_FILE_DOC_CODE = 232;

const uploadPennyDropResponseAsLoanDoc = async (penny_drop_res = {}, loan_app_id = '',
                                                auth_data = {}) => {

  const loan = await findByLId(loan_app_id);
  if (!loan) {
    console.warn(`Skipping penny drop response file upload, loan_id ${loan_app_id} not found`);
    return;
  }
  if (!penny_drop_res) {
    console.warn(`Skipping penny drop response file upload, penny_drop_res not provided`);
    return;
  }
  if (!auth_data) {
    console.warn(`Skipping penny drop response file uploading, auth_data not provided`);
    return;
  }
  const penny_drop_res_string = JSON.stringify(penny_drop_res);
  const base64 = Buffer.from(penny_drop_res_string).toString('base64');
  const loan_doc_payload = {
    loan_app_id,
    code: PENNY_DROP_FILE_DOC_CODE,
    base64pdfencodedfile: base64,
    fileType: documentMapping[PENNY_DROP_FILE_DOC_CODE],
  };
  let token_data = { ...auth_data };
  token_data.type = 'dash';
  token_data.product_id = loan.product_id;
  delete token_data.user_id;
  const token = generateTokenForService(token_data);
  const config = {
    headers: {
      authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
  return axios.post(`${process.env.APP_URL}/api/loandocument`, loan_doc_payload, config)
    .then(() => 'Y')
    .catch(() => 'N')
}

module.exports = {
  uploadPennyDropResponseAsLoanDoc,
  PENNY_DROP_FILE_DOC_CODE,
}
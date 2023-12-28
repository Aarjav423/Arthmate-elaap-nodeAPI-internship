const validate = require('../../../util/validate-req-body.js');
const s3helper = require('../../../util/s3helper.js');

async function validateTemplateData(req) {
  //s3 url
  const s3url = req.service.file_s3_path;
  //fetch template from s3
  const jsonS3Response = await s3helper.fetchJsonFromS3(
    s3url.substring(s3url.indexOf('services')),
  );
  if (!jsonS3Response)
    throw {
      message: 'Error while finding template from s3',
    };

  const resValDataTemp = validate.validateDataWithTemplate(jsonS3Response, [
    req.body,
  ]);

  if (resValDataTemp.missingColumns.length) {
    resValDataTemp.missingColumns = resValDataTemp.missingColumns.filter(
      (x) => x.field != 'sub_company_code',
    );
  }

  if (!resValDataTemp) {
    throw {
      message: 'No records found',
      errorType: 999,
    };
  }

  if (resValDataTemp.unknownColumns.length) {
    throw {
      message: resValDataTemp.unknownColumns[0],
      errorType: 999,
    };
  }

  if (resValDataTemp.missingColumns.length) {
    throw {
      message: resValDataTemp.missingColumns[0],
      errorType: 999,
    };
  }

  if (resValDataTemp.errorRows.length) {
    throw {
      message: Object.values(resValDataTemp.exactErrorColumns[0])[0],
      errorType: 999,
    };
  }

  if (req.body.consent === 'N') {
    throw {
      errorType: 999,
      message: 'Consent was not provided',
    };
  }

  return resValDataTemp;
}

module.exports = {
  validateTemplateData,
};

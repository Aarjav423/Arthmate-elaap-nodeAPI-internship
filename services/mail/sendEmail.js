const { sendgridMail } = require('../../utils/sendgridMail');

function sendEmail(templateId, email, params, msgParams) {
  return new Promise(function (resolve, reject) {
    var now = new Date();
    params.year = now.getFullYear();
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER,
      templateId: templateId,
      dynamicTemplateData: params,
      ...msgParams,
    };
    sendgridMail(msg, resolve, reject);
  });
}

module.exports = sendEmail;

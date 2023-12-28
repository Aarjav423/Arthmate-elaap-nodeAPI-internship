const path = require('path');
const ejs = require('ejs');
const LoanRequestService = require('./LoanRequest.service');
const { getAllUsers } = require('../../../models/user-schema');
const mailService  = require('./mail/mail.service');

class EmailSendService {
  constructor() {
    this.loanRequestService = new LoanRequestService();
  }
  sendStatusChangeEmail = async (loan_app_id) => {
    const templatePath = path.join(__dirname, '..', 'templates', 'leadStatusChange.template.ejs');
    const loanRequest = await this.loanRequestService.findOne({ loan_app_id });
    let users = await getAllUsers(loanRequest.company_id);
    users = users.filter((user) => user.status);

    if (!users.length) {
      console.log('No active user for this company');
      return;
    }

    const user = users[0];

    const templateContent = await ejs.renderFile(templatePath, {
      username: user.username,
      loan_app_id: loan_app_id,
    });
    const email = process.env.MSME_STATUS_CHANGE_RECEIVER_EMAIL? process.env.MSME_STATUS_CHANGE_RECEIVER_EMAIL : user.email
    await mailService.sendMail(email, `"${loan_app_id}" status change`, templateContent, 'This is the plain text content of the email.');
  };
}

module.exports = EmailSendService;

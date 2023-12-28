const { validationResult } = require('express-validator');
const UserSchema = require('../models/user-schema.js');
const cbiProfileSchema = require('../models/cbi-loan-schema.js');
const mails = require('../services/mail/genericMails.js');
const service = require('../services/mail/mail.js');

const validatePayload = (req, res, next) => {
  try {
    //Validate payload parameters
    const error = validationResult(req);
    if (!error.isEmpty()) {
      throw {
        success: false,
        message: error.errors[0]['msg'],
      };
    }
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

//Function to validate user role for updating colender loan status
const validateUserRoleColenderStatusUpdate = async (req, res, next) => {
  try {
    //Fetch user data
    const userData = await UserSchema.findById(req.body.user_id);
    if (!userData) throw { success: false, message: 'User not found.' };
    //Validate user role
    const userRole = userData.userroles.includes('maker')
      ? 'makerRole'
      : userData.userroles.includes('checker1')
      ? 'checker1Role'
      : userData.userroles.includes('checker2')
      ? 'checker2Role'
      : '';

    let validRoleArray = ['makerRole', 'checker1Role', 'checker2Role'];
    if (!validRoleArray.includes(userRole))
      throw { success: false, message: 'Invalid user role.' };
    req.userData = userData;
    req.userRole = userRole;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};
const checkMakerCheckerRole = async (req, res, next) => {
  try {
    //Fetch user data
    //Validate user role
    let userData=req.user
    const userRole = userData.userroles.includes('maker')
      ? 'makerRole'
      : userData.userroles.includes('checker1')
      ? 'checker1Role'
      : userData.userroles.includes('checker2')
      ? 'checker2Role'
      : null;

    req.userRole = userRole;
    next();
  } catch (error) {
    console.log(error)
    return res.status(400).send(error);
  }
};

const CBILoanExist = async (req, res, next) => {
  try {
    //Validate if loan exist against loan_id
    let loanExist = await cbiProfileSchema.getByLID(req.body.loan_id);
    if (!loanExist)
      throw { success: false, message: 'Loan id does not exist.' };
    loanExist = JSON.parse(JSON.stringify(loanExist));
    req.loanExist = loanExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const validateLoanStatus = async (req, res, next) => {
  try {
    //Validate if loan exist against loan_id
    let loanExist = await cbiProfileSchema.getByLID(req.body.loan_id);
    if (!loanExist)
      throw { success: false, message: 'Loan id does not exist.' };

    if (loanExist.status == 'Approved' || loanExist.status == 'Rejected') {
      throw {
        success: false,
        message:
          'Cannot change the status as it is only in Approved or Rejected State',
      };
    }
    loanExist = JSON.parse(JSON.stringify(loanExist));
    req.loanExist = loanExist;
    next();
  } catch (error) {
    return res.status(400).send(error);
  }
};

const ColenderStatusUpdateMail = async (user, req, res) => {
  try {
    const { status } = req.body;
    let emailSendCondition =
      (user == 'maker' && status == 'Hold') ||
      ((user == 'checker1' || user == 'checker2') &&
        (status == 'Approved' || status == 'Rejected' || status == 'Hold'))
        ? true
        : false;
    if (emailSendCondition) {
      const htmlcontent = mails.genericMails('cbiLoanStatusUpdate', req.body);
      const mailResp = await service.sendMail(
       process.env.SEND_TO_OPS,
        `CBI Case Status - ${req.body.loan_id}`,
        htmlcontent,
      );
      if (!mailResp.messageId) {
        throw {
          success: false,
          message: 'Error while sending mail',
        };
      }
      return { success: true, mailResp };
    }
    return { success: true };
  } catch (error) {
    console.log('send mail error=====', error);
    return error;
  }
};

module.exports = {
  validatePayload,
  validateUserRoleColenderStatusUpdate,
  CBILoanExist,
  ColenderStatusUpdateMail,
  validateLoanStatus,
  checkMakerCheckerRole
};

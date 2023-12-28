const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
//const auth = require('../services/auth/auth.js');
const User = require('../models/user-schema.js');
const Company = require('../models/company-schema');
const AccessLog = require('../util/accessLog');
const mails = require('../services/mail/genericMails.js');
const service = require('../services/mail/mail.js');
const bcrypt = require('bcryptjs');
const helper = require('../util/helper.js');
const moment = require('moment');

module.exports = (app, connection) => {
  app.use(bodyParser.json());

  app.get('/api/user', async (req, res) => {
    try {
      const userRes = await User.getAll();
      res.send(userRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.get('/api/user/:id', async (req, res) => {
    try {
      const userRes = await User.findById(req.params.id);
      return res.send(userRes);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post('/api/usersearch', async (req, res) => {
    try {
      const userData = await User.getBySearcString(req.body.searchstring);
      return res.send(userData);
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.post(
    '/api/user',
    [
      check('username').notEmpty().withMessage('Please enter username'),
      check('email').notEmpty().withMessage('Please enter email id'),
      check('userroles')
        .isArray()
        .notEmpty()
        .withMessage('Atleast one role is required'),
      check('userpass').notEmpty().withMessage('Please send user password'),
      check('userpassToEmail')
        .notEmpty()
        .withMessage('Please send userpassToEmail'),
      check('type').notEmpty().withMessage('Please select user type'),
    ],
    async (req, res) => {
      try {
        const userData = req.body;
        if (!helper.validateDataSync('fullname', userData.username))
          throw {
            success: false,
            message: 'Please enter valid name',
          };
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const subject = 'ELAAP Dashboard user created.';
        const htmlcontent = await mails.genericMails('createuser', userData);
        const user = await User.checkUserByEmailUsername(userData);
        if (userData.company_id) {
          const company = await Company.getById(userData.company_id);
          if (!company)
            throw {
              message: 'Company not found',
            };
          if (!company.status)
            throw {
              message: 'Company is not active. Kindly contact administrator.',
            };
          if (user)
            throw {
              message:
                'User already exists with this email / username under same company',
            };
          userData.company_name = company.name;
        } else {
          if (user && user.company_id == 0)
            throw {
              message: 'User already exists with this email',
            };
          userData.usercompany = 0;
        }
        const isExistByEmail = await User.selectOne(userData.email);
        if (isExistByEmail)
          throw {
            success: false,
            message: 'Email id is already in use.',
          };
        const userRes = await User.addOne(userData);
        if (!userRes)
          throw {
            message: 'Error while adding user data to database',
          };
        if (userRes) {
          const mailResp = await service.sendMail(
            userData.email,
            subject,
            htmlcontent,
          );
          if (!mailResp.messageId) {
            throw {
              success: false,
              message: 'Error while sending mail',
            };
          }

          return res.send({
            message: 'User created successfully.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //reset user password
  app.post(
    '/api/resetpassword',
    [
      check('id').notEmpty().withMessage('Please send user id'),
      check('confirmPassword')
        .notEmpty()
        .withMessage('Please provide strong and valid password')
        .isStrongPassword()
        .withMessage('Please provide strong and valid password'),
      AccessLog.maintainAccessLog,
    ],
    async (req, res) => {
      try {
        const data = req.body;
        //Validate the input data
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });

        //Check user exist by id.
        const respUser = await User.findById(data.id);
        if (!respUser)
          throw {
            message: 'Error while finding user',
          };
        if (data.type === 'user') {
          const flag = await helper.comparePassword(
            data.currentPassword,
            respUser.userpass,
          );
          if (!flag)
            throw {
              success: false,
              message: 'Current password is incorrect',
            };
        }
        if (data.confirmPassword === data.currentPassword) {
          throw {
            success: false,
            message: 'Current password and new password can not be same',
          };
        }
        //Create hashed password
        const saltRounds = 10;
        data.encryptedPassword = await bcrypt.hash(
          data.confirmPassword,
          saltRounds,
        );
        //Prepare email content
        data.email = respUser.email;
        data.username = respUser.username;
        data.password = data.confirmPassword;
        const subject = 'Dashboard password updated.';
        const htmlcontent = mails.genericMails('passwordreset', data);
        data.password_updated_at = moment();
        //Handle company type user password change
        if (
          respUser.type == 'company' &&
          respUser.usercompany != null &&
          respUser.usercompanyname != null
        ) {
          const respCompany = await Company.getStatusById(respUser.usercompany);
          if (!respCompany)
            throw {
              message: 'Something went wrong while getting company status',
            };
          if (respCompany.status === 0)
            throw {
              message: 'Company status of user is not Active',
            };
          const updateUser = await User.updateOne(data.id, data);
          if (!updateUser)
            throw {
              message: 'Error while updating user',
            };
          if (updateUser[0] == 0)
            throw {
              message: 'Entered password is same in the database',
            };
          //Send mail for password reset
          const mailres = await service.sendMail(
            reqData.email,
            subject,
            htmlcontent,
          );
          if (!mailres) throw { message: 'Error while sending mail' };
          res.send({
            message:
              'Password has been changed successfully, please login with new password.',
          });
        } else {
          //Handle password reset for admin user.
          const updateUser = await User.updateOne(data.id, data);
          if (!updateUser)
            throw {
              message: 'Error while updating user',
            };
          if (updateUser[0] == 0)
            throw {
              message: 'Entered password is same in the database',
            };
          const mailres = await service.sendMail(
            data.email,
            subject,
            htmlcontent,
          );
          if (!mailres) throw { message: 'Error while sending mail' };
          res.send({
            message:
              'Password has been changed successfully, please login with new password.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  app.put(
    '/api/user/:id',
    [
      check('username').notEmpty().withMessage('Please enter username'),
      check('email').notEmpty().withMessage('Please enter email id'),
      check('type').notEmpty().withMessage('Please select user type'),
      check('userroles').notEmpty().withMessage('Atleast one role is required'),
    ],
    async (req, res) => {
      const userId = req.params.id;
      const userData = req.body;
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };

        if (!helper.validateDataSync('fullname', userData.username))
          throw {
            success: false,
            message: 'Please enter valid name',
          };
        if (!helper.validateDataSync('email', userData.email))
          throw {
            success: false,
            message: 'Please enter valid email',
          };
        const isExistByEmail = await User.selectOne(userData.email);
        if (isExistByEmail && userId != isExistByEmail?._id)
          throw {
            success: false,
            message: 'Email id is already in use.',
          };
        const userUpdated = await User.updateUserById(userId, userData);
        res.send({
          message: 'User updated successfully.',
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  //change the user status (Active or Inactive)
  app.put('/api/user', async (req, res) => {
    const userData = req.body;
    try {
      const userUpdated = await User.updateStatus(userData);
      if (!userUpdated)
        throw {
          message: 'Error while updating user status',
        };
      res.send({
        message: 'User updated successfully.',
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });

  app.put(
    '/api/updateUser',
    [AccessLog.maintainAccessLog],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          return res.status(422).json({
            message: errors.errors[0]['msg'],
          });
        const userData = req.body;
        const userId = req.body.user_id;
        if (userData.usercompany) {
          const company = await Company.findById(userData.usercompany);
          if (!company)
            throw {
              message: 'Error while fetching company data',
            };
          if (company.status !== 1)
            throw {
              message: 'Company is not active, contact system administrator',
            };
          const obj = {
            username: userData.username,
            designation: userData.designation,
            department: userData.department.join(),
            userroles: userData.userroles.join(),
            usercompany: company._id,
            usercompanyname: company.code,
            type: userData.type,
            updatedby: userData.updatedby,
            updatedon: Date.now(),
          };
          const updateCompanyUser = await User.updateUserById(userId, obj);
          if (!updateCompanyUser)
            throw {
              message: 'Error while updating company user',
            };
          return res.send({
            message: 'User data updated successfully.',
          });
        } else {
          if (
            userData.type === 'admin' &&
            userData.department === 'credit' &&
            !userData.approval_amount_threshold
          ) {
            throw {
              message: 'approval_amount_threshold is required',
            };
          }
          const obj = {
            username: userData.username,
            designation: userData.designation,
            department: userData.department.join(),
            userroles: userData.userroles.join(),
            type: userData.type,
            approval_amount_threshold: userData.approval_amount_threshold
              ? userData.approval_amount_threshold
              : '',
            updatedby: userData.updatedby,
            updatedon: Date.now(),
          };
          const updateUser = await User.updateUserById(userId, obj);
          if (!updateUser)
            throw {
              message: 'Error while updating user',
            };
          return res.send({
            message: 'User data updated succefully.',
          });
        }
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );

  /*app.get('/api/roleMetrix', function (req, res) {
		const details = {};
		Designations.getAll((err, designations) => {
			if (err) {
				return res.status(400).json({ message: 'Something went wrong' });
			} if (designations) {
				details.designations = designations;
				Departments.getAll((errd, departments) => {
					if (errd) {
						return res.status(400).json({ message: 'Something went wrong' });
					} if (departments) {
						details.departments = departments;
						Roles.getAll((errr, roles) => {
							if (errr) {
								return res.status(400).json({ message: 'Something went wrong' });
							} if (roles) {
								details.roles = roles;
								res.send(details);
							}
						})
					}
				})
			}
		})
	})

		//role update  api
	app.put('/api/roles-update', [AccessLog.maintainAccessLog], function (req, res) {
		const roleData = req.body;
		Roles.updateOne(roleData, roleData.id, (err, role) => {
			if (err) {
				return res.status(400).json({ message: err });
			} if (role) {
				res.send({ message: 'Role updated here.', role })
			}
		})
	})
	*/
};

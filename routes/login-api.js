const { check, validationResult } = require('express-validator');
const User = require('../models/user-schema.js');
const helper = require('../util/helper.js');
const RoleSchema = require('../models/roles-schema.js');
const moment = require('moment');
const bCrypt = require('bcryptjs');

module.exports = function (app, passport) {
  app.post(
    '/api/loginuser',
    [check('email').notEmpty().isEmail().withMessage('Please enter email')],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const userResp = await User.selectOne(req.body.email);
        if (!userResp)
          throw {
            message: 'User not found',
          };
        if (!userResp.status)
          throw {
            message: 'User is not active!',
          };

        //check the diff between current date and password_updated_at, if greater than 180 throw error.
        if (userResp.password_updated_at) {
          const passwordUpdatedDiff = moment().diff(
            moment(userResp.password_updated_at),
            'days',
          );
          if (passwordUpdatedDiff > 180)
            return res.status(401).send({
              statusCode: '401',
              success: false,
              message: 'Your password has been expired. Please contact admin.',
            });
        }

        // Check if username and password is correct
        let recordUserLogin = '';
        await bCrypt.compare(
          req.body.userpass,
          userResp.userpass,
          async (err, isMatch) => {
            if (err) {
              return res.status(400).send({
                statusCode: '400',
                success: false,
                message: 'INVALID USERNAME OR PASSWORD!',
              });
            }
            if (isMatch) {
              //Update the user login time in user collection.
              recordUserLogin = await User.updateUserData(userResp._id, {
                last_login_at: Date.now(),
              });
            }
          },
        );

        let accessMetrixTagsArray = [];
        if (userResp.role_metrix?.length) {
          //Create an array of role ids linked to user.
          let roleIdArray = [];
          userResp?.role_metrix?.forEach((metrix) => {
            roleIdArray.push(metrix.id);
          });
          //Fetch access metrix against role id.
          const rolesResp = await RoleSchema.getByMultipleIds(roleIdArray);
          if (!rolesResp.length)
            throw {
              success: false,
              message: 'No roles found against role id.',
            };
          //create an array of access metrix tags aginst associated roles.
          for (let i = 0; i < rolesResp.length; i++) {
            accessMetrixTagsArray = accessMetrixTagsArray.concat(
              rolesResp[i]?.tags,
            );
          }
        }
        const accessMetrixTags = [...new Set(accessMetrixTagsArray)];
        //Pass access metrix tags array in user login response.
        user = JSON.parse(JSON.stringify(userResp));
        user.access_metrix_tags = accessMetrixTags;
        user.last_login_at = recordUserLogin.last_login_at;
        res.send({
          message: 'User logged in succefully.',
          user,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
  app.post(
    '/api/getloginuser',
    [
      check('username')
        .notEmpty()
        .isEmail()
        .withMessage('Please enter valid user name'),
      check('password').notEmpty().withMessage('Please enter valid password'),
    ],

    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
          throw {
            message: errors.errors[0]['msg'],
          };
        const userResp = await User.selectOne(req.body.username);
        if (!userResp)
          throw {
            message: 'User does not exist in the system',
          };
        if (!userResp.status)
          throw {
            message: 'User is not active!',
          };

        // Check if username and password is correct
        let compare = await helper.comparePassword(
          req.body.password,
          userResp.userpass,
        );
        if (!compare)
          throw {
            success: false,
            message: 'Password is incorrect',
          };
        await bCrypt.compare(
          req.body.password,
          userResp.userpass,
          async (err) => {
            if (err) {
              return res.status(400).send({
                statusCode: '400',
                success: false,
                message: 'INVALID USERNAME OR PASSWORD!',
              });
            }
          },
        );

        let accessMetrixTagsArray = [];
        let rolesIdArray = [];
        if (userResp.role_metrix?.length) {
          //Create an array of role ids linked to user.

          userResp?.role_metrix?.forEach((metrix) => {
            rolesIdArray.push(metrix.id);
          });
          //Fetch access metrix against role id.
          const rolesResp = await RoleSchema.getByMultipleIds(rolesIdArray);
          if (!rolesResp.length)
            throw {
              success: false,
              message: 'No roles found against role id.',
            };
          //create an array of access metrix tags aginst associated roles.
          for (let i = 0; i < rolesResp.length; i++) {
            accessMetrixTagsArray = accessMetrixTagsArray.concat(
              rolesResp[i]?.tags,
            );
          }
        }
        const accessMetrixTags = [...new Set(accessMetrixTagsArray)];
        //Pass access metrix tags array in user login response.
        user = JSON.parse(JSON.stringify(userResp));
        user.access_metrix_tags = accessMetrixTags;
        //Fetch access metrix against role id.
        const rolesResp = await RoleSchema.getByMultipleIds(rolesIdArray);

        if (!rolesResp.length) {
          throw {
            success: false,
            message: 'No roles found against role id.',
          };
        }

        // Extracting only the required fields (title and tags) from each role object
        const rolesData = rolesResp.map((role) => {
          return {
            Role: role.title,
            tags: role.tags,
          };
        });

        res.send({
          username: userResp.username,
          Roles: rolesData,
        });
      } catch (error) {
        return res.status(400).send(error);
      }
    },
  );
};

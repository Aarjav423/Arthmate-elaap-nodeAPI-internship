'use strict';
var compose = require('composable-middleware');
const ApiAccess = require('../../models/apiaccess-schema.js');

const hasRole = (...allowedRole) => {
  return compose().use((req, res, next) => {
    var allowed = false;
    if (req.user) {
      allowedRole.forEach((element, index) => {
        if (req.user.roles.indexOf(element) > -1) {
          allowed = true;
        }
      });
      if (allowed) {
        next();
      } else {
        return res.status(403).send({
          message: 'Not Authorised to perform this operation',
        });
      }
    } else {
      return res.status(403).json({
        message: 'Forbidden',
      });
    }
  });
};

const checkHeaders = () => {
  return compose().use((req, res, next) => {
    const authkey = req.headers.authkey;
    const partnerid = req.headers.partnerid;
    if (partnerid && authkey) {
      ApiAccess.findIfExists(partnerid, authkey, (err, response) => {
        if (err)
          return res.status(403).send(
            err || {
              message: 'Not Authorised (Invalid Headers)',
            },
          );
        if (response) {
          next();
        }
      });
    } else {
      return res.status(403).json({
        message: 'Provide required headers',
      });
    }
  });
};

module.exports = {
  ensureAuthenticated: hasRole,
  checkHeaders: checkHeaders,
};

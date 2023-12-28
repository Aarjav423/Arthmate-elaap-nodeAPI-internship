'use strict';

/**
 * Dependencies
 */

/**
 * Helper to configure storage
 */
const multer = require('multer');
const crypto = require('crypto');
let fileExtension = require('file-extension');
const bCrypt = require('bcryptjs');
const generator = require('generate-password');
const axios = require('axios');
const xlsxtojson = require('xlsx-to-json');
const xlstojson = require('xls-to-json');
const fs = require('fs');
const path = require('path');
var jwt = require('jsonwebtoken');

const storage = multer.diskStorage({
  //multers disk storage settings
  destination: (req, file, cb) => {
    cb(null, './input/');
  },
  filename: (req, file, cb) => {
    crypto.pseudoRandomBytes(16, (err, raw) => {
      cb(
        null,
        raw.toString('hex') + Date.now() + '.' + fileExtension(file.mimetype),
      );
    });
  },
});

/**
 * Helper to upload xls to path
 */

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ==
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .xlsx format is allowed!'));
    }
  },
}).single('file');

/**
 * Helper to check empty object
 */
const checkNotEmpty = (item) => {
  if (!item) return false;
  const objKeys = Object.keys(item);
  const filtered = objKeys.filter((key) => {
    return item[key] == '';
  });
  return objKeys.length != filtered.length;
};

/**
 * Helper to generate password hash
 */
const createHash = (password) => {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

/**
 * Helper to Compare password for authentication
 */
const comparePassword = (userPassword, hash, callback) => {
  bCrypt.compare(userPassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
};

//helper to check the format of default templates
const validateTemplateFormat = (templates, callback) => {
  const errorTemplates = {};
  Object.keys(templates).forEach((template, index) => {
    errorTemplates[template] = templates[template].filter((item) => {
      return (
        !item.isCommon ||
        !item.field ||
        !item.title ||
        !item.type ||
        !item.validationmsg ||
        !item.isOptional ||
        !item.checked
      );
    });
  });
  callback(null, errorTemplates);
};

//get partner details if user is admin
const checkPartnerHeaders = (user, partnerId, callback) => {
  if (
    JSON.stringify(user.type) === JSON.stringify('admin') &&
    JSON.stringify(partnerId) === JSON.stringify('null')
  ) {
    callback(
      {
        message: 'Please select partner',
      },
      null,
    );
  } else {
    if (JSON.stringify(user.type) === JSON.stringify('admin')) {
      axios
        .post(
          process.env.URL,
          JSON.stringify({
            partnerid: partnerId,
          }),
          {
            headers: {
              Query: 'AccessLog',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        .then((response) => {
          const partnerDetails = response.data;
          callback(null, partnerDetails);
        })
        .catch((error) => {
          callback(
            {
              message:
                error.response.data.message ||
                'Error while getting partner details',
            },
            null,
          );
        });
    } else {
      callback(null, user);
    }
  }
};

//get partner details if user is admin
const uploadJsonBulkdata = (bulkData, token, url, callback) => {
  axios
    .post(
      url,
      JSON.stringify({
        data: bulkData,
      }),
      {
        headers: {
          Authorization: token,
        },
      },
    )
    .then((response) => {
      callback(null, response.data);
    })
    .catch((error) => {
      callback(
        {
          message: error.response.data.message || 'Something went wrong',
        },
        null,
      );
    });
};

const parseFileTojson = (req, res, callback) => {
  let excel2json;
  /** Helper to upload xlsx to path */
  upload(req, res, (err) => {
    if (err)
      return res.status(401).send({
        message: err.message,
      });
    /** Multer gives us file info in req.file object */
    if (!req.file)
      return res.status(404).send({
        message: 'Please provide file',
      });
    /** SET nodejs package as per the file received...*/
    var fileName =
      req.file.originalname.split('.')[
        req.file.originalname.split('.').length - 1
      ];
    excel2json = fileName === 'xlsx' ? xlsxtojson : xlstojson;
    const jsonFilePath = 'output/' + Date.now() + '.json';
    excel2json(
      {
        input: req.file.path, // input xlsx
        output: jsonFilePath, // output json
        lowerCaseHeaders: true,
      },
      (err, result) => {
        if (err) {
          return res.status(404).send({
            err,
          });
        } else {
          fs.unlink(path.join(req.file.path), (err) => {
            if (err) throw err;
          });
          fs.unlink(path.join(jsonFilePath), (err) => {
            if (err) throw err;
          });

          const finalData = result.filter((item) => {
            /** Helper to delete empty objects */
            return checkNotEmpty(item);
          });

          if (finalData.length < 1)
            return res.status(404).send({
              message: 'File is empty',
            });
          callback(null, finalData);
        }
      },
    );
  });
};

const xlsxFileUploader = (req, res, url) => {
  /** Helper to get partners details if user is admin else returns default partner details */
  checkPartnerHeaders(req.user, req.params._id, (err) => {
    if (err) return res.status(404).send(err);
  });
  let excel2json;
  /** Helper to upload xlsx to path */
  upload(req, res, (err) => {
    if (err) {
      return res.status(401).send({
        message: err.message,
      });
    }
    /** Multer gives us file info in req.file object */
    if (!req.file) {
      return res.status(404).send({
        message: 'Please provide file',
      });
    }
    /** SET nodejs package as per the file received...*/
    var fileName =
      req.file.originalname.split('.')[
        req.file.originalname.split('.').length - 1
      ];
    excel2json = fileName === 'xlsx' ? xlsxtojson : xlstojson;
    const jsonFilePath = 'output/' + Date.now() + '.json';
    excel2json(
      {
        input: req.file.path, // input xlsx
        output: jsonFilePath, // output json
        lowerCaseHeaders: true,
      },
      (err, result) => {
        if (err) {
          return res.status(404).send({
            err,
          });
        } else {
          fs.unlink(path.join(req.file.path), (err) => {
            if (err) throw err;
          });
          fs.unlink(path.join(jsonFilePath), (err) => {
            if (err) throw err;
          });

          const finalData = result.filter((item) => {
            /** Helper to delete empty objects */
            return checkNotEmpty(item);
          });

          if (finalData.length < 1)
            return res.status(404).send({
              message: 'File is empty',
            });
          /** Helper to upload Json Bulk Data */
          uploadJsonBulkdata(
            finalData,
            req.headers.Authorization,
            url,
            (err, response) => {
              if (err) return res.status(404).send(err);
              res.json(response);
            },
          );
        }
      },
    );
  });
};

const generateRandomPassword = () => {
  return generator.generate({
    length: 8,
    uppercase: true,
    numbers: true,
    excludeSimilarCharacters: true,
    strict: true,
    symbols: true,
    exclude: '~$%^()_/+"*-={}<>[];\':,.',
  });
};

const generateToken = (obj, expiresIn) => {
  return jwt.sign(obj, process.env.SECRET_KEY, {
    expiresIn,
  });
};

module.exports = {
  checkNotEmpty,
  upload,
  createHash,
  comparePassword,
  generateRandomPassword,
  checkPartnerHeaders,
  uploadJsonBulkdata,
  xlsxFileUploader,
  generateToken,
  parseFileTojson,
};
